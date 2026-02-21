import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllPostSlugs, getPostBySlug } from "@/lib/content";

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
  const post = await getPostBySlug(slug);

  if (!post) {
    notFound();
  }

  return (
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10 md:py-14">
      <p className="mb-5">
        <Link href="/" className="text-sm font-medium opacity-80 transition-opacity hover:opacity-100">
          ← Back to home
        </Link>
      </p>
      <article className="prose prose-zinc max-w-none dark:prose-invert">
        <h1 className="tracking-tight">{post.title}</h1>
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
    </main>
  );
}
