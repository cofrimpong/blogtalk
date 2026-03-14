import Link from "next/link";
import { notFound } from "next/navigation";
import ObserverEngagement from "@/app/ObserverEngagement";
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
    <main className="mx-auto min-h-screen w-full max-w-3xl px-4 py-6 md:px-6 md:py-10">
      <ReadingProgress />
      <p className="mb-5">
        <Link
          href="/"
          className="inline-flex rounded-full border border-zinc-300/80 bg-white/85 px-3 py-1.5 text-sm font-semibold text-zinc-700 transition hover:border-sky-400 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200 dark:hover:border-sky-700 dark:hover:text-sky-300"
        >
          ← Back to updates
        </Link>
      </p>

      {post.toc.length > 0 ? (
        <aside className="mb-6 rounded-[1.4rem] border border-sky-200/80 bg-sky-50/60 p-4 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-sky-700 dark:text-sky-300">On this page</p>
          <ul className="mt-3 space-y-2 text-sm">
            {post.toc.map((item) => (
              <li key={item.id} className={item.level === 3 ? "pl-4" : ""}>
                <a href={`#${item.id}`} className="opacity-80 transition-colors hover:text-sky-700 hover:opacity-100 dark:hover:text-sky-300">
                  {item.title}
                </a>
              </li>
            ))}
          </ul>
        </aside>
      ) : null}

      <article className="rounded-[1.6rem] border border-zinc-200/80 bg-white/85 p-6 shadow-sm backdrop-blur dark:border-slate-700 dark:bg-slate-900/75">
        <div className="prose prose-zinc editorial-prose max-w-none dark:prose-invert">
          <h1 className="editorial-serif tracking-tight">{post.title}</h1>
          <div className="mb-6 flex flex-wrap items-center gap-2 text-xs uppercase tracking-wide opacity-70">
            <span>{post.date}</span>
            <span>·</span>
            <span>{post.readTime}</span>
            {post.tags.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-zinc-300/80 bg-white/90 px-2 py-0.5 text-[10px] font-semibold dark:border-slate-700 dark:bg-slate-900"
              >
                {tag}
              </span>
            ))}
          </div>
          <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
        </div>
      </article>

      <ObserverEngagement slug={post.slug} title={post.title} />

      {relatedPosts.length > 0 ? (
        <section className="mt-8 rounded-[1.4rem] border border-zinc-200/80 bg-white/85 p-5 shadow-sm dark:border-slate-700 dark:bg-slate-900/75">
          <h2 className="editorial-serif text-2xl font-semibold tracking-tight">Related Updates</h2>
          <ul className="mt-4 grid gap-4 sm:grid-cols-2">
            {relatedPosts.map((relatedPost) => (
              <li key={relatedPost.slug} className="rounded-2xl border border-zinc-200/80 bg-white/90 p-4 dark:border-slate-700 dark:bg-slate-900">
                <p className="text-xs uppercase tracking-wide opacity-65">{relatedPost.readTime}</p>
                <Link
                  href={`/posts/${relatedPost.slug}`}
                  className="mt-2 block text-lg font-semibold tracking-tight transition-colors hover:text-sky-700 dark:hover:text-sky-300"
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
