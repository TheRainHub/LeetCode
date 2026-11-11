import "server-only";
import { and, desc, eq, sql } from "drizzle-orm";
import { SD_QUESTIONS } from "@content/system-design";
import { db } from "@/lib/db";
import { sdAttempts, sdDrafts } from "@/lib/db/schema";
import { deriveSdStatus, draftChars, type SdStatus } from "@/lib/system-design/status";
import { getCurrentUserId } from "./user";

export function getSdQuestion(slug: string) {
  return SD_QUESTIONS.find((q) => q.slug === slug) ?? null;
}

export interface SdProgress {
  status: SdStatus;
  bestScore: number | null;
  attempts: number;
  interviews: number;
  lastPracticedAt: Date | null;
}

/** Progress for every question, derived from drafts, graded attempts and mock interviews. */
export async function listSdProgress(): Promise<Map<string, SdProgress>> {
  const userId = getCurrentUserId();
  const [drafts, attempts, interviews] = await Promise.all([
    db
      .select({ slug: sdDrafts.questionSlug, sections: sdDrafts.sections })
      .from(sdDrafts)
      .where(eq(sdDrafts.userId, userId)),
    db
      .select({
        slug: sdAttempts.questionSlug,
        best: sql<number>`max(${sdAttempts.score})`,
        count: sql<number>`count(*)::int`,
        last: sql<Date>`max(${sdAttempts.createdAt})`,
      })
      .from(sdAttempts)
      .where(eq(sdAttempts.userId, userId))
      .groupBy(sdAttempts.questionSlug),
    db.execute(sql`
      select m.sd_question_slug as slug,
        count(*) filter (where m.status = 'completed')::int as completed,
        max(e.overall_score) as best,
        max(m.started_at) as last
      from mock_interviews m
      left join interview_evaluations e on e.interview_id = m.id
      where m.user_id = ${userId} and m.sd_question_slug is not null
      group by m.sd_question_slug`) as unknown as Promise<
      { slug: string; completed: number; best: number | null; last: Date | null }[]
    >,
  ]);
  const draftBy = new Map(drafts.map((d) => [d.slug, draftChars(d.sections)]));
  const attemptBy = new Map(attempts.map((a) => [a.slug, a]));
  const interviewBy = new Map(interviews.map((i) => [i.slug, i]));
  const result = new Map<string, SdProgress>();
  for (const q of SD_QUESTIONS) {
    const a = attemptBy.get(q.slug);
    const i = interviewBy.get(q.slug);
    const lastDates = [a?.last, i?.last].filter((d): d is Date => Boolean(d)).map((d) => new Date(d));
    result.set(q.slug, {
      status: deriveSdStatus({
        draftChars: draftBy.get(q.slug) ?? 0,
        bestScore: a ? Number(a.best) : null,
        completedInterviews: i?.completed ?? 0,
        bestInterviewScore: i?.best ?? null,
      }),
      bestScore: a ? Number(a.best) : null,
      attempts: a?.count ?? 0,
      interviews: i?.completed ?? 0,
      lastPracticedAt: lastDates.length ? new Date(Math.max(...lastDates.map((d) => d.getTime()))) : null,
    });
  }
  return result;
}

/** Everything the workspace needs for one question. */
export async function getSdWorkspace(slug: string) {
  const userId = getCurrentUserId();
  const [draft, attempts, interviews] = await Promise.all([
    db
      .select({ sections: sdDrafts.sections, updatedAt: sdDrafts.updatedAt })
      .from(sdDrafts)
      .where(and(eq(sdDrafts.userId, userId), eq(sdDrafts.questionSlug, slug))),
    db
      .select()
      .from(sdAttempts)
      .where(and(eq(sdAttempts.userId, userId), eq(sdAttempts.questionSlug, slug)))
      .orderBy(desc(sdAttempts.createdAt))
      .limit(10),
    db.execute(sql`
      select m.id, m.status, m.started_at, e.overall_score
      from mock_interviews m left join interview_evaluations e on e.interview_id = m.id
      where m.user_id = ${userId} and m.sd_question_slug = ${slug}
      order by m.started_at desc limit 10`) as unknown as Promise<
      { id: number; status: string; started_at: Date; overall_score: number | null }[]
    >,
  ]);
  return {
    draft: draft[0]?.sections ?? {},
    draftUpdatedAt: draft[0]?.updatedAt ?? null,
    attempts,
    interviews: interviews.map((i) => ({
      id: i.id,
      status: i.status,
      startedAt: new Date(i.started_at),
      overallScore: i.overall_score,
    })),
  };
}

export async function saveSdDraft(slug: string, sections: Record<string, string>) {
  const userId = getCurrentUserId();
  await db
    .insert(sdDrafts)
    .values({ userId, questionSlug: slug, sections })
    .onConflictDoUpdate({
      target: [sdDrafts.userId, sdDrafts.questionSlug],
      set: { sections, updatedAt: sql`now()` },
    });
}

export async function saveSdAttempt(input: {
  slug: string;
  checks: boolean[];
  durationSeconds: number;
  gradedBy: "self" | "ai";
  feedback?: string | null;
}) {
  const userId = getCurrentUserId();
  const score = input.checks.length ? input.checks.filter(Boolean).length / input.checks.length : 0;
  const [row] = await db
    .insert(sdAttempts)
    .values({
      userId,
      questionSlug: input.slug,
      rubricChecks: input.checks,
      score,
      durationSeconds: Math.max(0, Math.min(Math.round(input.durationSeconds), 6 * 3600)),
      gradedBy: input.gradedBy,
      feedback: input.feedback ?? null,
    })
    .returning();
  return row!;
}
