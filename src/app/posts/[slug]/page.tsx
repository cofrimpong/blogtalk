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
    <main className="mx-auto min-h-screen w-full max-w-3xl px-6 py-10">
      <p>
        <Link href="/" className="underline">
          ← Back
        </Link>
      </p>
      <article className="prose prose-zinc mt-6 max-w-none dark:prose-invert">
        <h1>{post.title}</h1>
        <p>{post.date}</p>
        <div dangerouslySetInnerHTML={{ __html: post.htmlContent }} />
      </article>
    </main>
  );
}
