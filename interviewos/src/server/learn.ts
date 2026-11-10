import "server-only";
import { and, asc, desc, eq, inArray, sql } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  codingAttempts,
  codingProblems,
  exerciseAttempts,
  exercises,
  learningPaths,
  lessonPrerequisites,
  lessonProblems,
  lessonProgress,
  lessons,
  modules,
  topicProgress,
} from "@/lib/db/schema";
import type { TopicStatus } from "@/lib/mastery/status";
import { getCurrentUserId } from "./user";

export async function getPathsOverview() {
  const userId = getCurrentUserId();
  const [paths, lessonRows] = await Promise.all([
    db.select().from(learningPaths).orderBy(asc(learningPaths.order)),
    db
      .select({
        pathId: modules.pathId,
        moduleId: modules.id,
        minutes: lessons.estimatedMinutes,
        status: topicProgress.status,
      })
      .from(lessons)
      .innerJoin(modules, eq(modules.id, lessons.moduleId))
      .leftJoin(topicProgress, and(eq(topicProgress.topicId, lessons.topicId), eq(topicProgress.userId, userId))),
  ]);
  return paths.map((p) => {
    const ls = lessonRows.filter((l) => l.pathId === p.id);
    return {
      ...p,
      lessonCount: ls.length,
      moduleCount: new Set(ls.map((l) => l.moduleId)).size,
      minutes: ls.reduce((s, l) => s + l.minutes, 0),
      ready: ls.filter((l) => l.status === "interview_ready").length,
      practiced: ls.filter((l) => l.status === "practicing" || l.status === "needs_review").length,
      started: ls.filter((l) => l.status && l.status !== "not_started").length,
    };
  });
}

export async function getPath(slug: string) {
  const userId = getCurrentUserId();
  const [path] = await db.select().from(learningPaths).where(eq(learningPaths.slug, slug));
  if (!path) return null;
  const mods = await db.select().from(modules).where(eq(modules.pathId, path.id)).orderBy(asc(modules.order));
  const ls = await db
    .select({
      id: lessons.id,
      slug: lessons.slug,
      title: lessons.title,
      moduleId: lessons.moduleId,
      order: lessons.order,
      minutes: lessons.estimatedMinutes,
      depth: lessons.depth,
      status: topicProgress.status,
      readAt: lessonProgress.readAt,
      completedAt: lessonProgress.completedAt,
    })
    .from(lessons)
    .leftJoin(topicProgress, and(eq(topicProgress.topicId, lessons.topicId), eq(topicProgress.userId, userId)))
    .leftJoin(lessonProgress, and(eq(lessonProgress.lessonId, lessons.id), eq(lessonProgress.userId, userId)))
    .where(inArray(lessons.moduleId, mods.length ? mods.map((m) => m.id) : [-1]))
    .orderBy(asc(lessons.order), asc(lessons.title));
  const prereqs = await db
    .select({ lessonId: lessonPrerequisites.lessonId, title: lessons.title, slug: lessons.slug })
    .from(lessonPrerequisites)
    .innerJoin(lessons, eq(lessons.id, lessonPrerequisites.prerequisiteId))
    .where(inArray(lessonPrerequisites.lessonId, ls.length ? ls.map((l) => l.id) : [-1]));
  return {
    path,
    modules: mods.map((m) => ({
      ...m,
      lessons: ls
        .filter((l) => l.moduleId === m.id)
        .map((l) => ({
          ...l,
          status: (l.status ?? "not_started") as TopicStatus,
          prerequisites: prereqs.filter((p) => p.lessonId === l.id),
        })),
    })),
  };
}

export async function getLessonPage(slug: string) {
  const userId = getCurrentUserId();
  const [row] = await db
    .select({ lesson: lessons, module: modules, path: learningPaths })
    .from(lessons)
    .innerJoin(modules, eq(modules.id, lessons.moduleId))
    .innerJoin(learningPaths, eq(learningPaths.id, modules.pathId))
    .where(eq(lessons.slug, slug));
  if (!row) return null;
  const { lesson } = row;

  const [prereqs, exerciseRows, problems, progressRows, topicRows, attempts, siblings] = await Promise.all([
    db
      .select({ slug: lessons.slug, title: lessons.title, status: topicProgress.status })
      .from(lessonPrerequisites)
      .innerJoin(lessons, eq(lessons.id, lessonPrerequisites.prerequisiteId))
      .leftJoin(topicProgress, and(eq(topicProgress.topicId, lessons.topicId), eq(topicProgress.userId, userId)))
      .where(eq(lessonPrerequisites.lessonId, lesson.id)),
    db.select().from(exercises).where(eq(exercises.lessonId, lesson.id)).orderBy(asc(exercises.order)),
    db
      .select({
        id: codingProblems.id,
        slug: codingProblems.slug,
        title: codingProblems.title,
        difficulty: codingProblems.difficulty,
        solved: sql<boolean>`exists (select 1 from ${codingAttempts} where ${codingAttempts.problemId} = ${codingProblems.id} and ${codingAttempts.userId} = ${userId} and ${codingAttempts.outcome} = 'passed')`,
      })
      .from(lessonProblems)
      .innerJoin(codingProblems, eq(codingProblems.id, lessonProblems.problemId))
      .where(eq(lessonProblems.lessonId, lesson.id)),
    db.select().from(lessonProgress).where(and(eq(lessonProgress.lessonId, lesson.id), eq(lessonProgress.userId, userId))),
    db.select().from(topicProgress).where(and(eq(topicProgress.topicId, lesson.topicId), eq(topicProgress.userId, userId))),
    db
      .select({
        exerciseId: exerciseAttempts.exerciseId,
        selectedOption: exerciseAttempts.selectedOption,
        isCorrect: exerciseAttempts.isCorrect,
        score: exerciseAttempts.score,
        interviewMode: exerciseAttempts.interviewMode,
        createdAt: exerciseAttempts.createdAt,
      })
      .from(exerciseAttempts)
      .innerJoin(exercises, eq(exercises.id, exerciseAttempts.exerciseId))
      .where(and(eq(exerciseAttempts.userId, userId), eq(exercises.lessonId, lesson.id)))
      .orderBy(desc(exerciseAttempts.createdAt)),
    db
      .select({ slug: lessons.slug, title: lessons.title, order: lessons.order })
      .from(lessons)
      .where(eq(lessons.moduleId, lesson.moduleId))
      .orderBy(asc(lessons.order), asc(lessons.title)),
  ]);

  const mcq = exerciseRows.filter((e) => e.kind === "mcq");
  const explain = exerciseRows.find((e) => e.kind === "explain") ?? null;
  const latest = new Map<number, (typeof attempts)[number]>();
  for (const a of attempts) if (!latest.has(a.exerciseId)) latest.set(a.exerciseId, a);
  const quizAnswered = mcq.filter((q) => latest.has(q.id)).length;
  const quizCorrect = mcq.filter((q) => latest.get(q.id)?.isCorrect).length;
  const explainAttempts = explain ? attempts.filter((a) => a.exerciseId === explain.id) : [];
  const bestExplain = explainAttempts.filter((a) => a.interviewMode).reduce((m, a) => Math.max(m, a.score), 0);
  const idx = siblings.findIndex((s) => s.slug === lesson.slug);

  return {
    ...row,
    prerequisites: prereqs.map((p) => ({ ...p, status: (p.status ?? "not_started") as TopicStatus })),
    // Only the question text and options are sent to the client — answers are graded on the server.
    quiz: mcq.map((q) => ({ id: q.id, prompt: q.prompt, options: q.options ?? [] })),
    explain: explain ? { id: explain.id, prompt: explain.prompt, rubricSize: explain.rubric?.length ?? 0 } : null,
    problems,
    progress: progressRows[0] ?? null,
    topic: topicRows[0] ?? null,
    quizState: {
      answered: quizAnswered,
      correct: quizCorrect,
      total: mcq.length,
      passed: mcq.length > 0 && quizAnswered === mcq.length && quizCorrect / mcq.length >= 0.7,
    },
    explainState: { attempts: explainAttempts.length, best: bestExplain, passed: bestExplain >= 0.7 },
    prev: idx > 0 ? siblings[idx - 1]! : null,
    next: idx >= 0 && idx < siblings.length - 1 ? siblings[idx + 1]! : null,
  };
}

export type LessonPageData = NonNullable<Awaited<ReturnType<typeof getLessonPage>>>;
