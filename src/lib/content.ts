import fs from "fs";
import path from "path";
import matter from "gray-matter";
import { remark } from "remark";
import html from "remark-html";

const contentDirectory = path.join(process.cwd(), "content");
const postsDirectory = path.join(contentDirectory, "posts");

type FrontMatter = {
  title?: string;
  date?: string | Date;
  excerpt?: string;
  tags?: string[];
  readTime?: string;
};

export type PostMeta = {
  slug: string;
  title: string;
  date: string;
  excerpt?: string;
  tags: string[];
  readTime: string;
};

export type HomeContent = {
  title: string;
  htmlContent: string;
};

function parseFrontMatter(data: unknown): FrontMatter {
  if (!data || typeof data !== "object") {
    return {};
  }

  return data as FrontMatter;
}

function normalizeDate(value: string | Date | undefined): string {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return value;
}

function normalizeTags(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

export async function getHomeContent(): Promise<HomeContent> {
  const homeFilePath = path.join(contentDirectory, "home.md");
  const file = fs.readFileSync(homeFilePath, "utf8");
  const { data, content } = matter(file);
  const frontMatter = parseFrontMatter(data);
  const processed = await remark().use(html).process(content);

  return {
    title: frontMatter.title ?? "Home",
    htmlContent: processed.toString(),
  };
}

export function getSortedPostsMeta(): PostMeta[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  const fileNames = fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".md"));

  const posts = fileNames.map((fileName) => {
    const slug = fileName.replace(/\.md$/, "");
    const fullPath = path.join(postsDirectory, fileName);
    const fileContents = fs.readFileSync(fullPath, "utf8");
    const { data } = matter(fileContents);
    const frontMatter = parseFrontMatter(data);

    return {
      slug,
      title: frontMatter.title ?? slug,
      date: normalizeDate(frontMatter.date),
      excerpt: frontMatter.excerpt,
      tags: normalizeTags(frontMatter.tags),
      readTime: frontMatter.readTime ?? "8 min read",
    };
  });

  return posts.sort((a, b) => (a.date < b.date ? 1 : -1));
}

export function getAllPostSlugs(): string[] {
  if (!fs.existsSync(postsDirectory)) {
    return [];
  }

  return fs
    .readdirSync(postsDirectory)
    .filter((fileName) => fileName.endsWith(".md"))
    .map((fileName) => fileName.replace(/\.md$/, ""));
}

export async function getPostBySlug(slug: string): Promise<(PostMeta & { htmlContent: string }) | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const frontMatter = parseFrontMatter(data);
  const processed = await remark().use(html).process(content);

  return {
    slug,
    title: frontMatter.title ?? slug,
    date: normalizeDate(frontMatter.date),
    excerpt: frontMatter.excerpt,
    tags: normalizeTags(frontMatter.tags),
    readTime: frontMatter.readTime ?? "8 min read",
    htmlContent: processed.toString(),
  };
}
