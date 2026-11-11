import "server-only";
import { and, asc, desc, eq, gt, gte, inArray, sql } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import {
  applications,
  calendarEvents,
  codingAttempts,
  companies,
  companyFocusTopics,
  interviewEvaluations,
  lessonPrerequisites,
  lessons,
  mockInterviews,
  timeEntries,
  topicProgress,
  topics,
} from "@/lib/db/schema";
import { addDays, diffDays, weekday, type ISODate } from "@/lib/dates";
import type { TopicStatus } from "@/lib/mastery/status";
import { estimateReadiness, preparationLevel, type ReadinessEstimate } from "@/lib/readiness";
import { recommendTopics, type Recommendation } from "@/lib/recommend";
import { getCurrentUserId, getSettings, getToday } from "./user";

export interface TopicState {
  id: number;
  slug: string;
  title: string;
  area: string;
  practiceKind: "coding" | "lab" | "conceptual";
  status: TopicStatus;
  priority: number;
  attempts: number;
  correct: number;
  accuracy: number | null;
  confidence: number | null;
  nextReviewOn: string | null;
  lastPracticedAt: Date | null;
  missing: string[];
}

/** Minimum graded results before accuracy is shown for a topic. */
export const MIN_RESULTS_FOR_ACCURACY = 3;

export const getTopicStates = cache(async (): Promise<TopicState[]> => {
  const userId = getCurrentUserId();
  const rows = await db
    .select({
      id: topics.id,
      slug: topics.slug,
      title: topics.title,
      area: topics.area,
      practiceKind: topics.practiceKind,
      status: topicProgress.status,
      priority: topicProgress.priority,
      attempts: topicProgress.attempts,
      correct: topicProgress.correct,
      confidence: topicProgress.confidence,
      nextReviewOn: topicProgress.nextReviewOn,
      lastPracticedAt: topicProgress.lastPracticedAt,
      missing: topicProgress.missing,
    })
    .from(topics)
    .leftJoin(topicProgress, and(eq(topicProgress.topicId, topics.id), eq(topicProgress.userId, userId)))
    .orderBy(asc(topics.title));
  return rows.map((r) => {
    const attempts = r.attempts ?? 0;
    const correct = r.correct ?? 0;
    return {
      id: r.id,
      slug: r.slug,
      title: r.title,
      area: r.area,
      practiceKind: r.practiceKind,
      status: (r.status ?? "not_started") as TopicStatus,
      priority: r.priority ?? 0,
      attempts,
      correct,
      accuracy: attempts >= MIN_RESULTS_FOR_ACCURACY ? correct / attempts : null,
      confidence: r.confidence ?? null,
      nextReviewOn: r.nextReviewOn ?? null,
      lastPracticedAt: r.lastPracticedAt ?? null,
      missing: r.missing ?? ["read", "recognize", "explain", "more_results"],
    };
  });
});

export interface CompanyReadiness {
  id: number;
  slug: string;
  name: string;
  role: string;
  readiness: ReadinessEstimate;
  stage: string | null;
  nextInterview: string | null;
  avgMockScore: number | null;
  mockCount: number;
}

export const getCompanyReadiness = cache(async (): Promise<CompanyReadiness[]> => {
  const userId = getCurrentUserId();
  const today = await getToday();
  const [companyRows, focus, states, apps, events, mocks] = await Promise.all([
    db.select().from(companies).orderBy(asc(companies.order)),
    db.select().from(companyFocusTopics).where(gt(companyFocusTopics.weight, 0)),
    getTopicStates(),
    db
      .select({
        companyId: applications.companyId,
        stage: applications.stage,
        updatedAt: applications.updatedAt,
      })
      .from(applications)
      .where(eq(applications.userId, userId))
      .orderBy(desc(applications.updatedAt)),
    db
      .select({ companyId: calendarEvents.companyId, date: calendarEvents.date })
      .from(calendarEvents)
      .where(
        and(
          eq(calendarEvents.userId, userId),
          eq(calendarEvents.kind, "interview"),
          gte(calendarEvents.date, today),
        ),
      )
      .orderBy(asc(calendarEvents.date)),
    db
      .select({ companyId: mockInterviews.companyId, score: interviewEvaluations.overallScore })
      .from(mockInterviews)
      .innerJoin(interviewEvaluations, eq(interviewEvaluations.interviewId, mockInterviews.id))
      .where(eq(mockInterviews.userId, userId)),
  ]);
  const stateById = new Map(states.map((s) => [s.id, s]));
  return companyRows.map((c) => {
    const f = focus.filter((x) => x.companyId === c.id);
    const readiness = estimateReadiness(
      f.map((x) => ({
        topicId: x.topicId,
        weight: x.weight,
        status: stateById.get(x.topicId)?.status ?? "not_started",
      })),
    );
    const cm = mocks.filter((x) => x.companyId === c.id);
    return {
      id: c.id,
      slug: c.slug,
      name: c.name,
      role: c.role,
      readiness,
      stage: apps.find((a) => a.companyId === c.id)?.stage ?? null,
      nextInterview: events.find((e) => e.companyId === c.id)?.date ?? null,
      avgMockScore: cm.length ? Math.round(cm.reduce((s, x) => s + x.score, 0) / cm.length) : null,
      mockCount: cm.length,
    };
  });
});

export async function getRecommendations(limit = 5): Promise<Recommendation[]> {
  const userId = getCurrentUserId();
  const today = await getToday();
  const [states, prereqs, focus, readiness, lastEval] = await Promise.all([
    getTopicStates(),
    db
      .select({ topicId: lessons.topicId, prereqLessonId: lessonPrerequisites.prerequisiteId })
      .from(lessonPrerequisites)
      .innerJoin(lessons, eq(lessons.id, lessonPrerequisites.lessonId)),
    db.select().from(companyFocusTopics).where(gt(companyFocusTopics.weight, 0)),
    getCompanyReadiness(),
    db
      .select({ topics: interviewEvaluations.recommendedTopics })
      .from(interviewEvaluations)
      .innerJoin(mockInterviews, eq(mockInterviews.id, interviewEvaluations.interviewId))
      .where(eq(mockInterviews.userId, userId))
      .orderBy(desc(interviewEvaluations.createdAt))
      .limit(1),
  ]);
  const lessonTopic = new Map(
    (await db.select({ id: lessons.id, topicId: lessons.topicId }).from(lessons)).map((l) => [
      l.id,
      l.topicId,
    ]),
  );
  const stateById = new Map(states.map((s) => [s.id, s]));
  const slugToId = new Map(states.map((s) => [s.slug, s.id]));
  const focusFor = (companyId: number) =>
    new Map(focus.filter((f) => f.companyId === companyId).map((f) => [f.topicId, f.weight]));

  const prereqMet = (topicId: number) =>
    prereqs
      .filter((p) => p.topicId === topicId)
      .every((p) => {
        const t = lessonTopic.get(p.prereqLessonId);
        return t === undefined || (stateById.get(t)?.status ?? "not_started") !== "not_started";
      });

  const mockTopicIds = new Set<number>(
    (lastEval[0]?.topics ?? [])
      .map((t) => slugToId.get(t.topicSlug))
      .filter((x): x is number => x !== undefined),
  );

  return recommendTopics(
    {
      today,
      topics: states.map((s) => ({
        id: s.id,
        slug: s.slug,
        title: s.title,
        status: s.status,
        priority: s.priority,
        accuracy: s.accuracy,
        nextReviewOn: s.nextReviewOn,
        prerequisitesMet: prereqMet(s.id),
      })),
      upcomingInterviews: readiness
        .filter((r) => r.nextInterview)
        .map((r) => ({ companyName: r.name, date: r.nextInterview!, focus: focusFor(r.id) })),
      activeApplications: readiness
        .filter((r) => r.stage && !["offer", "rejected"].includes(r.stage) && !r.nextInterview)
        .map((r) => ({ companyName: r.name, focus: focusFor(r.id) })),
      mockInterviewTopicIds: mockTopicIds,
    },
    limit,
  );
}

/** Seconds of learning per day over the last `days` days (oldest first). */
export async function getDailyTime(days: number) {
  const userId = getCurrentUserId();
  const today = await getToday();
  const from = addDays(today, -(days - 1));
  const rows = await db
    .select({ date: timeEntries.date, seconds: sql<number>`sum(${timeEntries.seconds})::int` })
    .from(timeEntries)
    .where(and(eq(timeEntries.userId, userId), gte(timeEntries.date, from)))
    .groupBy(timeEntries.date);
  const map = new Map(rows.map((r) => [r.date, r.seconds]));
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { date, seconds: map.get(date) ?? 0 };
  });
}

export const STREAK_MIN_SECONDS = 5 * 60;

/**
 * Consecutive days with at least 5 minutes of logged learning, ending today
 * (or yesterday if today has no activity yet). Rest weekdays and days marked
 * unavailable neither break nor extend the streak.
 */
export async function getStreak(): Promise<{ current: number; activeToday: boolean }> {
  const userId = getCurrentUserId();
  const today = await getToday();
  const settings = await getSettings();
  const daily = await getDailyTime(120);
  const unavailable = new Set(
    (
      await db
        .select({ date: calendarEvents.date })
        .from(calendarEvents)
        .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.kind, "unavailable")))
    ).map((e) => e.date),
  );
  const active = new Set(daily.filter((d) => d.seconds >= STREAK_MIN_SECONDS).map((d) => d.date));
  const excused = (d: ISODate) => settings.restWeekdays.includes(weekday(d)) || unavailable.has(d);
  const activeToday = active.has(today);
  let streak = 0;
  let cursor = activeToday ? today : addDays(today, -1);
  for (let i = 0; i < 120; i++) {
    if (active.has(cursor)) streak++;
    else if (!excused(cursor)) break;
    cursor = addDays(cursor, -1);
  }
  return { current: streak, activeToday };
}

export async function getCodingSummary() {
  const userId = getCurrentUserId();
  const rows = await db
    .select({
      problemId: codingAttempts.problemId,
      outcome: codingAttempts.outcome,
      independence: codingAttempts.independence,
      executionMode: codingAttempts.executionMode,
      durationSeconds: codingAttempts.durationSeconds,
    })
    .from(codingAttempts)
    .where(eq(codingAttempts.userId, userId));
  const solved = new Set(rows.filter((r) => r.outcome === "passed").map((r) => r.problemId));
  const independent = new Set(
    rows
      .filter((r) => r.outcome === "passed" && r.independence === "independent" && r.executionMode !== "none")
      .map((r) => r.problemId),
  );
  const withHelp = new Set(
    rows.filter((r) => r.outcome === "passed" && r.independence !== "independent").map((r) => r.problemId),
  );
  const passed = rows.filter((r) => r.outcome === "passed");
  return {
    attempts: rows.length,
    solved: solved.size,
    solvedIndependently: independent.size,
    solvedWithHelp: withHelp.size,
    avgSolveSeconds: passed.length
      ? Math.round(passed.reduce((s, r) => s + r.durationSeconds, 0) / passed.length)
      : null,
  };
}

export async function getUpcomingEvents(days = 45) {
  const userId = getCurrentUserId();
  const today = await getToday();
  const rows = await db
    .select({
      id: calendarEvents.id,
      kind: calendarEvents.kind,
      title: calendarEvents.title,
      date: calendarEvents.date,
      companyName: companies.name,
    })
    .from(calendarEvents)
    .leftJoin(companies, eq(companies.id, calendarEvents.companyId))
    .where(
      and(
        eq(calendarEvents.userId, userId),
        gte(calendarEvents.date, today),
        sql`${calendarEvents.date} <= ${addDays(today, days)}`,
        inArray(calendarEvents.kind, ["interview", "university", "unavailable"]),
      ),
    )
    .orderBy(asc(calendarEvents.date));
  return rows.map((r) => ({ ...r, inDays: diffDays(today, r.date) }));
}

export async function getOverallLevel() {
  const userId = getCurrentUserId();
  const states = await getTopicStates();
  const evals = await db
    .select({ score: interviewEvaluations.overallScore })
    .from(interviewEvaluations)
    .innerJoin(mockInterviews, eq(mockInterviews.id, interviewEvaluations.interviewId))
    .where(eq(mockInterviews.userId, userId));
  const graded = states.reduce((s, t) => s + t.attempts, 0);
  return {
    level: preparationLevel({
      gradedResults: graded,
      topicsPracticed: states.filter((s) => s.status !== "not_started" && s.status !== "learning").length,
      topicsReady: states.filter((s) => s.status === "interview_ready").length,
      totalTopics: states.length,
      avgInterviewScore: evals.length ? evals.reduce((s, e) => s + e.score, 0) / evals.length : null,
      interviewsCompleted: evals.length,
    }),
    gradedResults: graded,
    counts: {
      not_started: states.filter((s) => s.status === "not_started").length,
      learning: states.filter((s) => s.status === "learning").length,
      practicing: states.filter((s) => s.status === "practicing").length,
      needs_review: states.filter((s) => s.status === "needs_review").length,
      interview_ready: states.filter((s) => s.status === "interview_ready").length,
    } satisfies Record<TopicStatus, number>,
    total: states.length,
  };
}

/** Accuracy per curriculum area, only for areas with enough graded results. */
export async function getAreaAccuracy() {
  const states = await getTopicStates();
  const byArea = new Map<string, { attempts: number; correct: number }>();
  for (const s of states) {
    const a = byArea.get(s.area) ?? { attempts: 0, correct: 0 };
    a.attempts += s.attempts;
    a.correct += s.correct;
    byArea.set(s.area, a);
  }
  return [...byArea.entries()].map(([area, v]) => ({
    area,
    attempts: v.attempts,
    accuracy: v.attempts >= 8 ? v.correct / v.attempts : null,
  }));
}
