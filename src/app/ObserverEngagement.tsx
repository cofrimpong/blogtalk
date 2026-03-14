"use client";

import { useEffect, useMemo, useState } from "react";
import useAudienceMode from "./useAudienceMode";

type StoredComment = {
  id: string;
  text: string;
};

type StoredEngagement = {
  liked: boolean;
  likes: number;
  comments: StoredComment[];
};

type ObserverEngagementProps = {
  slug: string;
  title: string;
};

const STORAGE_PREFIX = "observer-engagement-v1:";

function buildPostUrl(slug: string): string {
  if (typeof window === "undefined") {
    return `/posts/${slug}/`;
  }

  return `${window.location.origin}/posts/${slug}/`;
}

function readStoredEngagement(storageKey: string): StoredEngagement {
  if (typeof window === "undefined") {
    return { liked: false, likes: 0, comments: [] };
  }

  try {
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return { liked: false, likes: 0, comments: [] };
    }

    const parsed = JSON.parse(raw) as Partial<StoredEngagement>;
    return {
      liked: Boolean(parsed.liked),
      likes: typeof parsed.likes === "number" && parsed.likes > 0 ? Math.floor(parsed.likes) : 0,
      comments: Array.isArray(parsed.comments)
        ? parsed.comments
            .map((item) => ({
              id: typeof item?.id === "string" ? item.id : "",
              text: typeof item?.text === "string" ? item.text : "",
            }))
            .filter((item) => item.id && item.text)
        : [],
    };
  } catch {
    return { liked: false, likes: 0, comments: [] };
  }
}

export default function ObserverEngagement({ slug, title }: ObserverEngagementProps) {
  const { isObserver } = useAudienceMode();
  const storageKey = `${STORAGE_PREFIX}${slug}`;

  const [engagement, setEngagement] = useState<StoredEngagement>(() => readStoredEngagement(storageKey));
  const [commentInput, setCommentInput] = useState("");

  const liked = engagement.liked;
  const likeCount = engagement.likes;
  const comments = engagement.comments;

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(engagement));
  }, [engagement, storageKey]);

  const postUrl = useMemo(() => buildPostUrl(slug), [slug]);

  if (!isObserver) {
    return null;
  }

  const toggleLike = () => {
    setEngagement((current) => {
      const nextLiked = !current.liked;

      return {
        ...current,
        liked: nextLiked,
        likes: nextLiked ? current.likes + 1 : Math.max(0, current.likes - 1),
      };
    });
  };

  const addComment = () => {
    const text = commentInput.trim();

    if (!text) {
      return;
    }

    const comment: StoredComment = {
      id: `${Date.now()}`,
      text,
    };

    setEngagement((current) => ({
      ...current,
      comments: [...current.comments, comment],
    }));
    setCommentInput("");
  };

  const shareOnX = () => {
    const text = encodeURIComponent(`Check out "${title}" on Chrissy's Verse`);
    const url = encodeURIComponent(postUrl);
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, "_blank", "noopener,noreferrer");
  };

  const shareOnLinkedIn = () => {
    const url = encodeURIComponent(postUrl);
    window.open(`https://www.linkedin.com/sharing/share-offsite/?url=${url}`, "_blank", "noopener,noreferrer");
  };

  const copyPostLink = async () => {
    try {
      await navigator.clipboard.writeText(postUrl);
    } catch {
      // no-op for unsupported clipboard writes
    }
  };

  return (
    <div className="mt-4 rounded-2xl border border-zinc-300/70 bg-white/80 p-3 dark:border-slate-700 dark:bg-slate-900/70">
      <p className="text-xs font-semibold uppercase tracking-[0.14em] text-sky-700 dark:text-sky-300">Observer actions</p>

      <div className="mt-2 flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={toggleLike}
          className="rounded-full border border-zinc-300/80 bg-white/90 px-3 py-1.5 text-xs font-semibold transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
        >
          {liked ? "Unlike" : "Like"} · {likeCount}
        </button>
        <button
          type="button"
          onClick={shareOnX}
          className="rounded-full border border-zinc-300/80 bg-white/90 px-3 py-1.5 text-xs font-semibold transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
        >
          Reshare to X
        </button>
        <button
          type="button"
          onClick={shareOnLinkedIn}
          className="rounded-full border border-zinc-300/80 bg-white/90 px-3 py-1.5 text-xs font-semibold transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
        >
          Reshare to LinkedIn
        </button>
        <button
          type="button"
          onClick={() => {
            void copyPostLink();
          }}
          className="rounded-full border border-zinc-300/80 bg-white/90 px-3 py-1.5 text-xs font-semibold transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
        >
          Copy link
        </button>
      </div>

      <div className="mt-3">
        <label className="block text-xs font-semibold uppercase tracking-[0.14em] text-zinc-600 dark:text-slate-300" htmlFor={`comment-${slug}`}>
          Comment
        </label>
        <div className="mt-1 flex gap-2">
          <input
            id={`comment-${slug}`}
            value={commentInput}
            onChange={(event) => setCommentInput(event.target.value)}
            placeholder="Add a comment"
            className="w-full rounded-lg border border-zinc-300/80 bg-white/90 px-3 py-2 text-sm outline-none transition focus:border-sky-400 dark:border-slate-700 dark:bg-slate-950"
          />
          <button
            type="button"
            onClick={addComment}
            className="rounded-lg border border-zinc-300/80 bg-white/90 px-3 py-2 text-xs font-semibold uppercase tracking-wide transition hover:border-sky-400 dark:border-slate-700 dark:bg-slate-900"
          >
            Post
          </button>
        </div>
      </div>

      {comments.length > 0 ? (
        <ul className="mt-3 space-y-2">
          {comments.map((comment) => (
            <li
              key={comment.id}
              className="rounded-lg border border-zinc-300/70 bg-white/90 px-3 py-2 text-sm dark:border-slate-700 dark:bg-slate-900"
            >
              {comment.text}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
