import matter from "gray-matter";
import { z } from "zod";

/**
 * Lesson files are Markdown with YAML frontmatter. The body is split into
 * required H2 sections. Validation errors name the file and field so content
 * problems fail loudly at seed/test time instead of rendering broken pages.
 */

const readingSchema = z.object({
  title: z.string().min(3),
  url: z.url(),
  kind: z.string().default("docs"),
  note: z.string().optional(),
});

const quizSchema = z
  .object({
    q: z.string().min(5),
    options: z.array(z.string().min(1)).min(2).max(6),
    answer: z.number().int().min(0),
    why: z.string().min(5),
  })
  .refine((v) => v.answer < v.options.length, { message: "answer index out of range" });

export const frontmatterSchema = z.object({
  slug: z.string().regex(/^[a-z0-9-]+$/),
  title: z.string().min(3),
  path: z.string(),
  module: z.string(),
  order: z.number().int(),
  minutes: z.number().int().min(5).max(240),
  depth: z.enum(["full", "concise"]),
  practice: z.enum(["coding", "lab", "conceptual"]),
  summary: z.string().min(10),
  prerequisites: z.array(z.string()).default([]),
  problems: z.array(z.string()).default([]),
  objectives: z.array(z.string().min(5)).min(2),
  readings: z.array(readingSchema).min(1),
  interview: z.array(z.object({ q: z.string().min(5), a: z.string().min(5) })).min(2),
  selfAssessment: z.array(z.string().min(5)).min(2),
  completion: z.array(z.string().min(5)).min(1),
  quiz: z.array(quizSchema).min(3),
  explain: z.object({
    prompt: z.string().min(10),
    rubric: z.array(z.string().min(5)).min(3),
    model: z.string().min(20),
  }),
  cards: z.array(z.object({ q: z.string().min(5), a: z.string().min(2) })).min(2),
});

export type LessonFrontmatter = z.infer<typeof frontmatterSchema>;

export const REQUIRED_SECTIONS = [
  "Explanation",
  "Worked examples",
  "Common misconceptions",
  "Practical exercises",
] as const;

export type SectionName = (typeof REQUIRED_SECTIONS)[number];

export interface ParsedLesson extends LessonFrontmatter {
  sections: Record<SectionName, string>;
}

export class LessonParseError extends Error {
  constructor(file: string, detail: string) {
    super(`${file}: ${detail}`);
    this.name = "LessonParseError";
  }
}

export function splitSections(body: string): Record<string, string> {
  const out: Record<string, string> = {};
  let current: string | null = null;
  let buffer: string[] = [];
  let inFence = false;
  const flush = () => {
    if (current !== null) out[current] = buffer.join("\n").trim();
  };
  for (const line of body.split(/\r?\n/)) {
    if (/^\s*(```|~~~)/.test(line)) inFence = !inFence;
    const m = !inFence ? /^##\s+(.+?)\s*$/.exec(line) : null;
    if (m) {
      flush();
      current = m[1]!;
      buffer = [];
    } else {
      buffer.push(line);
    }
  }
  flush();
  return out;
}

export function parseLesson(source: string, file = "<lesson>"): ParsedLesson {
  let parsed: matter.GrayMatterFile<string>;
  try {
    parsed = matter(source);
  } catch (err) {
    throw new LessonParseError(file, `invalid YAML frontmatter — ${(err as Error).message}`);
  }
  const fm = frontmatterSchema.safeParse(parsed.data);
  if (!fm.success) {
    const issues = fm.error.issues.map((i) => `${i.path.join(".") || "(root)"}: ${i.message}`).join("; ");
    throw new LessonParseError(file, issues);
  }
  const raw = splitSections(parsed.content);
  const sections = {} as Record<SectionName, string>;
  for (const name of REQUIRED_SECTIONS) {
    const text = raw[name];
    if (!text || text.length < 40) throw new LessonParseError(file, `missing or empty section "## ${name}"`);
    sections[name] = text;
  }
  const unknown = Object.keys(raw).filter((k) => !(REQUIRED_SECTIONS as readonly string[]).includes(k));
  if (unknown.length > 0) {
    throw new LessonParseError(file, `unknown H2 section(s): ${unknown.join(", ")} (use ### for subsections)`);
  }
  return { ...fm.data, sections };
}
