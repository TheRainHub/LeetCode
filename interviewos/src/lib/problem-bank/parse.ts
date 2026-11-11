import { z } from "zod";
import { parseCsv } from "./csv";

export type BankWindow = "30d" | "3m" | "6m" | "6m_plus" | "all";
export const BANK_WINDOWS: BankWindow[] = ["30d", "3m", "6m", "6m_plus", "all"];

/** File names used by the company-wise dataset, e.g. "2. Three Months.csv". */
const WINDOW_BY_NAME: Record<string, BankWindow> = {
  "thirty days": "30d",
  "three months": "3m",
  "six months": "6m",
  "more than six months": "6m_plus",
  all: "all",
};

export function windowFromFilename(fileName: string): BankWindow | null {
  const base = fileName
    .replace(/\.csv$/i, "")
    .replace(/^\s*\d+\.\s*/, "")
    .trim()
    .toLowerCase();
  return WINDOW_BY_NAME[base] ?? null;
}

/** Extracts the problem slug from a LeetCode problem URL. */
export function leetcodeSlug(url: string): string | null {
  const m = /leetcode\.com\/problems\/([a-z0-9-]+)/i.exec(url);
  return m ? m[1]!.toLowerCase() : null;
}

export function leetcodeUrl(slug: string): string {
  return `https://leetcode.com/problems/${slug}/`;
}

export function slugify(name: string): string {
  return name
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** "longest-substring-without-repeating-characters" → "Longest Substring Without Repeating Characters" */
export function titleFromSlug(slug: string): string {
  return slug
    .split("-")
    .filter(Boolean)
    .map((w) => w[0]!.toUpperCase() + w.slice(1))
    .join(" ");
}

export interface CompanyRow {
  slug: string;
  title: string;
  url: string;
  difficulty: "easy" | "medium" | "hard";
  frequency: number;
  tags: string[];
}

const rowSchema = z.object({
  Difficulty: z
    .string()
    .transform((s) => s.trim().toLowerCase())
    .pipe(z.enum(["easy", "medium", "hard"])),
  Title: z.string().trim().min(1).max(300),
  Frequency: z.coerce.number().min(0).max(100),
  Link: z.string().trim().url(),
  Topics: z.string().default(""),
});

/**
 * Parses one company CSV. Rows that fail validation are counted, not thrown,
 * so a single malformed line can't block an import. The "Acceptance Rate"
 * column is ignored: its values in the dataset are not percentages.
 */
export function parseCompanyCsv(text: string): { rows: CompanyRow[]; skipped: number } {
  const table = parseCsv(text);
  const header = table[0]?.map((h) => h.trim());
  if (!header) return { rows: [], skipped: 0 };
  const rows: CompanyRow[] = [];
  let skipped = 0;
  for (const cells of table.slice(1)) {
    const record = Object.fromEntries(header.map((h, i) => [h, cells[i] ?? ""]));
    const parsed = rowSchema.safeParse(record);
    const slug = parsed.success ? leetcodeSlug(parsed.data.Link) : null;
    if (!parsed.success || !slug) {
      skipped++;
      continue;
    }
    rows.push({
      slug,
      title: parsed.data.Title,
      url: leetcodeUrl(slug),
      difficulty: parsed.data.Difficulty,
      frequency: Math.round(parsed.data.Frequency * 10) / 10,
      tags: parsed.data.Topics.split(",")
        .map((t) => t.trim())
        .filter(Boolean),
    });
  }
  return { rows, skipped };
}

/** "✅  Pattern 01 : Sliding Window.md" (or "Pattern 01 - Sliding Window.md") → { position: 1, name: "Sliding Window" } */
export function parsePatternFilename(fileName: string): { position: number; name: string } | null {
  const m = /Pattern\s*0*(\d+)\s*[:\-–]?\s*(.+?)\.md$/i.exec(fileName);
  if (!m) return null;
  const name = m[2]!
    .replace(/[^\p{L}\p{N}\s'&()/.-]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
  return name ? { position: Number(m[1]), name } : null;
}

/** LeetCode problem slugs linked from a pattern's notes, in order of first appearance. */
export function extractPatternProblems(markdown: string): string[] {
  const seen = new Set<string>();
  for (const m of markdown.matchAll(/https?:\/\/(?:www\.)?leetcode\.com\/problems\/([a-z0-9-]+)/gi)) {
    seen.add(m[1]!.toLowerCase());
  }
  return [...seen];
}
