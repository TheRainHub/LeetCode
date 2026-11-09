"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { reviewCards, reviewSchedules } from "@/lib/db/schema";
import { recomputeTopicProgress } from "@/server/mastery";
import { completeMatchingTasks } from "@/server/scheduler";
import { applyReview, createCard } from "@/server/srs";
import { logTime } from "@/server/time";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (err: unknown): { ok: false; error: string } =>
  err instanceof z.ZodError
    ? { ok: false, error: err.issues.map((i) => i.message).join("; ") }
    : { ok: false, error: err instanceof Error ? err.message : "Unexpected error" };

export async function gradeCardAction(input: { scheduleId: number; grade: "again" | "hard" | "good" | "easy"; elapsedSeconds: number }): Promise<Result<{ intervalDays: number }>> {
  try {
    const data = z
      .object({ scheduleId: z.number().int().positive(), grade: z.enum(["again", "hard", "good", "easy"]), elapsedSeconds: z.number().min(0).max(3600) })
      .parse(input);
    const { schedule, next } = await applyReview(data.scheduleId, data.grade, data.elapsedSeconds);
    await logTime("review", data.elapsedSeconds, `card:${schedule.cardId}`);
    if (schedule.cardId) {
      const [card] = await db.select({ topicId: reviewCards.topicId }).from(reviewCards).where(eq(reviewCards.id, schedule.cardId));
      if (card?.topicId) await recomputeTopicProgress([card.topicId]);
    }
    return { ok: true, data: { intervalDays: next.intervalDays } };
  } catch (e) {
    return fail(e);
  }
}

export async function finishReviewSessionAction(): Promise<Result> {
  await completeMatchingTasks("review", null);
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function addCardAction(input: { prompt: string; answer: string; topicId: number | null }): Promise<Result> {
  try {
    const data = z
      .object({ prompt: z.string().trim().min(3).max(2000), answer: z.string().trim().min(1).max(5000), topicId: z.number().int().positive().nullable() })
      .parse(input);
    await createCard({ ...data, source: "manual", sourceRef: `manual:${Date.now()}` });
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function suspendCardAction(input: { cardId: number; suspended: boolean }): Promise<Result> {
  try {
    const data = z.object({ cardId: z.number().int().positive(), suspended: z.boolean() }).parse(input);
    await db.update(reviewCards).set({ suspended: data.suspended }).where(eq(reviewCards.id, data.cardId));
    const [s] = await db.select({ id: reviewSchedules.id }).from(reviewSchedules).where(eq(reviewSchedules.cardId, data.cardId));
    revalidatePath("/", "layout");
    return s ? { ok: true } : { ok: true };
  } catch (e) {
    return fail(e);
  }
}
