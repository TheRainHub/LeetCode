import "server-only";
import { and, asc, eq, gte, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  codingAttempts,
  codingProblems,
  interviewEvaluations,
  mockInterviews,
  reviewLogs,
  reviewSchedules,
  timeEntries,
} from "@/lib/db/schema";
import { addDays, startOfWeek } from "@/lib/dates";
import { getCompanyReadiness, getTopicStates, MIN_RESULTS_FOR_ACCURACY } from "./insights";
import { getCurrentUserId, getToday } from "./user";

export const WEEKS = 8;
export const MIN_REVIEWS_PER_WEEK = 5;

export type TimeBucket = "learning" | "coding" | "review" | "other";
const BUCKET: Record<string, TimeBucket> = {
  lesson: "learning",
  exercise: "learning",
  problem: "coding",
  review: "review",
  lab: "other",
  interview: "other",
  experience: "other",
};

export async function getAnalytics() {
  const userId = getCurrentUserId();
  const today = await getToday();
  const firstWeek = addDays(startOfWeek(today), -7 * (WEEKS - 1));
  const weeks = Array.from({ length: WEEKS }, (_, i) => addDays(firstWeek, 7 * i));
  const weekOf = (d: string) => weeks.findLast((w) => w <= d) ?? null;

  const [topics, attempts, times, reviews, interviews, readiness] = await Promise.all([
    getTopicStates(),
    db
      .select({
        problemId: codingAttempts.problemId,
        title: codingProblems.title,
        slug: codingProblems.slug,
        outcome: codingAttempts.outcome,
        independence: codingAttempts.independence,
        executionMode: codingAttempts.executionMode,
        durationSeconds: codingAttempts.durationSeconds,
      })
      .from(codingAttempts)
      .innerJoin(codingProblems, eq(codingProblems.id, codingAttempts.problemId))
      .where(eq(codingAttempts.userId, userId)),
    db
      .select({
        date: timeEntries.date,
        kind: timeEntries.kind,
        seconds: sql<number>`sum(${timeEntries.seconds})::int`,
      })
      .from(timeEntries)
      .where(and(eq(timeEntries.userId, userId), gte(timeEntries.date, firstWeek)))
      .groupBy(timeEntries.date, timeEntries.kind),
    db
      .select({ grade: reviewLogs.grade, at: reviewLogs.reviewedAt })
      .from(reviewLogs)
      .innerJoin(reviewSchedules, eq(reviewSchedules.id, reviewLogs.scheduleId))
      .where(and(eq(reviewSchedules.userId, userId), isNotNull(reviewSchedules.cardId))),
    db
      .select({
        id: mockInterviews.id,
        type: mockInterviews.type,
        endedAt: mockInterviews.endedAt,
        score: interviewEvaluations.overallScore,
      })
      .from(mockInterviews)
      .innerJoin(interviewEvaluations, eq(interviewEvaluations.interviewId, mockInterviews.id))
      .where(eq(mockInterviews.userId, userId))
      .orderBy(asc(mockInterviews.endedAt)),
    getCompanyReadiness(),
  ]);

  // Accuracy by topic (observed): only topics with enough graded results.
  const rated = topics.filter((t) => t.accuracy !== null).sort((a, b) => a.accuracy! - b.accuracy!);
  const insufficient = topics.filter((t) => t.attempts > 0 && t.accuracy === null).length;

  // Coding.
  const passed = attempts.filter((a) => a.outcome === "passed");
  const perProblem = new Map<
    number,
    {
      title: string;
      slug: string;
      seconds: number[];
      best: "independent" | "with_hints" | "with_solution" | null;
    }
  >();
  const rank = { independent: 3, with_hints: 2, with_solution: 1 } as const;
  for (const a of attempts) {
    const e = perProblem.get(a.problemId) ?? { title: a.title, slug: a.slug, seconds: [], best: null };
    if (a.outcome === "passed") {
      e.seconds.push(a.durationSeconds);
      if (!e.best || rank[a.independence] > rank[e.best]) e.best = a.independence;
    }
    perProblem.set(a.problemId, e);
  }
  const problems = [...perProblem.values()].map((p) => ({
    title: p.title,
    slug: p.slug,
    avgSeconds: p.seconds.length ? Math.round(p.seconds.reduce((s, x) => s + x, 0) / p.seconds.length) : null,
    best: p.best,
  }));

  // Weekly time by bucket.
  const weekly = weeks.map((w) => ({ week: w, learning: 0, coding: 0, review: 0, other: 0 }));
  for (const t of times) {
    const w = weekOf(t.date);
    const row = weekly.find((x) => x.week === w);
    if (row) row[BUCKET[t.kind] ?? "other"] += Math.round(t.seconds / 60);
  }

  // Review retention per week (share of card reviews not graded "again").
  const retention = weeks.map((w) => {
    const inWeek = reviews.filter((r) => {
      const d = r.at.toISOString().slice(0, 10);
      return d >= w && d < addDays(w, 7);
    });
    return {
      week: w,
      reviews: inWeek.length,
      retention:
        inWeek.length >= MIN_REVIEWS_PER_WEEK
          ? inWeek.filter((r) => r.grade !== "again").length / inWeek.length
          : null,
    };
  });

  // Confidence vs performance.
  const calibration = topics
    .filter((t) => t.confidence !== null && t.accuracy !== null)
    .map((t) => ({ title: t.title, confidence: t.confidence!, accuracy: Math.round(t.accuracy! * 100) }));

  return {
    minResults: MIN_RESULTS_FOR_ACCURACY,
    accuracy: rated.map((t) => ({
      slug: t.slug,
      title: t.title,
      area: t.area,
      accuracy: t.accuracy!,
      attempts: t.attempts,
    })),
    insufficient,
    coding: {
      attempts: attempts.length,
      avgSeconds: passed.length
        ? Math.round(passed.reduce((s, a) => s + a.durationSeconds, 0) / passed.length)
        : null,
      independent: problems.filter((p) => p.best === "independent").length,
      withHints: problems.filter((p) => p.best === "with_hints").length,
      withSolution: problems.filter((p) => p.best === "with_solution").length,
      problems,
    },
    weekly,
    retention,
    interviews: interviews.map((i) => ({
      id: i.id,
      type: i.type,
      date: (i.endedAt ?? new Date()).toISOString().slice(0, 10),
      score: i.score,
    })),
    calibration,
    readiness: readiness.map((r) => ({
      name: r.name,
      slug: r.slug,
      estimate: r.readiness.estimate,
      coverage: r.readiness.coverage,
      observed: r.avgMockScore,
      mocks: r.mockCount,
    })),
  };
}

export type AnalyticsData = Awaited<ReturnType<typeof getAnalytics>>;
