import Link from "next/link";
import { getHomeContent, getSortedPostsMeta } from "@/lib/content";

export default async function Home() {
  const [home, posts] = await Promise.all([
    getHomeContent(),
    Promise.resolve(getSortedPostsMeta()),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-4xl px-6 py-10 md:py-14">
      <article
        className="prose prose-zinc max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: home.htmlContent }}
      />

      <section className="mt-14">
        <div className="flex items-end justify-between">
          <h2 className="text-2xl font-semibold tracking-tight">Latest Posts</h2>
          <p className="text-sm opacity-70">{posts.length} published</p>
        </div>
        <ul className="mt-5 grid gap-4 sm:grid-cols-2">
          {posts.map((post) => (
            <li
              key={post.slug}
              className="rounded-xl border border-zinc-200/80 bg-white/80 p-5 transition-transform duration-150 hover:-translate-y-0.5 dark:border-zinc-800 dark:bg-zinc-900/70"
            >
              <Link href={`/posts/${post.slug}`} className="text-lg font-semibold tracking-tight hover:underline">
                {post.title}
              </Link>
              <p className="mt-2 text-xs uppercase tracking-wide opacity-70">{post.date}</p>
              {post.excerpt ? <p className="mt-3 text-sm leading-6 opacity-90">{post.excerpt}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
