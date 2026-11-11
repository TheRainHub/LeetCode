import "server-only";
import { and, asc, eq, gte, inArray, isNotNull, isNull, lte, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import { calendarEvents, codingProblems, reviewCards, reviewLogs, reviewSchedules } from "@/lib/db/schema";
import { addDays } from "@/lib/dates";
import { INITIAL_SRS_STATE, review, type Grade } from "@/lib/srs/sm2";
import { getCurrentUserId, getToday } from "./user";

/** Next interview date (if any) used to cap intervals so items are reviewed before it. */
export async function nextInterviewDate(): Promise<string | null> {
  const today = await getToday();
  const [row] = await db
    .select({ date: calendarEvents.date })
    .from(calendarEvents)
    .where(
      and(
        eq(calendarEvents.userId, getCurrentUserId()),
        eq(calendarEvents.kind, "interview"),
        gte(calendarEvents.date, today),
      ),
    )
    .orderBy(asc(calendarEvents.date))
    .limit(1);
  return row?.date ?? null;
}

/** Puts a topic's lesson cards into rotation (first review tomorrow). Idempotent. */
export async function activateTopicCards(topicId: number) {
  const userId = getCurrentUserId();
  const today = await getToday();
  const cards = await db
    .select({ id: reviewCards.id })
    .from(reviewCards)
    .where(
      and(eq(reviewCards.userId, userId), eq(reviewCards.topicId, topicId), eq(reviewCards.source, "lesson")),
    );
  if (cards.length === 0) return;
  await db
    .insert(reviewSchedules)
    .values(cards.map((c) => ({ userId, cardId: c.id, dueOn: addDays(today, 1) })))
    .onConflictDoNothing();
}

export async function createCard(input: {
  topicId: number | null;
  prompt: string;
  answer: string;
  source: "manual" | "interview";
  sourceRef?: string;
  dueInDays?: number;
}) {
  const userId = getCurrentUserId();
  const today = await getToday();
  const [card] = await db
    .insert(reviewCards)
    .values({
      userId,
      topicId: input.topicId,
      prompt: input.prompt,
      answer: input.answer,
      source: input.source,
      sourceRef: input.sourceRef,
    })
    .onConflictDoNothing()
    .returning({ id: reviewCards.id });
  if (!card) return null;
  await db
    .insert(reviewSchedules)
    .values({ userId, cardId: card.id, dueOn: addDays(today, input.dueInDays ?? 1) })
    .onConflictDoNothing();
  return card.id;
}

export async function applyReview(scheduleId: number, grade: Grade, elapsedSeconds: number) {
  const userId = getCurrentUserId();
  const today = await getToday();
  const [sched] = await db
    .select()
    .from(reviewSchedules)
    .where(and(eq(reviewSchedules.id, scheduleId), eq(reviewSchedules.userId, userId)));
  if (!sched) throw new Error("Review item not found");
  const next = review(sched, grade, { today, interviewOn: await nextInterviewDate() });
  await db.transaction(async (tx) => {
    await tx
      .update(reviewSchedules)
      .set({
        ease: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        dueOn: next.dueOn,
        lastReviewedAt: new Date(),
      })
      .where(eq(reviewSchedules.id, scheduleId));
    await tx.insert(reviewLogs).values({
      scheduleId,
      grade,
      intervalBefore: sched.intervalDays,
      intervalAfter: next.intervalDays,
      elapsedSeconds: Math.max(0, Math.min(3600, Math.round(elapsedSeconds))),
    });
  });
  return { schedule: sched, next };
}

/** Schedules (or reschedules) re-solving a coding problem after an attempt. */
export async function scheduleProblem(problemId: number, grade: Grade) {
  const userId = getCurrentUserId();
  const today = await getToday();
  const [existing] = await db
    .select()
    .from(reviewSchedules)
    .where(and(eq(reviewSchedules.userId, userId), eq(reviewSchedules.problemId, problemId)));
  const state = existing ?? INITIAL_SRS_STATE;
  const next = review(state, grade, { today, interviewOn: await nextInterviewDate() });
  if (existing) {
    await db
      .update(reviewSchedules)
      .set({
        ease: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        dueOn: next.dueOn,
        lastReviewedAt: new Date(),
      })
      .where(eq(reviewSchedules.id, existing.id));
    await db.insert(reviewLogs).values({
      scheduleId: existing.id,
      grade,
      intervalBefore: existing.intervalDays,
      intervalAfter: next.intervalDays,
    });
  } else {
    const [row] = await db
      .insert(reviewSchedules)
      .values({
        userId,
        problemId,
        ease: next.ease,
        intervalDays: next.intervalDays,
        repetitions: next.repetitions,
        lapses: next.lapses,
        dueOn: next.dueOn,
        lastReviewedAt: new Date(),
      })
      .returning({ id: reviewSchedules.id });
    await db
      .insert(reviewLogs)
      .values({ scheduleId: row!.id, grade, intervalBefore: 0, intervalAfter: next.intervalDays });
  }
  return next;
}

export async function getDueCards(limit = 50) {
  const userId = getCurrentUserId();
  const today = await getToday();
  return db
    .select({
      scheduleId: reviewSchedules.id,
      cardId: reviewCards.id,
      prompt: reviewCards.prompt,
      answer: reviewCards.answer,
      topicId: reviewCards.topicId,
      source: reviewCards.source,
      dueOn: reviewSchedules.dueOn,
      intervalDays: reviewSchedules.intervalDays,
      repetitions: reviewSchedules.repetitions,
    })
    .from(reviewSchedules)
    .innerJoin(reviewCards, eq(reviewCards.id, reviewSchedules.cardId))
    .where(
      and(
        eq(reviewSchedules.userId, userId),
        eq(reviewCards.suspended, false),
        lte(reviewSchedules.dueOn, today),
      ),
    )
    .orderBy(asc(reviewSchedules.dueOn), asc(reviewSchedules.id))
    .limit(limit);
}

export async function getDueProblems() {
  const userId = getCurrentUserId();
  const today = await getToday();
  return db
    .select({
      scheduleId: reviewSchedules.id,
      problemId: codingProblems.id,
      slug: codingProblems.slug,
      title: codingProblems.title,
      difficulty: codingProblems.difficulty,
      dueOn: reviewSchedules.dueOn,
    })
    .from(reviewSchedules)
    .innerJoin(codingProblems, eq(codingProblems.id, reviewSchedules.problemId))
    .where(
      and(
        eq(reviewSchedules.userId, userId),
        isNotNull(reviewSchedules.problemId),
        lte(reviewSchedules.dueOn, today),
      ),
    )
    .orderBy(asc(reviewSchedules.dueOn));
}

/** Counts of card reviews due per day for the next `days` days (index 0 = today incl. overdue). */
export async function getUpcomingReviewCounts(days = 7) {
  const userId = getCurrentUserId();
  const today = await getToday();
  const end = addDays(today, days - 1);
  const rows = await db
    .select({ dueOn: reviewSchedules.dueOn, n: sql<number>`count(*)::int` })
    .from(reviewSchedules)
    .leftJoin(reviewCards, eq(reviewCards.id, reviewSchedules.cardId))
    .where(
      and(
        eq(reviewSchedules.userId, userId),
        lte(reviewSchedules.dueOn, end),
        sql`(${reviewCards.suspended} IS NULL OR ${reviewCards.suspended} = false)`,
      ),
    )
    .groupBy(reviewSchedules.dueOn);
  const out = Array.from({ length: days }, (_, i) => ({ date: addDays(today, i), count: 0 }));
  for (const r of rows) {
    const idx = r.dueOn <= today ? 0 : out.findIndex((o) => o.date === r.dueOn);
    if (idx >= 0) out[idx]!.count += r.n;
  }
  return out;
}

export async function countActiveCards() {
  const userId = getCurrentUserId();
  const [row] = await db
    .select({ n: sql<number>`count(*)::int` })
    .from(reviewSchedules)
    .where(and(eq(reviewSchedules.userId, userId), isNull(reviewSchedules.problemId)));
  return row?.n ?? 0;
}

export async function suspendCards(cardIds: number[], suspended: boolean) {
  if (cardIds.length === 0) return;
  await db
    .update(reviewCards)
    .set({ suspended })
    .where(and(eq(reviewCards.userId, getCurrentUserId()), inArray(reviewCards.id, cardIds)));
}
