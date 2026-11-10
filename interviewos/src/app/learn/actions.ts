"use server";

import { and, eq, inArray } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { exerciseAttempts, exercises, lessonProgress, lessons, topicProgress } from "@/lib/db/schema";
import { EXPLAIN_PASS, QUIZ_PASS, recomputeTopicProgress } from "@/server/mastery";
import { completeMatchingTasks } from "@/server/scheduler";
import { activateTopicCards } from "@/server/srs";
import { logTime } from "@/server/time";
import { getCurrentUserId } from "@/server/user";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues.map((i) => i.message).join("; ") };
  return { ok: false, error: err instanceof Error ? err.message : "Unexpected error" };
}

async function lessonById(lessonId: number) {
  const [l] = await db.select().from(lessons).where(eq(lessons.id, lessonId));
  if (!l) throw new Error("Lesson not found");
  return l;
}

async function upsertProgress(lessonId: number, set: Partial<typeof lessonProgress.$inferInsert>) {
  const userId = getCurrentUserId();
  await db
    .insert(lessonProgress)
    .values({ userId, lessonId, ...set })
    .onConflictDoUpdate({ target: [lessonProgress.userId, lessonProgress.lessonId], set: { ...set, updatedAt: new Date() } });
}

/** A lesson is complete when read, quiz passed, explained in interview mode, and confidence recorded. */
async function refreshCompletion(lessonId: number) {
  const userId = getCurrentUserId();
  const lesson = await lessonById(lessonId);
  const [progress] = await db
    .select()
    .from(lessonProgress)
    .where(and(eq(lessonProgress.userId, userId), eq(lessonProgress.lessonId, lessonId)));
  const ex = await db.select().from(exercises).where(eq(exercises.lessonId, lessonId));
  const attempts = ex.length
    ? await db
        .select()
        .from(exerciseAttempts)
        .where(and(eq(exerciseAttempts.userId, userId), inArray(exerciseAttempts.exerciseId, ex.map((e) => e.id))))
    : [];
  const mcq = ex.filter((e) => e.kind === "mcq");
  const latest = new Map<number, (typeof attempts)[number]>();
  for (const a of attempts.sort((x, y) => y.createdAt.getTime() - x.createdAt.getTime())) {
    if (!latest.has(a.exerciseId)) latest.set(a.exerciseId, a);
  }
  const quizPassed =
    mcq.length > 0 && mcq.every((q) => latest.has(q.id)) && mcq.filter((q) => latest.get(q.id)?.isCorrect).length / mcq.length >= QUIZ_PASS;
  const explainId = ex.find((e) => e.kind === "explain")?.id;
  const explained = attempts.some((a) => a.exerciseId === explainId && a.interviewMode && a.score >= EXPLAIN_PASS);
  const complete = Boolean(progress?.readAt) && quizPassed && explained && progress?.confidence != null;
  if (complete && !progress?.completedAt) {
    await upsertProgress(lessonId, { completedAt: new Date() });
    await completeMatchingTasks("lesson", lesson.slug);
  } else if (!complete && progress?.completedAt) {
    await upsertProgress(lessonId, { completedAt: null });
  }
  return lesson;
}

async function afterEvidence(lessonId: number) {
  const lesson = await refreshCompletion(lessonId);
  await activateTopicCards(lesson.topicId);
  await recomputeTopicProgress([lesson.topicId]);
  revalidatePath("/", "layout");
}

export async function markLessonReadAction(input: { lessonId: number; read: boolean }): Promise<Result> {
  try {
    const { lessonId, read } = z.object({ lessonId: z.number().int().positive(), read: z.boolean() }).parse(input);
    await upsertProgress(lessonId, { readAt: read ? new Date() : null });
    const lesson = await lessonById(lessonId);
    // Reading a lesson completes a plan task that only asks to read it.
    if (read) await completeMatchingTasks("lesson", lesson.slug);
    await afterEvidence(lessonId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export interface QuizFeedback {
  exerciseId: number;
  selected: number;
  correctOption: number;
  isCorrect: boolean;
  explanation: string;
}

export async function submitQuizAction(input: {
  lessonId: number;
  answers: { exerciseId: number; selected: number }[];
  durationSeconds: number;
}): Promise<Result<{ feedback: QuizFeedback[]; correct: number; total: number; passed: boolean }>> {
  try {
    const data = z
      .object({
        lessonId: z.number().int().positive(),
        answers: z.array(z.object({ exerciseId: z.number().int().positive(), selected: z.number().int().min(0).max(10) })).min(1).max(30),
        durationSeconds: z.number().min(0).max(7200),
      })
      .parse(input);
    const userId = getCurrentUserId();
    const qs = await db
      .select()
      .from(exercises)
      .where(and(eq(exercises.lessonId, data.lessonId), eq(exercises.kind, "mcq")));
    if (data.answers.length !== qs.length) throw new Error("Answer every question first.");
    const feedback: QuizFeedback[] = [];
    for (const a of data.answers) {
      const q = qs.find((x) => x.id === a.exerciseId);
      if (!q || q.correctOption === null) throw new Error("Unknown question");
      const isCorrect = a.selected === q.correctOption;
      feedback.push({ exerciseId: q.id, selected: a.selected, correctOption: q.correctOption, isCorrect, explanation: q.explanation ?? "" });
    }
    await db.insert(exerciseAttempts).values(
      feedback.map((f) => ({
        userId,
        exerciseId: f.exerciseId,
        selectedOption: f.selected,
        score: f.isCorrect ? 1 : 0,
        isCorrect: f.isCorrect,
        gradedBy: "auto" as const,
        durationSeconds: Math.round(data.durationSeconds / feedback.length),
      })),
    );
    await logTime("exercise", data.durationSeconds, `quiz:${data.lessonId}`);
    await afterEvidence(data.lessonId);
    const correct = feedback.filter((f) => f.isCorrect).length;
    return { ok: true, data: { feedback, correct, total: feedback.length, passed: correct / feedback.length >= QUIZ_PASS } };
  } catch (e) {
    return fail(e);
  }
}

/** Reveals the rubric and model answer only after the learner has written an answer. */
export async function revealRubricAction(input: { exerciseId: number; response: string }): Promise<Result<{ rubric: string[]; modelAnswer: string }>> {
  try {
    const data = z.object({ exerciseId: z.number().int().positive(), response: z.string().trim().min(40, "Write at least a few sentences first.") }).parse(input);
    const [ex] = await db.select().from(exercises).where(and(eq(exercises.id, data.exerciseId), eq(exercises.kind, "explain")));
    if (!ex) throw new Error("Exercise not found");
    return { ok: true, data: { rubric: ex.rubric ?? [], modelAnswer: ex.modelAnswer ?? "" } };
  } catch (e) {
    return fail(e);
  }
}

export async function saveExplainAttemptAction(input: {
  exerciseId: number;
  response: string;
  rubricChecks: boolean[];
  durationSeconds: number;
  interviewMode: boolean;
  gradedBy: "self" | "ai";
  aiScore?: number;
  feedback?: string;
}): Promise<Result<{ score: number }>> {
  try {
    const data = z
      .object({
        exerciseId: z.number().int().positive(),
        response: z.string().trim().min(40).max(20000),
        rubricChecks: z.array(z.boolean()).max(20),
        durationSeconds: z.number().min(0).max(7200),
        interviewMode: z.boolean(),
        gradedBy: z.enum(["self", "ai"]),
        aiScore: z.number().min(0).max(1).optional(),
        feedback: z.string().max(10000).optional(),
      })
      .parse(input);
    const [ex] = await db.select().from(exercises).where(and(eq(exercises.id, data.exerciseId), eq(exercises.kind, "explain")));
    if (!ex) throw new Error("Exercise not found");
    const size = ex.rubric?.length ?? 0;
    if (data.rubricChecks.length !== size) throw new Error("Rubric mismatch");
    const selfScore = size ? data.rubricChecks.filter(Boolean).length / size : 0;
    const score = data.gradedBy === "ai" && data.aiScore !== undefined ? data.aiScore : selfScore;
    await db.insert(exerciseAttempts).values({
      userId: getCurrentUserId(),
      exerciseId: ex.id,
      responseText: data.response,
      rubricChecks: data.rubricChecks,
      score,
      isCorrect: score >= EXPLAIN_PASS,
      interviewMode: data.interviewMode,
      durationSeconds: Math.round(data.durationSeconds),
      gradedBy: data.gradedBy,
      feedback: data.feedback ?? null,
    });
    await logTime("exercise", data.durationSeconds, `explain:${ex.lessonId}`);
    await afterEvidence(ex.lessonId);
    return { ok: true, data: { score } };
  } catch (e) {
    return fail(e);
  }
}

export async function saveLessonConfidenceAction(input: { lessonId: number; confidence: number }): Promise<Result> {
  try {
    const data = z.object({ lessonId: z.number().int().positive(), confidence: z.number().int().min(1).max(5) }).parse(input);
    await upsertProgress(data.lessonId, { confidence: data.confidence });
    const lesson = await lessonById(data.lessonId);
    await db
      .insert(topicProgress)
      .values({ userId: getCurrentUserId(), topicId: lesson.topicId, confidence: data.confidence })
      .onConflictDoUpdate({ target: [topicProgress.userId, topicProgress.topicId], set: { confidence: data.confidence } });
    await afterEvidence(data.lessonId);
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveLessonNotesAction(input: { lessonId: number; notes: string }): Promise<Result> {
  try {
    const data = z.object({ lessonId: z.number().int().positive(), notes: z.string().max(50000) }).parse(input);
    await upsertProgress(data.lessonId, { notes: data.notes });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
