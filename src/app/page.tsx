import { getHomeContent, getSortedPostsMeta } from "@/lib/content";
import EssaysExplorer from "./EssaysExplorer";

export default async function Home() {
  const [home, posts] = await Promise.all([
    getHomeContent(),
    Promise.resolve(getSortedPostsMeta()),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-5xl px-6 py-10 md:py-14">
      <section className="relative overflow-hidden rounded-2xl border border-zinc-200/70 bg-gradient-to-b from-fuchsia-50/80 via-violet-50/40 to-white p-8 shadow-sm dark:border-zinc-800 dark:from-zinc-900 dark:via-violet-950/30 dark:to-zinc-950 md:p-10">
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-fuchsia-700 dark:text-fuchsia-300">
          Personal Blog
        </p>
        <article
          className="prose prose-zinc editorial-prose mt-4 max-w-none dark:prose-invert"
          dangerouslySetInnerHTML={{ __html: home.htmlContent }}
        />
      </section>

      <section id="essays" className="mt-12 scroll-mt-24">
        <div className="flex items-end justify-between">
          <h2 className="editorial-serif text-3xl font-semibold tracking-tight">Latest Essays</h2>
          <p className="text-sm opacity-70">{posts.length} published</p>
        </div>
        <EssaysExplorer posts={posts} />
      </section>
    </main>
  );
}
