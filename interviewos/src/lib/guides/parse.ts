import matter from "gray-matter";
import { z } from "zod";

/** App slug from a guide file name: lower-case letters, digits and dashes only. */
export function guideSlug(fileName: string): string {
  return fileName
    .replace(/\.md$/i, "")
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
}

const dateString = z
  .union([z.string(), z.date()])
  .transform((v) => (v instanceof Date ? v.toISOString().slice(0, 10) : v.slice(0, 10)));

const guideFrontmatter = z.object({
  title: z.string().trim().min(1).max(300),
  description: z.string().trim().max(1000).default(""),
  image: z.string().url().optional(),
  createdAt: dateString.optional(),
  draft: z.boolean().default(false),
  categories: z.array(z.string().trim().min(1)).default([]),
  tags: z.array(z.string().trim().min(1)).default([]),
});

export interface ParsedGuide {
  slug: string;
  path: string;
  title: string;
  description: string;
  imageUrl: string | null;
  publishedOn: string | null;
  categories: string[];
  tags: string[];
  content: string;
}

/** Parses one guide file. Returns null for drafts; throws on malformed frontmatter. */
export function parseGuide(fileName: string, text: string): ParsedGuide | null {
  const { data, content } = matter(text);
  const fm = guideFrontmatter.parse(data);
  if (fm.draft) return null;
  return {
    slug: guideSlug(fileName),
    path: `data/guides/${fileName}`,
    title: fm.title,
    description: fm.description,
    imageUrl: fm.image ?? null,
    publishedOn: fm.createdAt && /^\d{4}-\d{2}-\d{2}$/.test(fm.createdAt) ? fm.createdAt : null,
    categories: fm.categories,
    tags: [...new Set(fm.tags)],
    content: content.trim(),
  };
}

const categoryFrontmatter = z.object({
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().max(1000).default(""),
  sort: z.coerce.number().int().default(1000),
});

export function parseGuideCategory(fileName: string, text: string) {
  const { data } = matter(text);
  const fm = categoryFrontmatter.parse(data);
  return { slug: guideSlug(fileName), title: fm.title, description: fm.description, sort: fm.sort };
}

/**
 * Format-only conversion for rendering without raw HTML: an <img src="…"> tag
 * becomes a Markdown image. The text itself is never changed.
 */
export function toRenderableMarkdown(content: string): string {
  return content.replace(/<img\s+[^>]*src="([^"]+)"[^>]*\/?>/gi, (_, src: string) => `![](${src})`);
}
