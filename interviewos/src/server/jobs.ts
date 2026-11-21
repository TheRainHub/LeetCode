import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { SD_QUESTIONS } from "@content/system-design";
import { db } from "@/lib/db";
import {
  careerProfiles,
  companies,
  jobAnalyses,
  jobPostingEvents,
  jobPostings,
  jobSearches,
  lessons,
  mockInterviews,
  personalProjects,
  starStories,
} from "@/lib/db/schema";
import { matchCompany, normalizeUrl } from "@/lib/jobs/grounding";
import {
  type CareerProfile,
  EMPTY_PROFILE,
  type FoundJob,
  type JobAnalysis,
  type JobSource,
  type JobStatus,
  type PostingInput,
  type SearchCriteria,
  type WebSource,
} from "@/lib/jobs/model";
import { getCurrentUserId } from "./user";

export async function getCareerProfile(): Promise<CareerProfile & { updatedAt: Date | null }> {
  const [row] = await db.select().from(careerProfiles).where(eq(careerProfiles.userId, getCurrentUserId()));
  if (!row) return { ...EMPTY_PROFILE, updatedAt: null };
  const { userId: _u, ...profile } = row;
  return profile;
}

export async function saveCareerProfile(profile: CareerProfile) {
  const userId = getCurrentUserId();
  await db
    .insert(careerProfiles)
    .values({ userId, ...profile })
    .onConflictDoUpdate({ target: careerProfiles.userId, set: { ...profile, updatedAt: new Date() } });
}

/** SHA-256 of the résumé text, to tell whether an analysis used the current version. */
export async function resumeFingerprint(resume: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(resume.trim()));
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function companyTracks() {
  return db.select({ slug: companies.slug, name: companies.name }).from(companies);
}

export async function listPostings() {
  const userId = getCurrentUserId();
  const rows = await db
    .select()
    .from(jobPostings)
    .where(eq(jobPostings.userId, userId))
    .orderBy(desc(jobPostings.updatedAt));
  if (!rows.length) return [];
  const latest = await db.execute(sql`
    select distinct on (posting_id) posting_id, (data->'fit'->>'score')::int as score, data->'fit'->>'verdict' as verdict
    from job_analyses
    where posting_id in (${sql.join(
      rows.map((r) => sql`${r.id}`),
      sql`, `,
    )})
    order by posting_id, created_at desc`);
  const fit = new Map(
    (
      latest as unknown as { posting_id: number; score: number; verdict: JobAnalysis["fit"]["verdict"] }[]
    ).map((r) => [r.posting_id, { score: r.score, verdict: r.verdict }]),
  );
  return rows.map((r) => ({ ...r, fit: fit.get(r.id) ?? null }));
}

export async function getPosting(id: number) {
  const userId = getCurrentUserId();
  const [posting] = await db
    .select()
    .from(jobPostings)
    .where(and(eq(jobPostings.id, id), eq(jobPostings.userId, userId)));
  if (!posting) return null;
  const [events, analyses, interviews] = await Promise.all([
    db
      .select()
      .from(jobPostingEvents)
      .where(eq(jobPostingEvents.postingId, id))
      .orderBy(asc(jobPostingEvents.createdAt), asc(jobPostingEvents.id)),
    db
      .select()
      .from(jobAnalyses)
      .where(eq(jobAnalyses.postingId, id))
      .orderBy(desc(jobAnalyses.createdAt))
      .limit(10),
    db
      .select({ id: mockInterviews.id, status: mockInterviews.status, startedAt: mockInterviews.startedAt })
      .from(mockInterviews)
      .where(and(eq(mockInterviews.userId, userId), eq(mockInterviews.jobPostingId, id)))
      .orderBy(desc(mockInterviews.startedAt))
      .limit(10),
  ]);
  return { posting, events, analyses, interviews };
}

export async function findPostingByUrl(url: string) {
  const key = normalizeUrl(url);
  if (!key) return null;
  const rows = await db
    .select({ id: jobPostings.id, url: jobPostings.url })
    .from(jobPostings)
    .where(eq(jobPostings.userId, getCurrentUserId()));
  return rows.find((r) => r.url && normalizeUrl(r.url) === key) ?? null;
}

export async function createPosting(
  input: PostingInput,
  source: JobSource,
  searchId: number | null = null,
): Promise<number> {
  const userId = getCurrentUserId();
  if (input.url) {
    const existing = await findPostingByUrl(input.url);
    if (existing) return existing.id;
  }
  const companySlug = matchCompany(input.company, await companyTracks());
  const [row] = await db
    .insert(jobPostings)
    .values({ userId, ...input, source, searchId, companySlug, status: "saved" })
    .returning({ id: jobPostings.id });
  await db.insert(jobPostingEvents).values({ postingId: row!.id, status: "saved" });
  return row!.id;
}

export async function updatePosting(id: number, input: PostingInput) {
  const companySlug = matchCompany(input.company, await companyTracks());
  await db
    .update(jobPostings)
    .set({ ...input, companySlug, updatedAt: new Date() })
    .where(and(eq(jobPostings.id, id), eq(jobPostings.userId, getCurrentUserId())));
}

export async function setPostingStatus(id: number, status: JobStatus) {
  const [row] = await db
    .update(jobPostings)
    .set({ status, updatedAt: new Date() })
    .where(and(eq(jobPostings.id, id), eq(jobPostings.userId, getCurrentUserId())))
    .returning({ id: jobPostings.id });
  if (row) await db.insert(jobPostingEvents).values({ postingId: id, status });
}

export async function deletePosting(id: number) {
  await db.delete(jobPostings).where(and(eq(jobPostings.id, id), eq(jobPostings.userId, getCurrentUserId())));
}

export async function saveAnalysis(input: {
  postingId: number;
  data: JobAnalysis;
  sources: WebSource[];
  researched: boolean;
  resumeHash: string;
  droppedRewrites: number;
}) {
  const [row] = await db.insert(jobAnalyses).values(input).returning();
  await db.update(jobPostings).set({ updatedAt: new Date() }).where(eq(jobPostings.id, input.postingId));
  return row!;
}

export async function saveSearch(input: {
  criteria: SearchCriteria;
  results: FoundJob[];
  sources: WebSource[];
  notes: string;
  searches: number;
  dropped: number;
  error: string | null;
}) {
  const [row] = await db
    .insert(jobSearches)
    .values({ userId: getCurrentUserId(), ...input })
    .returning();
  return row!;
}

export async function listSearches(limit = 10) {
  return db
    .select()
    .from(jobSearches)
    .where(eq(jobSearches.userId, getCurrentUserId()))
    .orderBy(desc(jobSearches.createdAt))
    .limit(limit);
}

export async function getSearch(id: number) {
  const [row] = await db
    .select()
    .from(jobSearches)
    .where(and(eq(jobSearches.id, id), eq(jobSearches.userId, getCurrentUserId())));
  return row ?? null;
}

/** Normalised links of postings already saved, to mark search results the user already has. */
export async function savedPostingUrls(): Promise<Map<string, number>> {
  const rows = await db
    .select({ id: jobPostings.id, url: jobPostings.url })
    .from(jobPostings)
    .where(eq(jobPostings.userId, getCurrentUserId()));
  const map = new Map<string, number>();
  for (const r of rows) {
    const key = r.url ? normalizeUrl(r.url) : null;
    if (key) map.set(key, r.id);
  }
  return map;
}

/**
 * Context for the analysis prompt: the user's own projects and STAR stories, and the catalogue of
 * InterviewOS lessons and design questions the preparation plan may link to.
 */
export async function getPreparationContext() {
  const userId = getCurrentUserId();
  const [lessonRows, projects, stories] = await Promise.all([
    db.select({ slug: lessons.slug, title: lessons.title }).from(lessons).orderBy(asc(lessons.slug)),
    db
      .select({
        title: personalProjects.title,
        organization: personalProjects.organization,
        period: personalProjects.period,
        techStack: personalProjects.techStack,
        responsibility: personalProjects.responsibility,
        result: personalProjects.result,
        needsReview: personalProjects.needsReview,
      })
      .from(personalProjects)
      .where(eq(personalProjects.userId, userId)),
    db
      .select({ title: starStories.title, competency: starStories.competency })
      .from(starStories)
      .where(eq(starStories.userId, userId)),
  ]);
  return {
    lessons: lessonRows,
    sdQuestions: SD_QUESTIONS.map((q) => ({ slug: q.slug, title: q.title })),
    projects,
    stories,
  };
}

export async function jobsOverview() {
  const rows = await db
    .select({ status: jobPostings.status, n: sql<number>`count(*)::int` })
    .from(jobPostings)
    .where(eq(jobPostings.userId, getCurrentUserId()))
    .groupBy(jobPostings.status);
  return Object.fromEntries(rows.map((r) => [r.status, r.n])) as Partial<Record<JobStatus, number>>;
}

export async function postingTitles(ids: number[]) {
  if (!ids.length) return new Map<number, string>();
  const rows = await db
    .select({ id: jobPostings.id, title: jobPostings.title, company: jobPostings.company })
    .from(jobPostings)
    .where(and(eq(jobPostings.userId, getCurrentUserId()), inArray(jobPostings.id, ids)));
  return new Map(rows.map((r) => [r.id, `${r.title} — ${r.company}`]));
}
