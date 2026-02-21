import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostSlugs, getPostBySlug, getSortedPostsMeta } from "@/lib/content";
import ReadingProgress from "./ReadingProgress";

export function generateStaticParams() {
  return getAllPostSlugs().map((slug) => ({ slug }));
}

type PostPageProps = {
  params: Promise<{
    slug: string;
  }>;
};

export default async function PostPage({ params }: PostPageProps) {
  const { slug } = await params;
  const [post, allPosts] = await Promise.all([getPostBySlug(slug), Promise.resolve(getSortedPostsMeta())]);

  if (!post) {
    notFound();
  }

  const relatedPosts = allPosts
    .filter((candidate) => candidate.slug !== post.slug)
    .map((candidate) => {
      const sharedTags = candidate.tags.filter((tag) => post.tags.includes(tag));

      return {
        ...candidate,
        score: sharedTags.length,
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 3);

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10 md:py-14">
      <ReadingProgress />
      <p className="mb-5">
        <Link href="/" className="text-sm font-medium opacity-80 transition-opacity hover:opacity-100">
          ← Back to home
        </Link>
      </p>

      {post.toc.length > 0 ? (
        <aside className="mb-8 rounded-xl border border-zinc-200/80 bg-white/80 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-70">On this page</p>
          <ul className="mt-3 space-y-2 text-sm">
            {post.toc.map((item) => (
              <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                <a href={`#${item.id}`} className="opacity-80 transition-colors hover:text-fuchsia-700 hover:opacity-100 dark:hover:text-fuchsia-300">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <article className="prose prose-zinc editorial-prose max-w-none dark:prose-invert">
        <h1 className="editorial-serif tracking-tight">{post.title}</h1>
        <div className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide opacity-70">
          <span>{post.date}</span>
          <span>·</span>
          <span>{post.readTime}</span>
          {post.tags.map((tag) => (
            <span
              key={tag}
              className="rounded-full border border-zinc-300/80 px-2 py-0.5 text-[10px] font-medium dark:border-zinc-700"
            >
              {tag}
            </span>
          ))}
        </div>
        <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
      </article>

      {relatedPosts.length > 0 ? (
        <section className="mt-12 border-t border-zinc-200/80 pt-8 dark:border-zinc-800">
          <h2 className="editorial-serif text-2xl font-semibold tracking-tight">Related Essays</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {relatedPosts.map((relatedPost) => (
              <li key={relatedPost.slug} className="rounded-xl border border-zinc-200/80 bg-white/90 p-4 dark:border-zinc-800 dark:bg-zinc-900/60">
                <p className="text-xs uppercase tracking-wide opacity-65">{relatedPost.readTime}</p>
                <Link
                  href={`/posts/${relatedPost.slug}`}
                  className="mt-2 block text-lg font-semibold tracking-tight transition-colors hover:text-fuchsia-700 dark:hover:text-fuchsia-300"
                >
                  {relatedPost.title}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </main>
  );
}
