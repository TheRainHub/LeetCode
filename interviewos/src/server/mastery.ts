import "server-only";
import { and, eq, inArray, isNotNull, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  codingAttempts,
  exerciseAttempts,
  exercises,
  interviewTopics,
  labAttempts,
  labTopics,
  lessonProgress,
  lessons,
  mockInterviews,
  problemTopics,
  reviewCards,
  reviewLogs,
  reviewSchedules,
  topicProgress,
  topics,
} from "@/lib/db/schema";
import { deriveTopicStatus, type TopicEvidence, type TopicStatus } from "@/lib/mastery/status";
import { getCurrentUserId, getToday } from "./user";

export const QUIZ_PASS = 0.7;
export const EXPLAIN_PASS = 0.7;

interface Event {
  at: Date;
  correct: boolean;
}

/**
 * Recomputes the derived `topic_progress` rows from source evidence.
 * Pass topic ids to limit the work; omit to recompute everything.
 * User-owned columns (priority, confidence) are preserved.
 */
export async function recomputeTopicProgress(topicIds?: number[]): Promise<void> {
  const userId = getCurrentUserId();
  const today = await getToday();
  const topicFilter = topicIds && topicIds.length > 0 ? topicIds : null;
  if (topicIds && topicIds.length === 0) return;

  const topicRows = await db
    .select({ id: topics.id, practiceKind: topics.practiceKind })
    .from(topics)
    .where(topicFilter ? inArray(topics.id, topicFilter) : undefined);
  if (topicRows.length === 0) return;
  const ids = topicRows.map((t) => t.id);

  const [reads, exAttempts, quizCounts, coding, labs, labExists, reviews, schedules, interviews] = await Promise.all([
    db
      .select({ topicId: lessons.topicId, readAt: lessonProgress.readAt })
      .from(lessonProgress)
      .innerJoin(lessons, eq(lessons.id, lessonProgress.lessonId))
      .where(and(eq(lessonProgress.userId, userId), isNotNull(lessonProgress.readAt), inArray(lessons.topicId, ids))),
    db
      .select({
        topicId: lessons.topicId,
        lessonId: lessons.id,
        exerciseId: exerciseAttempts.exerciseId,
        kind: exercises.kind,
        score: exerciseAttempts.score,
        isCorrect: exerciseAttempts.isCorrect,
        interviewMode: exerciseAttempts.interviewMode,
        createdAt: exerciseAttempts.createdAt,
      })
      .from(exerciseAttempts)
      .innerJoin(exercises, eq(exercises.id, exerciseAttempts.exerciseId))
      .innerJoin(lessons, eq(lessons.id, exercises.lessonId))
      .where(and(eq(exerciseAttempts.userId, userId), inArray(lessons.topicId, ids))),
    db
      .select({ lessonId: exercises.lessonId, n: sql<number>`count(*)::int` })
      .from(exercises)
      .where(eq(exercises.kind, "mcq"))
      .groupBy(exercises.lessonId),
    db
      .select({
        topicId: problemTopics.topicId,
        outcome: codingAttempts.outcome,
        independence: codingAttempts.independence,
        executionMode: codingAttempts.executionMode,
        hintsUsed: codingAttempts.hintsUsed,
        durationSeconds: codingAttempts.durationSeconds,
        createdAt: codingAttempts.createdAt,
      })
      .from(codingAttempts)
      .innerJoin(problemTopics, eq(problemTopics.problemId, codingAttempts.problemId))
      .where(and(eq(codingAttempts.userId, userId), inArray(problemTopics.topicId, ids))),
    db
      .select({ topicId: labTopics.topicId, verifiedAt: labAttempts.verifiedAt })
      .from(labAttempts)
      .innerJoin(labTopics, eq(labTopics.labId, labAttempts.labId))
      .where(and(eq(labAttempts.userId, userId), eq(labAttempts.status, "verified"), inArray(labTopics.topicId, ids))),
    db.select({ topicId: labTopics.topicId }).from(labTopics).where(inArray(labTopics.topicId, ids)),
    db
      .select({ topicId: reviewCards.topicId, grade: reviewLogs.grade, at: reviewLogs.reviewedAt })
      .from(reviewLogs)
      .innerJoin(reviewSchedules, eq(reviewSchedules.id, reviewLogs.scheduleId))
      .innerJoin(reviewCards, eq(reviewCards.id, reviewSchedules.cardId))
      .where(and(eq(reviewSchedules.userId, userId), inArray(reviewCards.topicId, ids))),
    db
      .select({ topicId: reviewCards.topicId, dueOn: reviewSchedules.dueOn })
      .from(reviewSchedules)
      .innerJoin(reviewCards, eq(reviewCards.id, reviewSchedules.cardId))
      .where(and(eq(reviewSchedules.userId, userId), eq(reviewCards.suspended, false), inArray(reviewCards.topicId, ids))),
    db
      .select({ topicId: interviewTopics.topicId, score: interviewTopics.score, at: mockInterviews.endedAt })
      .from(interviewTopics)
      .innerJoin(mockInterviews, eq(mockInterviews.id, interviewTopics.interviewId))
      .where(and(eq(mockInterviews.userId, userId), inArray(interviewTopics.topicId, ids))),
  ]);

  const quizSize = new Map(quizCounts.map((q) => [q.lessonId, q.n]));
  const hasLab = new Set(labExists.map((l) => l.topicId));

  const rows = topicRows.map((t) => {
    const events: Event[] = [];
    let readAt: Date | null = null;
    for (const r of reads) if (r.topicId === t.id && r.readAt && (!readAt || r.readAt > readAt)) readAt = r.readAt;

    // Quiz: latest answer per question; recognized when every question has an answer and ≥ 70% are correct.
    let recognizedAt: Date | null = null;
    let explainedAt: Date | null = null;
    const latestByExercise = new Map<number, { correct: boolean; at: Date; lessonId: number }>();
    for (const a of exAttempts) {
      if (a.topicId !== t.id) continue;
      if (a.kind === "mcq") {
        events.push({ at: a.createdAt, correct: a.isCorrect });
        const prev = latestByExercise.get(a.exerciseId);
        if (!prev || a.createdAt > prev.at) latestByExercise.set(a.exerciseId, { correct: a.isCorrect, at: a.createdAt, lessonId: a.lessonId });
      } else {
        const passed = a.score >= EXPLAIN_PASS;
        events.push({ at: a.createdAt, correct: passed });
        if (passed && a.interviewMode && (!explainedAt || a.createdAt > explainedAt)) explainedAt = a.createdAt;
      }
    }
    const perLesson = new Map<number, { answered: number; correct: number; last: Date }>();
    for (const v of latestByExercise.values()) {
      const agg = perLesson.get(v.lessonId) ?? { answered: 0, correct: 0, last: v.at };
      agg.answered++;
      if (v.correct) agg.correct++;
      if (v.at > agg.last) agg.last = v.at;
      perLesson.set(v.lessonId, agg);
    }
    for (const [lessonId, agg] of perLesson) {
      const size = quizSize.get(lessonId) ?? 0;
      if (size > 0 && agg.answered >= size && agg.correct / size >= QUIZ_PASS) {
        if (!recognizedAt || agg.last > recognizedAt) recognizedAt = agg.last;
      }
    }

    // Review cards count as recognition evidence once there are a few successful recalls.
    const topicReviews = reviews.filter((r) => r.topicId === t.id);
    for (const r of topicReviews) events.push({ at: r.at, correct: r.grade !== "again" });
    const goodReviews = topicReviews.filter((r) => r.grade === "good" || r.grade === "easy");
    if (!recognizedAt && topicReviews.length >= 3 && goodReviews.length / topicReviews.length >= QUIZ_PASS) {
      recognizedAt = goodReviews.reduce<Date | null>((m, r) => (!m || r.at > m ? r.at : m), null);
    }

    let implementedAt: Date | null = null;
    let hints = 0;
    let solveTotal = 0;
    let solveCount = 0;
    for (const c of coding) {
      if (c.topicId !== t.id) continue;
      hints += c.hintsUsed;
      const executed = c.executionMode !== "none";
      const correct = c.outcome === "passed" && c.independence !== "with_solution";
      events.push({ at: c.createdAt, correct });
      if (c.outcome === "passed") {
        solveTotal += c.durationSeconds;
        solveCount++;
      }
      if (c.outcome === "passed" && c.independence === "independent" && executed && (!implementedAt || c.createdAt > implementedAt)) {
        implementedAt = c.createdAt;
      }
    }

    let labVerifiedAt: Date | null = null;
    for (const l of labs) if (l.topicId === t.id && l.verifiedAt && (!labVerifiedAt || l.verifiedAt > labVerifiedAt)) labVerifiedAt = l.verifiedAt;

    for (const iv of interviews) {
      if (iv.topicId !== t.id || !iv.at) continue;
      events.push({ at: iv.at, correct: iv.score >= 0.6 });
      if (iv.score >= EXPLAIN_PASS && (!explainedAt || iv.at > explainedAt)) explainedAt = iv.at;
    }

    const due = schedules.filter((s) => s.topicId === t.id).map((s) => s.dueOn);
    const overdue = due.filter((d) => d < today).length;
    const nextReviewOn = due.length ? due.reduce((a, b) => (a < b ? a : b)) : null;

    events.sort((a, b) => b.at.getTime() - a.at.getTime());
    const evidence: TopicEvidence = {
      practiceKind: t.practiceKind,
      read: readAt !== null,
      recognized: recognizedAt !== null,
      implemented: implementedAt !== null,
      explained: explainedAt !== null,
      labVerified: labVerifiedAt !== null,
      hasLab: hasLab.has(t.id),
      recentResults: events.map((e) => e.correct),
      anyAttempt: events.length > 0,
      overdueReviews: overdue,
    };
    const { status, missing } = deriveTopicStatus(evidence);
    const correct = events.filter((e) => e.correct).length;
    const lastPracticedAt = events[0]?.at ?? readAt;

    return {
      userId,
      topicId: t.id,
      status: status as TopicStatus,
      readAt,
      recognizedAt,
      implementedAt,
      explainedAt,
      labVerifiedAt,
      lastPracticedAt,
      attempts: events.length,
      correct,
      incorrect: events.length - correct,
      hintsUsed: hints,
      avgSolveSeconds: solveCount ? Math.round(solveTotal / solveCount) : null,
      nextReviewOn,
      missing: missing as string[],
      updatedAt: new Date(),
    };
  });

  for (const row of rows) {
    const { userId: _u, topicId: _t, ...derived } = row;
    await db
      .insert(topicProgress)
      .values(row)
      .onConflictDoUpdate({ target: [topicProgress.userId, topicProgress.topicId], set: derived });
  }
}

/** Evidence detail for one topic, used to explain the status in the UI. */
export async function getTopicEvidence(topicId: number) {
  const userId = getCurrentUserId();
  const [row] = await db
    .select()
    .from(topicProgress)
    .where(and(eq(topicProgress.userId, userId), eq(topicProgress.topicId, topicId)));
  return row ?? null;
}
