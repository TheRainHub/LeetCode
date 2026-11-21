/**
 * Server-side checks on AI output for the job search. The model is instructed not to invent
 * anything; these checks enforce the parts that can be verified mechanically.
 */
import type { FoundJob, JobAnalysis, WebSource } from "./model";

const TRACKING_PARAMS = /^(utm_[a-z]+|gclid|fbclid|mc_[a-z]+|ref|refid|trk|trackingid|src)$/i;

/** Canonical form of a link for comparisons: lower-case host, no fragment, tracking or trailing slash. */
export function normalizeUrl(raw: string): string | null {
  let u: URL;
  try {
    u = new URL(raw.trim());
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  u.hash = "";
  u.hostname = u.hostname.toLowerCase().replace(/^www\./, "");
  for (const key of [...u.searchParams.keys()]) if (TRACKING_PARAMS.test(key)) u.searchParams.delete(key);
  u.searchParams.sort();
  const path = u.pathname.replace(/\/+$/, "");
  return `${u.hostname}${u.port ? `:${u.port}` : ""}${path}${u.search}`;
}

/**
 * Keeps job suggestions whose link was among the pages the model actually saw (search results or
 * fetched pages), drops duplicates, and counts what was dropped.
 */
export function filterFoundJobs(
  jobs: FoundJob[],
  sources: WebSource[],
): { jobs: FoundJob[]; dropped: number } {
  const seenSources = new Set(sources.map((s) => normalizeUrl(s.url)).filter(Boolean));
  const kept: FoundJob[] = [];
  const keys = new Set<string>();
  let dropped = 0;
  for (const job of jobs) {
    const url = normalizeUrl(job.url);
    const key = `${normalizeText(job.company)}|${normalizeText(job.title)}`;
    if (!url || !seenSources.has(url)) {
      dropped++;
      continue;
    }
    if (keys.has(url) || keys.has(key)) continue;
    keys.add(url);
    keys.add(key);
    kept.push(job);
  }
  return { jobs: kept, dropped };
}

/** Lower case, unified quotes and dashes, bullet markers removed, whitespace collapsed. */
export function normalizeText(s: string): string {
  return s
    .toLowerCase()
    .replace(/[‘’`]/g, "'")
    .replace(/[“”]/g, '"')
    .replace(/[–—]/g, "-")
    .replace(/^\s*(?:[-*•▪◦]|\d+[.)])\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
}

/** True when `quote` appears in `source` (after normalisation) and is long enough to mean something. */
export function isQuotedFrom(quote: string, source: string): boolean {
  const q = normalizeText(quote).replace(/[.;,]+$/, "");
  return q.length >= 12 && normalizeText(source).includes(q);
}

/**
 * Applies the grounding rules to an analysis:
 * - résumé rewrites must quote a line of the résumé (otherwise they could smuggle in new claims);
 * - lesson and design-question links must exist;
 * - the interview-process note counts as sourced only when web sources were actually read;
 * - the score is clamped to 0..100.
 */
export function groundAnalysis(
  raw: JobAnalysis,
  ctx: { resume: string; lessonSlugs: Set<string>; sdSlugs: Set<string>; hasSources: boolean },
): { analysis: JobAnalysis; droppedRewrites: number } {
  const rewrites = raw.resume.rewrites.filter(
    (r) => isQuotedFrom(r.original, ctx.resume) && normalizeText(r.original) !== normalizeText(r.suggested),
  );
  const unique = <T>(xs: T[]) => [...new Set(xs)];
  const analysis: JobAnalysis = {
    ...raw,
    fit: { ...raw.fit, score: Math.max(0, Math.min(100, Math.round(raw.fit.score))) },
    resume: {
      ...raw.resume,
      rewrites,
      keywordsPresent: unique(raw.resume.keywordsPresent),
      keywordsMissing: unique(raw.resume.keywordsMissing),
    },
    preparation: {
      ...raw.preparation,
      focusAreas: raw.preparation.focusAreas.map((f) => ({
        ...f,
        lessons: unique(f.lessons.filter((l) => ctx.lessonSlugs.has(l))),
        sdQuestions: unique(f.sdQuestions.filter((q) => ctx.sdSlugs.has(q))),
      })),
      processBasis: ctx.hasSources ? raw.preparation.processBasis : "general",
    },
  };
  return { analysis, droppedRewrites: raw.resume.rewrites.length - rewrites.length };
}

const COMPANY_SUFFIX =
  /\b(inc|ltd|llc|plc|gmbh|ag|sa|se|nv|bv|s\.?r\.?o|a\.?s|spol|corp|corporation|company|co|group|holdings?)\b\.?/g;

export function normalizeCompany(name: string): string {
  return name
    .toLowerCase()
    .replace(COMPANY_SUFFIX, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Slug of the InterviewOS company track for a posting's company name, if there is one. */
export function matchCompany(name: string, companies: { slug: string; name: string }[]): string | null {
  const n = normalizeCompany(name);
  if (!n) return null;
  for (const c of companies) {
    const m = normalizeCompany(c.name);
    if (m && (n === m || n.startsWith(`${m} `) || m.startsWith(`${n} `))) return c.slug;
  }
  return null;
}
