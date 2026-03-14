export type LlmProvider = "openai" | "claude";

export type BlogDraft = {
  title: string;
  slug: string;
  date: string;
  excerpt: string;
  tags: string[];
  readTime: string;
  content: string;
};

type FormatTranscriptOptions = {
  provider: LlmProvider;
  apiKey: string;
  model: string;
  transcript: string;
};

type GitHubPublishOptions = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  markdown: string;
  commitMessage: string;
};

type GitHubDeleteOptions = {
  token: string;
  owner: string;
  repo: string;
  branch: string;
  filePath: string;
  commitMessage: string;
};

const formatterInstructions = [
  "Convert the transcript into a polished markdown blog post draft.",
  "Return valid JSON only with this exact shape:",
  '{"title":"","slug":"","excerpt":"","tags":[],"readTime":"","content":""}',
  "Rules:",
  "- title: concise and publish-ready.",
  "- slug: lowercase kebab-case.",
  "- excerpt: 1-2 sentences.",
  "- tags: 2-5 specific tags.",
  "- readTime: plain string like '6 min read'.",
  "- content: markdown body only, no front matter, include useful headings.",
  "- add one section that calls out weak points and practical fixes.",
].join("\n");

function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function todayIsoDate(): string {
  return formatLocalIsoDate(new Date());
}

function normalizeDraftDate(value: unknown): string {
  if (value instanceof Date) {
    return formatLocalIsoDate(value);
  }

  if (typeof value !== "string") {
    return todayIsoDate();
  }

  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  return todayIsoDate();
}

export function slugify(input: string): string {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

function parseJsonResponse(text: string): unknown {
  const trimmed = text.trim();

  if (trimmed.startsWith("{")) {
    return JSON.parse(trimmed);
  }

  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) {
    return JSON.parse(fenced[1].trim());
  }

  const firstBrace = trimmed.indexOf("{");
  const lastBrace = trimmed.lastIndexOf("}");
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    return JSON.parse(trimmed.slice(firstBrace, lastBrace + 1));
  }

  throw new Error("Could not parse JSON from model response.");
}

function normalizeTags(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .map((item) => String(item).trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  if (typeof value === "string") {
    return value
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean)
      .slice(0, 8);
  }

  return [];
}

function ensureString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value.trim();
  }

  return fallback;
}

function normalizeDraft(raw: unknown): BlogDraft {
  const data = (raw ?? {}) as Record<string, unknown>;
  const title = ensureString(data.title, "Voice Draft");
  const slug = slugify(ensureString(data.slug, title)) || "voice-draft";
  const excerpt = ensureString(data.excerpt, "Draft generated from voice transcript.");
  const content = ensureString(data.content, "# Draft\n\n");
  const readTime = ensureString(data.readTime, "8 min read");
  const tags = normalizeTags(data.tags);
  const date = normalizeDraftDate(data.date);

  return {
    title,
    slug,
    date,
    excerpt,
    tags: tags.length > 0 ? tags : ["notes"],
    readTime,
    content,
  };
}

async function readError(response: Response): Promise<string> {
  const fallback = `Request failed (${response.status}).`;

  try {
    const payload = await response.json();
    if (typeof payload?.error?.message === "string") {
      return payload.error.message;
    }

    if (typeof payload?.message === "string") {
      return payload.message;
    }

    return fallback;
  } catch {
    return fallback;
  }
}

async function formatWithOpenAi({ apiKey, model, transcript }: Omit<FormatTranscriptOptions, "provider">): Promise<BlogDraft> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content: formatterInstructions,
        },
        {
          role: "user",
          content: `Transcript:\n\n${transcript}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string | null } }>;
  };

  const content = payload.choices?.[0]?.message?.content;
  if (!content) {
    throw new Error("OpenAI returned an empty response.");
  }

  return normalizeDraft(parseJsonResponse(content));
}

async function formatWithClaude({ apiKey, model, transcript }: Omit<FormatTranscriptOptions, "provider">): Promise<BlogDraft> {
  const response = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-dangerous-direct-browser-access": "true",
    },
    body: JSON.stringify({
      model,
      max_tokens: 1800,
      temperature: 0.2,
      system: formatterInstructions,
      messages: [
        {
          role: "user",
          content: `Transcript:\n\n${transcript}`,
        },
      ],
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as {
    content?: Array<{ type?: string; text?: string }>;
  };

  const textResponse = payload.content?.find((item) => item.type === "text")?.text;
  if (!textResponse) {
    throw new Error("Claude returned an empty response.");
  }

  return normalizeDraft(parseJsonResponse(textResponse));
}

export async function formatTranscriptWithLlm(options: FormatTranscriptOptions): Promise<BlogDraft> {
  if (!options.transcript.trim()) {
    throw new Error("Transcript is empty.");
  }

  if (!options.apiKey.trim()) {
    throw new Error("Missing API key for selected provider.");
  }

  if (options.provider === "openai") {
    return formatWithOpenAi({
      apiKey: options.apiKey,
      model: options.model,
      transcript: options.transcript,
    });
  }

  return formatWithClaude({
    apiKey: options.apiKey,
    model: options.model,
    transcript: options.transcript,
  });
}

function yamlQuoted(value: string): string {
  return `"${value.replace(/\\/g, "\\\\").replace(/"/g, '\\"')}"`;
}

function utf8ToBase64(value: string): string {
  const bytes = new TextEncoder().encode(value);
  let binary = "";

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return btoa(binary);
}

export function buildMarkdownFromDraft(draft: BlogDraft): string {
  const tags = draft.tags.length > 0 ? draft.tags : ["notes"];
  const tagLines = tags.map((tag) => `  - ${yamlQuoted(tag)}`).join("\n");
  const normalizedContent = draft.content.trim() || "# Draft\n\n";

  return `---\ntitle: ${yamlQuoted(draft.title)}\ndate: ${yamlQuoted(draft.date || todayIsoDate())}\nexcerpt: ${yamlQuoted(draft.excerpt)}\ntags:\n${tagLines}\nreadTime: ${yamlQuoted(draft.readTime || "8 min read")}\n---\n\n${normalizedContent}\n`;
}

export async function publishMarkdownToGitHub(options: GitHubPublishOptions): Promise<{
  path: string;
  commitUrl?: string;
  contentUrl?: string;
}> {
  const owner = options.owner.trim();
  const repo = options.repo.trim();
  const branch = options.branch.trim() || "main";
  const filePath = options.filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;

  const response = await fetch(endpoint, {
    method: "PUT",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${options.token.trim()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: options.commitMessage,
      content: utf8ToBase64(options.markdown),
      branch,
    }),
  });

  if (!response.ok) {
    throw new Error(await readError(response));
  }

  const payload = (await response.json()) as {
    commit?: { html_url?: string };
    content?: { html_url?: string; path?: string };
  };

  return {
    path: payload.content?.path ?? options.filePath,
    commitUrl: payload.commit?.html_url,
    contentUrl: payload.content?.html_url,
  };
}

export async function deleteMarkdownFromGitHub(options: GitHubDeleteOptions): Promise<{
  path: string;
  commitUrl?: string;
  contentUrl?: string;
}> {
  const owner = options.owner.trim();
  const repo = options.repo.trim();
  const branch = options.branch.trim() || "main";
  const filePath = options.filePath
    .split("/")
    .map((segment) => encodeURIComponent(segment))
    .join("/");

  const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
  const authToken = options.token.trim();

  const lookupResponse = await fetch(`${endpoint}?ref=${encodeURIComponent(branch)}`, {
    method: "GET",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${authToken}`,
    },
  });

  if (!lookupResponse.ok) {
    throw new Error(await readError(lookupResponse));
  }

  const lookupPayload = (await lookupResponse.json()) as {
    sha?: string;
    path?: string;
    html_url?: string;
  };

  if (!lookupPayload.sha) {
    throw new Error("Could not resolve file SHA for deletion.");
  }

  const deleteResponse = await fetch(endpoint, {
    method: "DELETE",
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: `Bearer ${authToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      message: options.commitMessage,
      sha: lookupPayload.sha,
      branch,
    }),
  });

  if (!deleteResponse.ok) {
    throw new Error(await readError(deleteResponse));
  }

  const deletePayload = (await deleteResponse.json()) as {
    commit?: { html_url?: string };
    content?: { html_url?: string; path?: string } | null;
  };

  return {
    path: deletePayload.content?.path ?? lookupPayload.path ?? options.filePath,
    commitUrl: deletePayload.commit?.html_url,
    contentUrl: deletePayload.content?.html_url ?? lookupPayload.html_url,
  };
}
