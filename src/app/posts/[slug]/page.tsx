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
        <p className="text-xs uppercase tracking-wide opacity-70">{post.date}</p>
        <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
      </article>
    </main>
  );
}
