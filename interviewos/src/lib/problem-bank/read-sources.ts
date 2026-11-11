import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import {
  type BankWindow,
  type CompanyRow,
  extractPatternProblems,
  leetcodeUrl,
  parseCompanyCsv,
  parsePatternFilename,
  slugify,
  titleFromSlug,
  windowFromFilename,
} from "./parse";

export interface BankProblemModel {
  slug: string;
  title: string;
  url: string;
  difficulty: "easy" | "medium" | "hard" | null;
  tags: string[];
}

export interface BankCompanyModel {
  slug: string;
  name: string;
  entries: { slug: string; window: BankWindow; frequency: number }[];
}

export interface BankPatternModel {
  slug: string;
  name: string;
  position: number;
  fileName: string;
  problems: string[];
}

export interface BankModel {
  problems: Map<string, BankProblemModel>;
  companies: BankCompanyModel[];
  patterns: BankPatternModel[];
  warnings: string[];
  skippedRows: number;
}

const isDir = (p: string) => statSync(p).isDirectory();

/** Reads the company-wise dataset: one folder per company, one CSV per time window. */
export function readCompanyLists(dir: string, model: BankModel): void {
  for (const name of readdirSync(dir).sort()) {
    const companyDir = join(dir, name);
    if (name.startsWith(".") || !isDir(companyDir)) continue;
    const company: BankCompanyModel = { slug: slugify(name), name, entries: [] };
    for (const file of readdirSync(companyDir).sort()) {
      if (!file.toLowerCase().endsWith(".csv")) continue;
      const window = windowFromFilename(file);
      if (!window) {
        model.warnings.push(`Unknown time window file: ${name}/${file}`);
        continue;
      }
      const { rows, skipped } = parseCompanyCsv(readFileSync(join(companyDir, file), "utf8"));
      model.skippedRows += skipped;
      const seen = new Set<string>();
      for (const row of rows) {
        if (seen.has(row.slug)) continue;
        seen.add(row.slug);
        mergeProblem(model, row);
        company.entries.push({ slug: row.slug, window, frequency: row.frequency });
      }
    }
    if (company.entries.length) model.companies.push(company);
  }
}

function mergeProblem(model: BankModel, row: CompanyRow) {
  const existing = model.problems.get(row.slug);
  if (!existing) {
    model.problems.set(row.slug, {
      slug: row.slug,
      title: row.title,
      url: row.url,
      difficulty: row.difficulty,
      tags: row.tags,
    });
    return;
  }
  existing.difficulty ??= row.difficulty;
  if (row.tags.length > existing.tags.length) existing.tags = row.tags;
}

/** Reads the pattern notes: one Markdown file per pattern, LeetCode links inside. */
export function readPatterns(dir: string, model: BankModel): void {
  for (const file of readdirSync(dir).sort()) {
    if (!file.endsWith(".md")) continue;
    const parsed = parsePatternFilename(file);
    if (!parsed) continue;
    const problems = extractPatternProblems(readFileSync(join(dir, file), "utf8"));
    for (const slug of problems) {
      if (!model.problems.has(slug)) {
        // Known only from the notes: difficulty and tags are unknown rather than guessed.
        model.problems.set(slug, {
          slug,
          title: titleFromSlug(slug),
          url: leetcodeUrl(slug),
          difficulty: null,
          tags: [],
        });
      }
    }
    model.patterns.push({
      slug: slugify(parsed.name),
      name: parsed.name,
      position: parsed.position,
      fileName: file,
      problems,
    });
  }
  model.patterns.sort((a, b) => a.position - b.position);
}

export function emptyModel(): BankModel {
  return { problems: new Map(), companies: [], patterns: [], warnings: [], skippedRows: 0 };
}
