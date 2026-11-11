"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { labAttempts, labTopics, practicalLabs } from "@/lib/db/schema";
import { checkStepEvidence, MIN_REFLECTION_CHARS } from "@/lib/labs";
import { recomputeTopicProgress } from "@/server/mastery";
import { completeMatchingTasks } from "@/server/scheduler";
import { logTime } from "@/server/time";
import { getCurrentUserId } from "@/server/user";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (err: unknown): { ok: false; error: string } =>
  err instanceof z.ZodError
    ? { ok: false, error: err.issues.map((i) => i.message).join("; ") }
    : { ok: false, error: err instanceof Error ? err.message : "Unexpected error" };

async function ownAttempt(attemptId: number) {
  const [a] = await db
    .select()
    .from(labAttempts)
    .where(and(eq(labAttempts.id, attemptId), eq(labAttempts.userId, getCurrentUserId())));
  if (!a) throw new Error("Lab attempt not found");
  const [lab] = await db.select().from(practicalLabs).where(eq(practicalLabs.id, a.labId));
  return { attempt: a, lab: lab! };
}

export async function startLabAction(input: { labId: number }): Promise<Result<{ attemptId: number }>> {
  try {
    const { labId } = z.object({ labId: z.number().int().positive() }).parse(input);
    const [row] = await db
      .insert(labAttempts)
      .values({ userId: getCurrentUserId(), labId })
      .returning({ id: labAttempts.id });
    revalidatePath("/practice", "layout");
    return { ok: true, data: { attemptId: row!.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function saveStepEvidenceAction(input: {
  attemptId: number;
  stepId: string;
  text?: string;
  checked?: boolean;
}): Promise<Result<{ passed: boolean; reason?: string }>> {
  try {
    const data = z
      .object({
        attemptId: z.number().int().positive(),
        stepId: z.string().max(80),
        text: z.string().max(100_000).optional(),
        checked: z.boolean().optional(),
      })
      .parse(input);
    const { attempt, lab } = await ownAttempt(data.attemptId);
    if (attempt.status === "verified")
      throw new Error("This attempt is already verified. Start a new attempt to redo it.");
    const step = lab.steps.find((s) => s.id === data.stepId);
    if (!step) throw new Error("Unknown step");
    const check = checkStepEvidence(step, data);
    await db
      .update(labAttempts)
      .set({
        stepEvidence: {
          ...attempt.stepEvidence,
          [step.id]: { text: data.text, checked: data.checked, passed: check.passed },
        },
        updatedAt: new Date(),
      })
      .where(eq(labAttempts.id, attempt.id));
    revalidatePath(`/practice/labs/${lab.slug}`);
    return { ok: true, data: { passed: check.passed, reason: check.reason } };
  } catch (e) {
    return fail(e);
  }
}

export async function saveReflectionsAction(input: {
  attemptId: number;
  reflections: string[];
  minutesSpent: number;
}): Promise<Result> {
  try {
    const data = z
      .object({
        attemptId: z.number().int().positive(),
        reflections: z.array(z.string().max(20_000)).max(20),
        minutesSpent: z.number().int().min(0).max(1000),
      })
      .parse(input);
    const { attempt } = await ownAttempt(data.attemptId);
    await db
      .update(labAttempts)
      .set({ reflections: data.reflections, minutesSpent: data.minutesSpent, updatedAt: new Date() })
      .where(eq(labAttempts.id, attempt.id));
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

/** Marks the lab verified only if every step has accepted evidence and every reflection is answered. */
export async function verifyLabAction(input: { attemptId: number }): Promise<Result> {
  try {
    const { attemptId } = z.object({ attemptId: z.number().int().positive() }).parse(input);
    const { attempt, lab } = await ownAttempt(attemptId);
    const allSteps = lab.steps.every((s) => attempt.stepEvidence[s.id]?.passed);
    const allReflections =
      lab.reflectionQuestions.length === attempt.reflections.length &&
      attempt.reflections.every((r) => r.trim().length >= MIN_REFLECTION_CHARS);
    if (!allSteps || !allReflections) throw new Error("Complete every step and reflection question first.");
    await db
      .update(labAttempts)
      .set({ status: "verified", verifiedAt: new Date(), updatedAt: new Date() })
      .where(eq(labAttempts.id, attempt.id));
    if (attempt.minutesSpent > 0) await logTime("lab", attempt.minutesSpent * 60, lab.slug);
    const topicIds = (
      await db.select({ topicId: labTopics.topicId }).from(labTopics).where(eq(labTopics.labId, lab.id))
    ).map((t) => t.topicId);
    await recomputeTopicProgress(topicIds);
    await completeMatchingTasks("lab", lab.slug);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
