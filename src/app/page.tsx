import Link from "next/link";
import { getHomeContent, getSortedPostsMeta } from "@/lib/content";

export default async function Home() {
  const [home, posts] = await Promise.all([
    getHomeContent(),
    Promise.resolve(getSortedPostsMeta()),
  ]);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <article
        className="prose prose-zinc max-w-none dark:prose-invert"
        dangerouslySetInnerHTML={{ __html: home.htmlContent }}
      />

      <section className="mt-12">
        <h2 className="text-2xl font-semibold">Posts</h2>
        <ul className="mt-4 space-y-4">
          {posts.map((post) => (
            <li key={post.slug} className="rounded-lg border p-4">
              <Link href={`/posts/${post.slug}`} className="text-xl font-medium underline">
                {post.title}
              </Link>
              <p className="mt-1 text-sm opacity-75">{post.date}</p>
              {post.excerpt ? <p className="mt-2">{post.excerpt}</p> : null}
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
