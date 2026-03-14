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

export type TocItem = {
  id: string;
  title: string;
  level: 2 | 3;
};

function parseFrontMatter(data: unknown): FrontMatter {
  if (!data || typeof data !== "object") {
    return {};
  }

  return data as FrontMatter;
}

function formatLocalIsoDate(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function normalizeDate(value: string | Date | undefined): string {
  if (!value) {
    return "";
  }

  if (value instanceof Date) {
    return formatLocalIsoDate(value);
  }

  return value;
}

function normalizeTags(value: string[] | undefined): string[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter((item): item is string => typeof item === "string");
}

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-");
}

function extractToc(content: string): TocItem[] {
  const lines = content.split(/\r?\n/);
  const counts = new Map<string, number>();
  const toc: TocItem[] = [];

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);

    if (!match) {
      continue;
    }

    const level = match[1].length as 2 | 3;
    const title = match[2].trim();
    const baseId = slugify(title) || "section";
    const duplicateCount = counts.get(baseId) ?? 0;
    counts.set(baseId, duplicateCount + 1);
    const id = duplicateCount === 0 ? baseId : `${baseId}-${duplicateCount + 1}`;

    toc.push({ id, title, level });
  }

  return toc;
}

function injectHeadingIds(htmlContent: string, toc: TocItem[]): string {
  let index = 0;

  return htmlContent.replace(/<h([23])>(.*?)<\/h\1>/g, (fullMatch, levelText, headingInner) => {
    const tocItem = toc[index];
    const level = Number(levelText) as 2 | 3;

    if (!tocItem || tocItem.level !== level) {
      return fullMatch;
    }

    index += 1;
    return `<h${level} id="${tocItem.id}">${headingInner}</h${level}>`;
  });
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

export async function getPostBySlug(
  slug: string,
): Promise<(PostMeta & { htmlContent: string; toc: TocItem[] }) | null> {
  const fullPath = path.join(postsDirectory, `${slug}.md`);

  if (!fs.existsSync(fullPath)) {
    return null;
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);
  const frontMatter = parseFrontMatter(data);
  const processed = await remark().use(html).process(content);
  const toc = extractToc(content);
  const htmlContent = injectHeadingIds(processed.toString(), toc);

  return {
    slug,
    title: frontMatter.title ?? slug,
    date: normalizeDate(frontMatter.date),
    excerpt: frontMatter.excerpt,
    tags: normalizeTags(frontMatter.tags),
    readTime: frontMatter.readTime ?? "8 min read",
    htmlContent,
    toc,
  };
}
