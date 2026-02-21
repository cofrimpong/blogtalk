"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { PostMeta } from "@/lib/content";

type EssaysExplorerProps = {
  posts: PostMeta[];
};

export default function EssaysExplorer({ posts }: EssaysExplorerProps) {
  const [query, setQuery] = useState("");
  const [activeTag, setActiveTag] = useState<string | null>(null);

  const allTags = useMemo(() => {
    const tagSet = new Set<string>();

    for (const post of posts) {
      for (const tag of post.tags) {
        tagSet.add(tag);
      }
    }

    return [...tagSet].sort((a, b) => a.localeCompare(b));
  }, [posts]);

  const filteredPosts = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return posts.filter((post) => {
      const matchesTag = !activeTag || post.tags.includes(activeTag);
      const searchableContent = `${post.title} ${post.excerpt ?? ""} ${post.tags.join(" ")}`.toLowerCase();
      const matchesQuery = !normalizedQuery || searchableContent.includes(normalizedQuery);

      return matchesTag && matchesQuery;
    });
  }, [activeTag, posts, query]);

  const [featuredPost, ...otherPosts] = filteredPosts;

  return (
    <>
      <div className="mt-5 rounded-2xl border border-zinc-200/80 bg-white/90 p-5 dark:border-zinc-800 dark:bg-zinc-900/70">
        <div className="flex flex-col gap-4">
          <label className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70" htmlFor="essay-search">
            Search essays
          </label>
          <input
            id="essay-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search title, topic, or keyword"
            className="w-full rounded-lg border border-zinc-300/80 bg-white px-3 py-2 text-sm outline-none ring-0 transition focus:border-fuchsia-400 dark:border-zinc-700 dark:bg-zinc-950"
          />
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setActiveTag(null)}
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition ${
                activeTag === null
                  ? "border-fuchsia-500 bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:text-fuchsia-200"
                  : "border-zinc-300/80 text-zinc-700 hover:border-fuchsia-400 dark:border-zinc-700 dark:text-zinc-300"
              }`}
            >
              All
            </button>
            {allTags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => setActiveTag((currentTag) => (currentTag === tag ? null : tag))}
                className={`rounded-full border px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide transition ${
                  activeTag === tag
                    ? "border-fuchsia-500 bg-fuchsia-100 text-fuchsia-900 dark:bg-fuchsia-900/40 dark:text-fuchsia-200"
                    : "border-zinc-300/80 text-zinc-700 hover:border-fuchsia-400 dark:border-zinc-700 dark:text-zinc-300"
                }`}
              >
                {tag}
              </button>
            ))}
          </div>
        </div>
      </div>

      {featuredPost ? (
        <article className="mt-5 rounded-2xl border border-zinc-200/80 bg-white/90 p-7 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70">
          <p className="text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-700 dark:text-fuchsia-300">Editor&apos;s Pick</p>
          <div className="mt-3 flex items-center gap-2 text-xs uppercase tracking-wide opacity-65">
            <span>{featuredPost.date}</span>
            <span>·</span>
            <span>{featuredPost.readTime}</span>
          </div>
          <Link
            href={`/posts/${featuredPost.slug}`}
            className="editorial-serif mt-3 block text-3xl font-semibold tracking-tight transition-colors hover:text-fuchsia-700 dark:hover:text-fuchsia-300"
          >
            {featuredPost.title}
          </Link>
          {featuredPost.excerpt ? <p className="mt-3 max-w-3xl text-base leading-7 opacity-90">{featuredPost.excerpt}</p> : null}
          {featuredPost.tags.length > 0 ? (
            <div className="mt-5 flex flex-wrap gap-2">
              {featuredPost.tags.map((tag) => (
                <span
                  key={tag}
                  className="rounded-full border border-zinc-300/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                >
                  {tag}
                </span>
              ))}
            </div>
          ) : null}
        </article>
      ) : (
        <p className="mt-6 rounded-xl border border-zinc-200/80 bg-white/80 p-5 text-sm opacity-80 dark:border-zinc-800 dark:bg-zinc-900/60">
          No essays match your current search and filter.
        </p>
      )}

      <ul className="mt-5 grid gap-4 md:grid-cols-2">
        {otherPosts.map((post) => (
          <li
            key={post.slug}
            className="group rounded-xl border border-zinc-200/80 bg-white/90 p-6 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-sm dark:border-zinc-800 dark:bg-zinc-900/70"
          >
            <div className="flex items-center gap-2 text-xs uppercase tracking-wide opacity-65">
              <span>{post.date}</span>
              <span>·</span>
              <span>{post.readTime}</span>
            </div>
            <Link
              href={`/posts/${post.slug}`}
              className="mt-3 block text-xl font-semibold tracking-tight transition-colors group-hover:text-fuchsia-700 dark:group-hover:text-fuchsia-300"
            >
              {post.title}
            </Link>
            {post.excerpt ? <p className="mt-3 text-sm leading-6 opacity-90">{post.excerpt}</p> : null}
            {post.tags.length > 0 ? (
              <div className="mt-4 flex flex-wrap gap-2">
                {post.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full border border-zinc-300/80 px-2.5 py-1 text-[11px] font-medium uppercase tracking-wide text-zinc-700 dark:border-zinc-700 dark:text-zinc-300"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            ) : null}
          </li>
        ))}
      </ul>
    </>
  );
}
