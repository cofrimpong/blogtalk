"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { onAuthStateChanged, type User } from "firebase/auth";
import { OWNER_EMAIL, isOwnerEmail } from "@/lib/audience";
import { getFirebaseAuth, hasFirebaseConfig } from "@/lib/firebaseClient";
import {
  buildMarkdownFromDraft,
  formatTranscriptWithLlm,
  publishMarkdownToGitHub,
  slugify,
  type BlogDraft,
  type LlmProvider,
} from "@/lib/consultantPoc";

type RuntimeSettings = {
  provider: LlmProvider;
  openAiApiKey: string;
  anthropicApiKey: string;
  openAiModel: string;
  anthropicModel: string;
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  postsPath: string;
};

type PublishResult = {
  slug: string;
  path: string;
  commitUrl?: string;
  contentUrl?: string;
};

type WhisperTranscriber = (
  audio: string | URL | Float32Array | Float64Array,
  options?: Record<string, unknown>,
) => Promise<{ text?: string } | string>;

const SETTINGS_STORAGE_KEY = "consultant-poc-settings-v1";
const allowedPublisherEmails = (process.env.NEXT_PUBLIC_ALLOWED_PUBLISHER_EMAILS ?? "")
  .split(",")
  .map((item) => item.trim().toLowerCase())
  .filter(Boolean);

const defaultSettings: RuntimeSettings = {
  provider: "openai",
  openAiApiKey: "",
  anthropicApiKey: "",
  openAiModel: process.env.NEXT_PUBLIC_OPENAI_MODEL ?? "gpt-4o-mini",
  anthropicModel: process.env.NEXT_PUBLIC_ANTHROPIC_MODEL ?? "claude-3-5-sonnet-latest",
  githubToken: "",
  githubOwner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? "",
  githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? "blogtalk",
  githubBranch: process.env.NEXT_PUBLIC_GITHUB_BRANCH ?? "main",
  postsPath: process.env.NEXT_PUBLIC_POSTS_PATH ?? "content/posts",
};

let transcriberPromise: Promise<WhisperTranscriber> | null = null;

async function getWhisperTranscriber(): Promise<WhisperTranscriber> {
  if (!transcriberPromise) {
    transcriberPromise = (async () => {
      const transformersModule = await import("@xenova/transformers");
      const transformers = transformersModule as unknown as {
        env: {
          allowRemoteModels: boolean;
          allowLocalModels: boolean;
          useBrowserCache: boolean;
        };
        pipeline: (
          task: string,
          model: string,
        ) => Promise<(audio: string | URL | Float32Array | Float64Array, options?: Record<string, unknown>) => Promise<{ text?: string } | string>>;
      };

      transformers.env.allowRemoteModels = true;
      transformers.env.allowLocalModels = false;
      transformers.env.useBrowserCache = true;

      return transformers.pipeline("automatic-speech-recognition", "Xenova/whisper-tiny.en");
    })();
  }

  return transcriberPromise;
}

async function decodeAudioToMonoFloat32(blob: Blob): Promise<Float32Array> {
  const arrayBuffer = await blob.arrayBuffer();
  const audioContext = new AudioContext();

  try {
    const decoded = await audioContext.decodeAudioData(arrayBuffer);
    const mono = new Float32Array(decoded.length);

    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const channelData = decoded.getChannelData(channel);

      for (let sample = 0; sample < decoded.length; sample += 1) {
        mono[sample] += channelData[sample] / decoded.numberOfChannels;
      }
    }

    return mono;
  } finally {
    void audioContext.close();
  }
}

function extractTranscriptionText(result: { text?: string } | string): string {
  const text = typeof result === "string" ? result : result.text ?? "";
  return text.trim();
}

async function readApiError(response: Response): Promise<string> {
  try {
    const payload = (await response.json()) as {
      error?: { message?: string };
      message?: string;
    };

    if (typeof payload.error?.message === "string") {
      return payload.error.message;
    }

    if (typeof payload.message === "string") {
      return payload.message;
    }
  } catch {
    return `Request failed (${response.status}).`;
  }

  return `Request failed (${response.status}).`;
}

async function transcribeWithLocalWhisper(blob: Blob): Promise<string> {
  const transcriber = await getWhisperTranscriber();
  let firstError: string | null = null;

  const blobUrl = URL.createObjectURL(blob);
  try {
    const result = await transcriber(blobUrl, {
      chunk_length_s: 25,
      stride_length_s: 5,
      return_timestamps: false,
    });

    const text = extractTranscriptionText(result);
    if (text) {
      return text;
    }

    firstError = "Whisper returned empty text from blob input.";
  } catch (error) {
    firstError = error instanceof Error ? error.message : "Local transcription failed.";
  } finally {
    URL.revokeObjectURL(blobUrl);
  }

  try {
    const audioData = await decodeAudioToMonoFloat32(blob);
    const result = await transcriber(audioData, {
      chunk_length_s: 25,
      stride_length_s: 5,
      return_timestamps: false,
    });

    const text = extractTranscriptionText(result);
    if (text) {
      return text;
    }

    throw new Error("Whisper returned empty text from waveform input.");
  } catch (error) {
    const secondError = error instanceof Error ? error.message : "Local transcription failed.";
    throw new Error(firstError ? `${firstError} ${secondError}` : secondError);
  }
}

async function transcribeWithOpenAiFallback(blob: Blob, apiKey: string): Promise<string> {
  const extension = blob.type.includes("wav") ? "wav" : blob.type.includes("mp4") ? "mp4" : "webm";
  const file = new File([blob], `recording.${extension}`, {
    type: blob.type || "audio/webm",
  });

  const formData = new FormData();
  formData.append("file", file);
  formData.append("model", "whisper-1");

  const response = await fetch("https://api.openai.com/v1/audio/transcriptions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    throw new Error(await readApiError(response));
  }

  const payload = (await response.json()) as { text?: string };
  const text = payload.text?.trim() ?? "";

  if (!text) {
    throw new Error("OpenAI transcription returned empty text.");
  }

  return text;
}

function todayIsoDate(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function timestampSuffix(): string {
  const now = new Date();
  const year = String(now.getFullYear());
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  const hour = String(now.getHours()).padStart(2, "0");
  const minute = String(now.getMinutes()).padStart(2, "0");
  const second = String(now.getSeconds()).padStart(2, "0");
  return `${year}${month}${day}${hour}${minute}${second}`;
}

function normalizePath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

function inferGitHubPagesTarget(): {
  owner?: string;
  repo?: string;
} {
  if (typeof window === "undefined") {
    return {};
  }

  const host = window.location.hostname.trim().toLowerCase();
  const githubIoSuffix = ".github.io";

  if (!host.endsWith(githubIoSuffix)) {
    return {};
  }

  const owner = host.slice(0, -githubIoSuffix.length).trim();
  const pathParts = window.location.pathname
    .split("/")
    .map((part) => part.trim())
    .filter(Boolean);
  const repo = pathParts[0]?.trim();

  return {
    owner: owner || undefined,
    repo: repo || undefined,
  };
}

function normalizeHydratedSettings(base: RuntimeSettings, saved: Partial<RuntimeSettings>): RuntimeSettings {
  const merged: RuntimeSettings = { ...base, ...saved };
  const normalizedPostsPath = normalizePath(merged.postsPath || base.postsPath);

  return {
    ...merged,
    provider: merged.provider === "claude" ? "claude" : "openai",
    openAiModel: merged.openAiModel.trim() || base.openAiModel,
    anthropicModel: merged.anthropicModel.trim() || base.anthropicModel,
    githubOwner: merged.githubOwner.trim() || base.githubOwner,
    githubRepo: merged.githubRepo.trim() || base.githubRepo,
    githubBranch: merged.githubBranch.trim() || base.githubBranch,
    postsPath: normalizedPostsPath || base.postsPath,
  };
}

export default function ConsultantPage() {
  const auth = useMemo(() => getFirebaseAuth(), []);
  const [authReady, setAuthReady] = useState(false);
  const [user, setUser] = useState<User | null>(null);

  const [settings, setSettings] = useState<RuntimeSettings>(defaultSettings);
  const [settingsHydrated, setSettingsHydrated] = useState(false);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const [transcribeStatus, setTranscribeStatus] = useState<string | null>(null);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");

  const [isFormatting, setIsFormatting] = useState(false);
  const [draft, setDraft] = useState<BlogDraft | null>(null);
  const [draftError, setDraftError] = useState<string | null>(null);

  const [approved, setApproved] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [publishResult, setPublishResult] = useState<PublishResult | null>(null);
  const [publishError, setPublishError] = useState<string | null>(null);

  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    setSettings((previous) => {
      const inferred = inferGitHubPagesTarget();

      const githubOwner = previous.githubOwner.trim() || defaultSettings.githubOwner.trim() || inferred.owner || "";
      const githubRepo = previous.githubRepo.trim() || defaultSettings.githubRepo.trim() || inferred.repo || "";
      const githubBranch = previous.githubBranch.trim() || defaultSettings.githubBranch.trim() || "main";
      const postsPath = normalizePath(previous.postsPath || defaultSettings.postsPath || "content/posts");

      if (
        githubOwner === previous.githubOwner &&
        githubRepo === previous.githubRepo &&
        githubBranch === previous.githubBranch &&
        postsPath === previous.postsPath
      ) {
        return previous;
      }

      return {
        ...previous,
        githubOwner,
        githubRepo,
        githubBranch,
        postsPath,
      };
    });
  }, []);

  useEffect(() => {
    if (!auth) {
      setAuthReady(true);
      return;
    }

    return onAuthStateChanged(auth, (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
    });
  }, [auth]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);
      if (raw) {
        const saved = JSON.parse(raw) as Partial<RuntimeSettings>;
        setSettings((previous) => normalizeHydratedSettings(previous, saved));
      }
    } catch {
      localStorage.removeItem(SETTINGS_STORAGE_KEY);
    } finally {
      setSettingsHydrated(true);
    }
  }, []);

  useEffect(() => {
    if (!settingsHydrated) {
      return;
    }

    localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
  }, [settings, settingsHydrated]);

  useEffect(() => {
    return () => {
      recorderRef.current?.stop();
      streamRef.current?.getTracks().forEach((track) => track.stop());
      if (audioUrl) {
        URL.revokeObjectURL(audioUrl);
      }
    };
  }, [audioUrl]);

  const normalizedUserEmail = (user?.email ?? "").trim().toLowerCase();
  const isOwnerUser = isOwnerEmail(normalizedUserEmail);
  const isSignedInObserver = Boolean(user) && !isOwnerUser;

  const canUsePublishingFlow =
    !hasFirebaseConfig ||
    (Boolean(user) &&
      isOwnerUser &&
      (allowedPublisherEmails.length === 0 || allowedPublisherEmails.includes(normalizedUserEmail)));

  const activeApiKey =
    settings.provider === "openai" ? settings.openAiApiKey.trim() : settings.anthropicApiKey.trim();
  const activeModel =
    settings.provider === "openai" ? settings.openAiModel.trim() : settings.anthropicModel.trim();

  const updateSetting = <K extends keyof RuntimeSettings>(key: K, value: RuntimeSettings[K]) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const resetSensitiveKeys = () => {
    setSettings((current) => ({
      ...current,
      openAiApiKey: "",
      anthropicApiKey: "",
      githubToken: "",
    }));
  };

  const startRecording = async () => {
    setTranscribeStatus(null);
    setDraftError(null);
    setPublishError(null);

    if (!navigator.mediaDevices?.getUserMedia) {
      setTranscribeStatus("Recording is not supported in this browser.");
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      chunksRef.current = [];

      const preferredMimeType =
        typeof MediaRecorder !== "undefined" &&
        MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
          ? "audio/webm;codecs=opus"
          : undefined;

      const recorder = preferredMimeType
        ? new MediaRecorder(stream, { mimeType: preferredMimeType })
        : new MediaRecorder(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: preferredMimeType ?? "audio/webm" });
        if (audioUrl) {
          URL.revokeObjectURL(audioUrl);
        }

        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
        setIsRecording(false);
        streamRef.current?.getTracks().forEach((track) => track.stop());
      };

      recorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to access microphone.";
      setTranscribeStatus(message);
      setIsRecording(false);
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const transcribeAudio = async () => {
    if (!audioBlob) {
      setTranscribeStatus("Record audio first.");
      return;
    }

    setIsTranscribing(true);
    setTranscribeStatus("Loading local Whisper model…");

    try {
      let cleaned = "";

      try {
        setTranscribeStatus("Transcribing locally…");
        cleaned = await transcribeWithLocalWhisper(audioBlob);
      } catch (localError) {
        const localMessage = localError instanceof Error ? localError.message : "Local transcription failed.";
        const fallbackApiKey = settings.openAiApiKey.trim();

        if (!fallbackApiKey) {
          throw new Error(`${localMessage} Add an OpenAI API key in Runtime API settings to use fallback transcription.`);
        }

        setTranscribeStatus("Local Whisper failed. Trying OpenAI transcription fallback…");
        cleaned = await transcribeWithOpenAiFallback(audioBlob, fallbackApiKey);
      }

      if (!cleaned) {
        setTranscribeStatus("Transcription completed, but no text was detected.");
        return;
      }

      setTranscript(cleaned);
      setTranscribeStatus("Transcription complete.");
    } catch (error) {
      const message = error instanceof Error ? error.message : "Local transcription failed.";
      setTranscribeStatus(message);
    } finally {
      setIsTranscribing(false);
    }
  };

  const generateDraft = async () => {
    if (!transcript.trim()) {
      setDraftError("Transcript is required.");
      return;
    }

    if (!activeApiKey) {
      setDraftError("Add an API key for the selected provider.");
      return;
    }

    if (!activeModel) {
      setDraftError("Model name is required.");
      return;
    }

    setIsFormatting(true);
    setDraftError(null);
    setPublishResult(null);

    try {
      const generated = await formatTranscriptWithLlm({
        provider: settings.provider,
        apiKey: activeApiKey,
        model: activeModel,
        transcript,
      });

      setDraft({
        ...generated,
        date: generated.date || todayIsoDate(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to generate draft.";
      setDraftError(message);
    } finally {
      setIsFormatting(false);
    }
  };

  const updateDraftField = <K extends keyof BlogDraft>(key: K, value: BlogDraft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current));
  };

  const publishDraft = async () => {
    if (!draft) {
      setPublishError("Generate a draft first.");
      return;
    }

    if (!approved) {
      setPublishError("Approve the draft before publishing.");
      return;
    }

    if (!settings.githubToken.trim()) {
      setPublishError("GitHub token is required.");
      return;
    }

    const inferredTarget = inferGitHubPagesTarget();
    const githubOwner = settings.githubOwner.trim() || defaultSettings.githubOwner.trim() || inferredTarget.owner || "";
    const githubRepo = settings.githubRepo.trim() || defaultSettings.githubRepo.trim() || inferredTarget.repo || "";
    const githubBranch = settings.githubBranch.trim() || defaultSettings.githubBranch.trim() || "main";

    if (!githubOwner || !githubRepo) {
      setPublishError("GitHub owner and repo are required.");
      return;
    }

    setIsPublishing(true);
    setPublishError(null);

    try {
      const baseSlug = slugify(draft.slug || draft.title || "voice-draft") || "voice-draft";
      const uniqueSlug = `${baseSlug}-${timestampSuffix()}`;
      const postsPath = normalizePath(settings.postsPath || defaultSettings.postsPath || "content/posts");
      const filePath = `${postsPath}/${uniqueSlug}.md`;
      const markdown = buildMarkdownFromDraft({
        ...draft,
        slug: uniqueSlug,
        date: draft.date || todayIsoDate(),
      });

      const publishResponse = await publishMarkdownToGitHub({
        token: settings.githubToken,
        owner: githubOwner,
        repo: githubRepo,
        branch: githubBranch,
        filePath,
        markdown,
        commitMessage: `publish: ${uniqueSlug}`,
      });

      setPublishResult({
        slug: uniqueSlug,
        path: publishResponse.path,
        commitUrl: publishResponse.commitUrl,
        contentUrl: publishResponse.contentUrl,
      });
      setApproved(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Publishing failed.";
      setPublishError(message);
    } finally {
      setIsPublishing(false);
    }
  };

  if (hasFirebaseConfig && authReady && isSignedInObserver) {
    return (
      <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10 md:py-14">
        <section className="rounded-2xl border border-sky-300/70 bg-sky-100/70 p-6 dark:border-sky-800 dark:bg-sky-900/30">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-sky-800 dark:text-sky-200">Observer mode</p>
          <h1 className="editorial-serif mt-3 text-3xl font-semibold tracking-tight">Consultant tools are owner-only</h1>
          <p className="mt-3 text-sm opacity-90">
            This account is in observer mode. Only {OWNER_EMAIL} can access record, transcribe, publish, or delete
            workflows.
          </p>
          <p className="mt-4 text-sm">
            <Link href="/" className="font-semibold text-sky-800 underline dark:text-sky-200">
              Return to the feed
            </Link>
            {" "}
            to like, comment, and reshare posts.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 md:py-14">
      <section className="rounded-2xl border border-zinc-200/70 bg-white/90 p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70 md:p-8">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-fuchsia-700 dark:text-fuchsia-300">
          AI Consultant POC
        </p>
        <h1 className="editorial-serif mt-3 text-3xl font-semibold tracking-tight">
          Record → Transcribe (Local Whisper) → Draft → Approve → Publish
        </h1>
        <p className="mt-3 text-sm opacity-80">
          This page turns a voice note into a markdown post and commits it into your GitHub posts folder to trigger
          publishing.
        </p>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200/70 bg-white/90 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h2 className="text-lg font-semibold tracking-tight">1) Sign in gate</h2>
        {!hasFirebaseConfig ? (
          <p className="mt-2 text-sm opacity-80">
            Firebase config is missing, so auth gating is currently bypassed for local testing.
          </p>
        ) : (
          <>
            <p className="mt-2 text-sm opacity-80">
              {authReady
                ? user
                  ? `Signed in as ${user.email ?? "unknown"}.`
                  : "Not signed in."
                : "Checking sign-in state…"}
            </p>
            {!user ? (
              <p className="mt-3 text-sm">
                <Link href="/signin" className="font-semibold text-fuchsia-700 underline dark:text-fuchsia-300">
                  Sign in with Google or Email
                </Link>
                {" "}
                to unlock publishing.
              </p>
            ) : null}
            {user && allowedPublisherEmails.length > 0 && !canUsePublishingFlow ? (
              <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">
                This account is not in NEXT_PUBLIC_ALLOWED_PUBLISHER_EMAILS.
              </p>
            ) : null}
          </>
        )}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200/70 bg-white/90 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h2 className="text-lg font-semibold tracking-tight">2) Runtime API settings</h2>
        <p className="mt-2 text-sm opacity-80">
          Keys are saved in localStorage on this device for the POC. Use low-privilege tokens.
        </p>

        <div className="mt-4 grid gap-3 md:grid-cols-2">
          <label className="text-sm">
            <span className="mb-1 block opacity-80">LLM provider</span>
            <select
              value={settings.provider}
              onChange={(event) => updateSetting("provider", event.target.value as LlmProvider)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            >
              <option value="openai">OpenAI</option>
              <option value="claude">Claude</option>
            </select>
          </label>

          <label className="text-sm">
            <span className="mb-1 block opacity-80">GitHub branch</span>
            <input
              value={settings.githubBranch}
              onChange={(event) => updateSetting("githubBranch", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block opacity-80">OpenAI API key</span>
            <input
              type="password"
              value={settings.openAiApiKey}
              onChange={(event) => updateSetting("openAiApiKey", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="sk-..."
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block opacity-80">OpenAI model</span>
            <input
              value={settings.openAiModel}
              onChange={(event) => updateSetting("openAiModel", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block opacity-80">Anthropic API key</span>
            <input
              type="password"
              value={settings.anthropicApiKey}
              onChange={(event) => updateSetting("anthropicApiKey", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="sk-ant-..."
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block opacity-80">Anthropic model</span>
            <input
              value={settings.anthropicModel}
              onChange={(event) => updateSetting("anthropicModel", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block opacity-80">GitHub owner</span>
            <input
              value={settings.githubOwner}
              onChange={(event) => updateSetting("githubOwner", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="cofrimpong"
            />
          </label>

          <label className="text-sm">
            <span className="mb-1 block opacity-80">GitHub repo</span>
            <input
              value={settings.githubRepo}
              onChange={(event) => updateSetting("githubRepo", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="blogtalk"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block opacity-80">Posts folder in repo</span>
            <input
              value={settings.postsPath}
              onChange={(event) => updateSetting("postsPath", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              placeholder="content/posts"
            />
          </label>

          <label className="text-sm md:col-span-2">
            <span className="mb-1 block opacity-80">GitHub token (repo contents write)</span>
            <input
              type="password"
              value={settings.githubToken}
              onChange={(event) => updateSetting("githubToken", event.target.value)}
              className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            />
          </label>
        </div>

        <button
          type="button"
          onClick={resetSensitiveKeys}
          className="mt-4 rounded-lg border border-zinc-300/80 px-4 py-2 text-sm font-semibold transition hover:border-fuchsia-400 dark:border-zinc-700"
        >
          Clear saved keys on this device
        </button>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200/70 bg-white/90 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h2 className="text-lg font-semibold tracking-tight">3) Record and transcribe locally</h2>
        <div className="mt-4 flex flex-wrap gap-2">
          <button
            type="button"
            onClick={startRecording}
            disabled={isRecording}
            className="rounded-lg bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-600 disabled:opacity-50"
          >
            Start recording
          </button>
          <button
            type="button"
            onClick={stopRecording}
            disabled={!isRecording}
            className="rounded-lg border border-zinc-300/80 px-4 py-2 text-sm font-semibold transition hover:border-fuchsia-400 disabled:opacity-50 dark:border-zinc-700"
          >
            Stop recording
          </button>
          <button
            type="button"
            onClick={transcribeAudio}
            disabled={!audioBlob || isTranscribing}
            className="rounded-lg border border-zinc-300/80 px-4 py-2 text-sm font-semibold transition hover:border-fuchsia-400 disabled:opacity-50 dark:border-zinc-700"
          >
            {isTranscribing ? "Transcribing…" : "Transcribe locally (Whisper)"}
          </button>
        </div>

        {audioUrl ? <audio controls src={audioUrl} className="mt-4 w-full" /> : null}
        {transcribeStatus ? <p className="mt-3 text-sm opacity-80">{transcribeStatus}</p> : null}

        <label className="mt-4 block text-sm">
          <span className="mb-1 block opacity-80">Transcript (editable)</span>
          <textarea
            value={transcript}
            onChange={(event) => setTranscript(event.target.value)}
            rows={8}
            className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
            placeholder="Transcription will appear here. You can also paste text manually."
          />
        </label>
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200/70 bg-white/90 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h2 className="text-lg font-semibold tracking-tight">4) Convert transcript to blog JSON with one LLM call</h2>
        <button
          type="button"
          onClick={generateDraft}
          disabled={isFormatting || !transcript.trim() || !activeApiKey || !canUsePublishingFlow}
          className="mt-4 rounded-lg border border-zinc-300/80 px-4 py-2 text-sm font-semibold transition hover:border-fuchsia-400 disabled:opacity-50 dark:border-zinc-700"
        >
          {isFormatting ? "Generating draft…" : "Generate structured draft"}
        </button>

        {!canUsePublishingFlow ? (
          <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">
            Publishing flow is locked until authorized sign-in is complete.
          </p>
        ) : null}

        {draftError ? <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{draftError}</p> : null}

        {draft ? (
          <div className="mt-5 grid gap-3">
            <label className="text-sm">
              <span className="mb-1 block opacity-80">Title</span>
              <input
                value={draft.title}
                onChange={(event) => updateDraftField("title", event.target.value)}
                className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block opacity-80">Slug</span>
                <input
                  value={draft.slug}
                  onChange={(event) => updateDraftField("slug", slugify(event.target.value))}
                  className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block opacity-80">Date</span>
                <input
                  value={draft.date}
                  onChange={(event) => updateDraftField("date", event.target.value)}
                  className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="mb-1 block opacity-80">Excerpt</span>
              <textarea
                value={draft.excerpt}
                onChange={(event) => updateDraftField("excerpt", event.target.value)}
                rows={3}
                className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>

            <div className="grid gap-3 md:grid-cols-2">
              <label className="text-sm">
                <span className="mb-1 block opacity-80">Tags (comma separated)</span>
                <input
                  value={draft.tags.join(", ")}
                  onChange={(event) =>
                    updateDraftField(
                      "tags",
                      event.target.value
                        .split(",")
                        .map((item) => item.trim())
                        .filter(Boolean),
                    )
                  }
                  className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
              <label className="text-sm">
                <span className="mb-1 block opacity-80">Read time</span>
                <input
                  value={draft.readTime}
                  onChange={(event) => updateDraftField("readTime", event.target.value)}
                  className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
                />
              </label>
            </div>

            <label className="text-sm">
              <span className="mb-1 block opacity-80">Markdown content</span>
              <textarea
                value={draft.content}
                onChange={(event) => updateDraftField("content", event.target.value)}
                rows={14}
                className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-950"
              />
            </label>
          </div>
        ) : null}
      </section>

      <section className="mt-6 rounded-2xl border border-zinc-200/70 bg-white/90 p-6 dark:border-zinc-800 dark:bg-zinc-900/70">
        <h2 className="text-lg font-semibold tracking-tight">5) Approve and publish to GitHub</h2>
        <p className="mt-2 text-sm opacity-80">
          This commits a markdown file into your posts folder. Your existing GitHub Actions workflow will then deploy the
          updated site.
        </p>

        <label className="mt-4 flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={approved}
            onChange={(event) => setApproved(event.target.checked)}
            className="h-4 w-4"
          />
          I approve sending this draft to the GitHub API.
        </label>

        <button
          type="button"
          onClick={publishDraft}
          disabled={!draft || isPublishing || !canUsePublishingFlow}
          className="mt-4 rounded-lg bg-fuchsia-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-fuchsia-600 disabled:opacity-50"
        >
          {isPublishing ? "Publishing…" : "Publish markdown to GitHub"}
        </button>

        {publishError ? <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{publishError}</p> : null}

        {publishResult ? (
          <div className="mt-4 rounded-lg border border-emerald-300/70 bg-emerald-100/60 p-3 text-sm text-emerald-900 dark:border-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-100">
            <p>Published file: {publishResult.path}</p>
            <p>Generated slug: {publishResult.slug}</p>
            {publishResult.commitUrl ? (
              <p>
                <a href={publishResult.commitUrl} target="_blank" rel="noreferrer" className="underline">
                  View commit on GitHub
                </a>
              </p>
            ) : null}
            <p className="mt-1 opacity-80">After Actions completes, the post appears on your site.</p>
          </div>
        ) : null}
      </section>
    </main>
  );
}
