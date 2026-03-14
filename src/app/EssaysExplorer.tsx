"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { PostMeta } from "@/lib/content";
import { deleteMarkdownFromGitHub } from "@/lib/consultantPoc";
import { hasFirebaseConfig } from "@/lib/firebaseClient";
import ObserverEngagement from "./ObserverEngagement";
import useAudienceMode from "./useAudienceMode";

type EssaysExplorerProps = {
  posts: PostMeta[];
};

type RuntimeDeleteSettings = {
  githubToken: string;
  githubOwner: string;
  githubRepo: string;
  githubBranch: string;
  postsPath: string;
};

const SETTINGS_STORAGE_KEY = "consultant-poc-settings-v1";
const DELETED_POSTS_STORAGE_KEY = "deleted-post-slugs-v1";
const DELETED_POSTS_UPDATED_EVENT = "deleted-post-slugs-updated";

const defaultDeleteSettings: RuntimeDeleteSettings = {
  githubToken: "",
  githubOwner: process.env.NEXT_PUBLIC_GITHUB_OWNER ?? "",
  githubRepo: process.env.NEXT_PUBLIC_GITHUB_REPO ?? "blogtalk",
  githubBranch: process.env.NEXT_PUBLIC_GITHUB_BRANCH ?? "main",
  postsPath: process.env.NEXT_PUBLIC_POSTS_PATH ?? "content/posts",
};

function normalizePath(path: string): string {
  return path
    .split("/")
    .map((segment) => segment.trim())
    .filter(Boolean)
    .join("/");
}

function readDeleteSettings(): RuntimeDeleteSettings {
  if (typeof window === "undefined") {
    return defaultDeleteSettings;
  }

  try {
    const raw = localStorage.getItem(SETTINGS_STORAGE_KEY);

    if (!raw) {
      return defaultDeleteSettings;
    }

    const saved = JSON.parse(raw) as Partial<RuntimeDeleteSettings>;
    const postsPath = normalizePath(
      typeof saved.postsPath === "string" && saved.postsPath.trim()
        ? saved.postsPath
        : defaultDeleteSettings.postsPath,
    );

    return {
      githubToken: typeof saved.githubToken === "string" ? saved.githubToken.trim() : "",
      githubOwner:
        typeof saved.githubOwner === "string" && saved.githubOwner.trim()
          ? saved.githubOwner.trim()
          : defaultDeleteSettings.githubOwner,
      githubRepo:
        typeof saved.githubRepo === "string" && saved.githubRepo.trim()
          ? saved.githubRepo.trim()
          : defaultDeleteSettings.githubRepo,
      githubBranch:
        typeof saved.githubBranch === "string" && saved.githubBranch.trim()
          ? saved.githubBranch.trim()
          : defaultDeleteSettings.githubBranch,
      postsPath: postsPath || defaultDeleteSettings.postsPath,
    };
  } catch {
    return defaultDeleteSettings;
  }
}

function readDeletedPostSlugs(): string[] {
  if (typeof window === "undefined") {
    return [];
  }

  try {
    const raw = localStorage.getItem(DELETED_POSTS_STORAGE_KEY);

    if (!raw) {
      return [];
    }

    const parsed = JSON.parse(raw) as unknown;

    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .map((value) => (typeof value === "string" ? value.trim() : ""))
      .filter(Boolean);
  } catch {
    return [];
  }
}

export default function EssaysExplorer({ posts }: EssaysExplorerProps) {
  const { isOwner } = useAudienceMode();
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [deletedPostSlugs, setDeletedPostSlugs] = useState<string[]>(() => readDeletedPostSlugs());
  const [deletingSlug, setDeletingSlug] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);
  const [deleteSuccess, setDeleteSuccess] = useState<string | null>(null);

  const canDeletePosts = !hasFirebaseConfig || isOwner;
  const visiblePosts = useMemo(
    () => posts.filter((post) => !deletedPostSlugs.includes(post.slug)),
    [deletedPostSlugs, posts],
  );

  useEffect(() => {
    localStorage.setItem(DELETED_POSTS_STORAGE_KEY, JSON.stringify(deletedPostSlugs));
    window.dispatchEvent(new Event(DELETED_POSTS_UPDATED_EVENT));
  }, [deletedPostSlugs]);

  const hidePostLocally = (slug: string) => {
    setDeletedPostSlugs((current) => (current.includes(slug) ? current : [...current, slug]));
  };

  useEffect(() => {
    if (posts.length === 0 || deletedPostSlugs.length === 0 || visiblePosts.length > 0) {
      return;
    }

    const allPostsHidden = posts.every((post) => deletedPostSlugs.includes(post.slug));

    if (!allPostsHidden) {
      return;
    }

    setDeletedPostSlugs([]);
    setDeleteError("Reset hidden-post cache because it was hiding every post in the feed.");
  }, [deletedPostSlugs, posts, visiblePosts]);

  useEffect(() => {
    if (!canDeletePosts) {
      return;
    }

    const settings = readDeleteSettings();

    if (!settings.githubToken || !settings.githubOwner || !settings.githubRepo) {
      return;
    }

    const postsPath = normalizePath(settings.postsPath || "content/posts") || "content/posts";
    const owner = settings.githubOwner;
    const repo = settings.githubRepo;
    const branch = settings.githubBranch || "main";
    const token = settings.githubToken;
    const candidates = visiblePosts;

    if (candidates.length === 0) {
      return;
    }

    let cancelled = false;

    const reconcileMissingRemotePosts = async () => {
      const missingSlugs: string[] = [];
      let existingCount = 0;

      await Promise.all(
        candidates.map(async (post) => {
          const filePath = `${postsPath}/${post.slug}.md`
            .split("/")
            .map((segment) => encodeURIComponent(segment))
            .join("/");

          const endpoint = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}?ref=${encodeURIComponent(branch)}`;

          try {
            const response = await fetch(endpoint, {
              method: "GET",
              headers: {
                Accept: "application/vnd.github+json",
                Authorization: `Bearer ${token}`,
              },
            });

            if (response.ok) {
              existingCount += 1;
              return;
            }

            if (response.status === 404) {
              missingSlugs.push(post.slug);
            }
          } catch {
            // Ignore temporary network failures during reconcile.
          }
        }),
      );

      if (cancelled || missingSlugs.length === 0) {
        return;
      }

      const allCandidatesMissing = missingSlugs.length === candidates.length;

      if (allCandidatesMissing && existingCount === 0) {
        setDeleteError("GitHub reconcile skipped because owner/repo/branch/path settings did not match your feed files.");
        return;
      }

      setDeletedPostSlugs((current) => {
        const merged = new Set(current);
        for (const slug of missingSlugs) {
          merged.add(slug);
        }
        return [...merged];
      });

      setDeleteSuccess(
        `Synced with GitHub: hid ${missingSlugs.length} already deleted post${missingSlugs.length > 1 ? "s" : ""}.`,
      );
    };

    void reconcileMissingRemotePosts();

    return () => {
      cancelled = true;
    };
  }, [canDeletePosts, visiblePosts]);

  const bubbleTones = [
    {
      card: "border-sky-200/80 bg-sky-50/45 dark:border-sky-900/40 dark:bg-slate-900/70",
      handle: "text-sky-700 dark:text-sky-300",
    },
    {
      card: "border-yellow-200/80 bg-yellow-50/45 dark:border-yellow-900/35 dark:bg-slate-900/70",
      handle: "text-yellow-700 dark:text-yellow-300",
    },
    {
      card: "border-rose-200/80 bg-rose-50/45 dark:border-rose-900/35 dark:bg-slate-900/70",
      handle: "text-rose-700 dark:text-rose-300",
    },
  ] as const;

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();

    for (const post of visiblePosts) {
      for (const tag of post.tags) {
        tagSet.add(tag);
      }
    }

    return [...tagSet].sort((a, b) => a.localeCompare(b));
  }, [visiblePosts]);

  useEffect(() => {
    if (activeTag && !allTags.includes(activeTag)) {
      setActiveTag(null);
    }
  }, [activeTag, allTags]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return visiblePosts.filter((post) => {
      const matchesTag = !activeTag || post.tags.includes(activeTag);
      const searchableContent = `${post.title} ${post.excerpt ?? ""} ${post.tags.join(" ")}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchableContent.includes(normalizedQuery);

      return matchesTag && matchesQuery;
    });
  }, [activeTag, query, visiblePosts]);

  const deletePost = async (post: PostMeta) => {
    if (!canDeletePosts || deletingSlug) {
      return;
    }

    const confirmed = window.confirm(`Delete "${post.title}" from GitHub?`);
    if (!confirmed) {
      return;
    }

    setDeleteError(null);
    setDeleteSuccess(null);

    const settings = readDeleteSettings();

    if (!settings.githubToken) {
      setDeleteError("Add a GitHub token in Consultant settings first.");
      return;
    }

    if (!settings.githubOwner || !settings.githubRepo) {
      setDeleteError("GitHub owner and repo are required in Consultant settings.");
      return;
    }

    const postsPath = normalizePath(settings.postsPath || "content/posts") || "content/posts";
    const filePath = `${postsPath}/${post.slug}.md`;

    setDeletingSlug(post.slug);

    try {
      const response = await deleteMarkdownFromGitHub({
        token: settings.githubToken,
        owner: settings.githubOwner,
        repo: settings.githubRepo,
        branch: settings.githubBranch || "main",
        filePath,
        commitMessage: `delete: ${filePath}`,
      });

      hidePostLocally(post.slug);
      setDeleteSuccess(`Deleted ${response.path} on GitHub. Refresh after Actions deploy completes.`);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Delete failed.";
      if (message.toLowerCase().includes("not found")) {
        hidePostLocally(post.slug);
        setDeleteSuccess("This post was already deleted on GitHub. Hidden locally until your local files sync.");
      } else {
        setDeleteError(message);
      }
    } finally {
      setDeletingSlug(null);
    }
  };

  return (
    <>
      <div className="mt-4 rounded-[1.4rem] border border-zinc-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/75">
        <div className="flex flex-col gap-4">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300" htmlFor="updates-search">
            Filter the feed
          </label>
          <input
            id="updates-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search updates, keywords, or tags"
            className="w-full rounded-2xl border border-zinc-300/80 bg-white/90 px-3 py-2 text-sm outline-none ring-0 transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                activeTag === null
                  ? "border-yellow-400 bg-yellow-100/90 text-yellow-900 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200"
                  : "border-zinc-300/80 text-zinc-700 hover:border-yellow-400 hover:bg-yellow-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
              }`}
            >
              All vibes
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag((currentTag) => (currentTag === tag ? null : tag))}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide transition ${
                  activeTag === tag
                    ? "border-rose-400 bg-rose-100/90 text-rose-900 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200"
                    : "border-zinc-300/80 text-zinc-700 hover:border-sky-400 hover:bg-sky-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>

        {deleteError ? <p className="mt-3 text-sm text-rose-700 dark:text-rose-300">{deleteError}</p> : null}
        {deleteSuccess ? <p className="mt-3 text-sm text-emerald-700 dark:text-emerald-300">{deleteSuccess}</p> : null}
      </div>

      {filteredPosts.length === 0 ? (
        <p className="mt-4 rounded-2xl border border-zinc-200/80 bg-white/80 p-5 text-sm opacity-80 dark:border-slate-700 dark:bg-slate-900/70">
          No updates match your current search and filter.
        </p>
      ) : null}

      <ul className="mt-4 space-y-3">
        {filteredPosts.map((post, index) => (
          <li key={post.slug} className={`rounded-[1.5rem] border p-5 shadow-sm transition hover:-translate-y-0.5 ${bubbleTones[index % bubbleTones.length].card}`}>
            <div className="flex gap-3">
              <span className="mt-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-yellow-400 to-sky-500 text-xs font-black text-zinc-950">
                CV
              </span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  <span className="font-semibold">Chrissy&apos;s Verse</span>
                  <span className={`text-xs ${bubbleTones[index % bubbleTones.length].handle}`}>@chrissyverse</span>
                  <span className="text-xs opacity-60">· {post.date}</span>
                </div>

                <Link
                  href={`/posts/${post.slug}`}
                  className="mt-2 block text-xl font-semibold tracking-tight transition-colors hover:text-sky-700 dark:hover:text-sky-300"
                >
                  {post.title}
                </Link>

                {post.excerpt ? <p className="mt-2 text-sm leading-6 opacity-90">{post.excerpt}</p> : null}

                <div className="mt-3 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide opacity-75">
                  <span className="rounded-full border border-zinc-300/80 bg-white/85 px-2.5 py-1 dark:border-slate-700 dark:bg-slate-900">{post.readTime}</span>
                  {post.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-zinc-300/80 bg-white/85 px-2.5 py-1 text-zinc-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                    >
                      {tag}
                    </span>
                  ))}
                </div>

                <Link
                  href={`/posts/${post.slug}`}
                  className="mt-3 inline-flex rounded-full border border-transparent bg-white/85 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:border-sky-300 hover:text-sky-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
                >
                  Read full post →
                </Link>

                <ObserverEngagement slug={post.slug} title={post.title} />
              </div>

              {canDeletePosts ? (
                <button
                  type="button"
                  onClick={() => {
                    void deletePost(post);
                  }}
                  disabled={deletingSlug === post.slug}
                  className="self-start rounded-full border border-rose-300/80 bg-white/90 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-rose-700 transition hover:border-rose-500 dark:border-rose-800 dark:bg-slate-900 dark:text-rose-300 disabled:opacity-50"
                >
                  {deletingSlug === post.slug ? "Deleting…" : "Delete"}
                </button>
              ) : null}
            </div>
          </li>
        ))}
      </ul>
    </>
  );
}
