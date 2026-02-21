import Link from "next/link";
import { getHomeContent, getSortedPostsMeta } from "@/lib/content";

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
        <ul className="mt-5 grid gap-4 md:grid-cols-2">
          {posts.map((post) => (
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
      </section>
    </main>
  );
}
