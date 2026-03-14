import { getHomeContent, getSortedPostsMeta } from "@/lib/content";
import EssaysExplorer from "./EssaysExplorer";
import FeedStats from "./FeedStats";
import PinnedBubbleContent from "./PinnedBubbleContent";

export default async function Home() {
  const [home, posts] = await Promise.all([
    getHomeContent(),
    Promise.resolve(getSortedPostsMeta()),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-6xl px-2 pb-6 pt-2 md:px-4 md:pt-3">
      <div>
        <section className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-2">
            <header className="relative overflow-hidden rounded-[1.8rem] border border-zinc-200/80 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/75 md:p-7">
              <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-sky-200/50 blur-2xl dark:bg-sky-900/35" />
              <div className="pointer-events-none absolute -bottom-10 left-8 h-28 w-28 rounded-full bg-rose-200/45 blur-2xl dark:bg-rose-900/25" />

              <div className="relative flex items-start justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.22em] text-sky-700 dark:text-sky-300">
                    Community feed
                  </p>
                  <h1 className="editorial-serif mt-2 text-4xl font-semibold tracking-tight">Chrissy&apos;s Verse</h1>
                </div>
                <span className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-yellow-400 to-sky-500 text-sm font-black text-zinc-950">
                  CV
                </span>
              </div>

              <div className="relative mt-5 flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-wide">
                <span className="rounded-full border border-sky-300/80 bg-sky-100/80 px-3 py-1 text-sky-800 dark:border-sky-700 dark:bg-sky-900/35 dark:text-sky-200">
                  Updates
                </span>
                <span className="rounded-full border border-yellow-300/80 bg-yellow-100/80 px-3 py-1 text-yellow-800 dark:border-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-200">
                  Moments
                </span>
                <span className="rounded-full border border-rose-300/80 bg-rose-100/80 px-3 py-1 text-rose-800 dark:border-rose-700 dark:bg-rose-900/30 dark:text-rose-200">
                  Launches
                </span>
              </div>
            </header>

            <article className="relative overflow-hidden rounded-[1.6rem] border border-zinc-200/80 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/75 md:p-6">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-rose-500 via-yellow-400 to-sky-500 text-xs font-black text-zinc-950">
                  CV
                </span>
                <div>
                  <p className="text-sm font-semibold">Chrissy&apos;s Verse</p>
                  <p className="text-xs opacity-65">@chrissyverse · Pinned bubble</p>
                </div>
              </div>

              <div className="mt-4 rounded-3xl border border-yellow-200/80 bg-gradient-to-r from-sky-50 via-yellow-50 to-rose-50 px-4 py-3 dark:border-slate-700 dark:from-slate-900 dark:via-slate-900 dark:to-slate-800">
                <PinnedBubbleContent htmlContent={home.htmlContent} />
              </div>

              <FeedStats posts={posts} />
            </article>
          </div>

          <section id="updates" className="scroll-mt-24">
            <div className="rounded-[1.4rem] border border-zinc-200/80 bg-white/85 px-4 py-3 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
              <h2 className="text-lg font-semibold tracking-tight">Feed updates</h2>
              <p className="text-sm opacity-75">Quick drops, visual updates, and what&apos;s live across my web presence.</p>
            </div>
            <EssaysExplorer posts={posts} />
          </section>
        </section>
      </div>
    </main>
  );
}
