"use client";

import { useEffect, useMemo, useState } from "react";
import type { PostMeta } from "@/lib/content";

const DELETED_POSTS_STORAGE_KEY = "deleted-post-slugs-v1";
const DELETED_POSTS_UPDATED_EVENT = "deleted-post-slugs-updated";

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

type FeedStatsProps = {
  posts: PostMeta[];
};

export default function FeedStats({ posts }: FeedStatsProps) {
  const [deletedPostSlugs, setDeletedPostSlugs] = useState<string[]>(() => readDeletedPostSlugs());

  useEffect(() => {
    const syncDeletedPostSlugs = () => {
      setDeletedPostSlugs(readDeletedPostSlugs());
    };

    window.addEventListener("storage", syncDeletedPostSlugs);
    window.addEventListener(DELETED_POSTS_UPDATED_EVENT, syncDeletedPostSlugs);

    return () => {
      window.removeEventListener("storage", syncDeletedPostSlugs);
      window.removeEventListener(DELETED_POSTS_UPDATED_EVENT, syncDeletedPostSlugs);
    };
  }, []);

  const visiblePosts = useMemo(
    () => posts.filter((post) => !deletedPostSlugs.includes(post.slug)),
    [deletedPostSlugs, posts],
  );

  const latestPostDate = visiblePosts[0]?.date;

  if (visiblePosts.length === 0) {
    return null;
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-semibold uppercase tracking-wide">
      <span className="rounded-full border border-zinc-300/80 bg-white/90 px-2.5 py-1 text-zinc-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
        {visiblePosts.length} posts
      </span>
      {latestPostDate ? (
        <span className="rounded-full border border-zinc-300/80 bg-white/90 px-2.5 py-1 text-zinc-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          Last update {latestPostDate}
        </span>
      ) : null}
    </div>
  );
}
