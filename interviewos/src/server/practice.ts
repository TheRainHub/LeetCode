import "server-only";
import { and, asc, desc, eq, inArray } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  codeDrafts,
  codingAttempts,
  codingProblems,
  customTestCases,
  problemNotes,
  problemTags,
  reviewSchedules,
} from "@/lib/db/schema";
import type { Language } from "@/lib/content/types";
import { getCurrentUserId } from "./user";

export type ProblemProgress = "none" | "attempted" | "with_help" | "independent";

export async function listProblems() {
  const userId = getCurrentUserId();
  const [problems, tags, attempts, schedules] = await Promise.all([
    db
      .select({
        id: codingProblems.id,
        slug: codingProblems.slug,
        title: codingProblems.title,
        difficulty: codingProblems.difficulty,
        pattern: codingProblems.pattern,
        summary: codingProblems.summary,
        order: codingProblems.order,
      })
      .from(codingProblems)
      .orderBy(asc(codingProblems.order)),
    db.select().from(problemTags),
    db
      .select({
        problemId: codingAttempts.problemId,
        outcome: codingAttempts.outcome,
        independence: codingAttempts.independence,
        executionMode: codingAttempts.executionMode,
        createdAt: codingAttempts.createdAt,
      })
      .from(codingAttempts)
      .where(eq(codingAttempts.userId, userId))
      .orderBy(desc(codingAttempts.createdAt)),
    db
      .select({ problemId: reviewSchedules.problemId, dueOn: reviewSchedules.dueOn })
      .from(reviewSchedules)
      .where(eq(reviewSchedules.userId, userId)),
  ]);
  return problems.map((p) => {
    const mine = attempts.filter((a) => a.problemId === p.id);
    let progress: ProblemProgress = mine.length ? "attempted" : "none";
    if (mine.some((a) => a.outcome === "passed")) progress = "with_help";
    if (
      mine.some(
        (a) => a.outcome === "passed" && a.independence === "independent" && a.executionMode !== "none",
      )
    )
      progress = "independent";
    return {
      ...p,
      tags: tags.filter((t) => t.problemId === p.id).map((t) => t.tag),
      progress,
      attempts: mine.length,
      lastAttemptAt: mine[0]?.createdAt ?? null,
      dueOn: schedules.find((s) => s.problemId === p.id)?.dueOn ?? null,
    };
  });
}

export async function getWorkspace(slug: string) {
  const userId = getCurrentUserId();
  const [problem] = await db.select().from(codingProblems).where(eq(codingProblems.slug, slug));
  if (!problem) return null;
  const [drafts, notes, custom, attempts, tags, schedule] = await Promise.all([
    db
      .select()
      .from(codeDrafts)
      .where(and(eq(codeDrafts.userId, userId), eq(codeDrafts.problemId, problem.id))),
    db
      .select()
      .from(problemNotes)
      .where(and(eq(problemNotes.userId, userId), eq(problemNotes.problemId, problem.id))),
    db
      .select()
      .from(customTestCases)
      .where(and(eq(customTestCases.userId, userId), eq(customTestCases.problemId, problem.id)))
      .orderBy(asc(customTestCases.id)),
    db
      .select()
      .from(codingAttempts)
      .where(and(eq(codingAttempts.userId, userId), eq(codingAttempts.problemId, problem.id)))
      .orderBy(desc(codingAttempts.createdAt)),
    db.select({ tag: problemTags.tag }).from(problemTags).where(eq(problemTags.problemId, problem.id)),
    db
      .select({ dueOn: reviewSchedules.dueOn })
      .from(reviewSchedules)
      .where(and(eq(reviewSchedules.userId, userId), eq(reviewSchedules.problemId, problem.id))),
  ]);
  const draftByLang = Object.fromEntries(drafts.map((d) => [d.language, d.code])) as Partial<
    Record<Language, string>
  >;
  return {
    // Hints, approach and reference solutions are deliberately NOT included; they are fetched on demand.
    problem: {
      id: problem.id,
      slug: problem.slug,
      title: problem.title,
      difficulty: problem.difficulty,
      pattern: problem.pattern,
      statement: problem.statement,
      constraints: problem.constraints,
      examples: problem.examples,
      edgeCases: problem.edgeCases,
      hintCount: problem.hints.length,
      signature: problem.signature,
      comparator: problem.comparator,
      starterCode: problem.starterCode,
      tests: problem.tests,
      externalLinks: problem.externalLinks,
      tags: tags.map((t) => t.tag),
    },
    drafts: draftByLang,
    notes: notes[0]?.notes ?? "",
    customTests: custom.map((c) => ({ id: c.id, name: c.name, args: c.args, expected: c.expected })),
    attempts: attempts.map((a) => ({
      id: a.id,
      language: a.language,
      code: a.code,
      outcome: a.outcome,
      executionMode: a.executionMode,
      testsPassed: a.testsPassed,
      testsTotal: a.testsTotal,
      durationSeconds: a.durationSeconds,
      hintsUsed: a.hintsUsed,
      independence: a.independence,
      claimedTime: a.claimedTime,
      claimedSpace: a.claimedSpace,
      timeCorrect: a.timeCorrect,
      spaceCorrect: a.spaceCorrect,
      reflection: a.reflection,
      confidence: a.confidence,
      createdAt: a.createdAt.toISOString(),
    })),
    dueOn: schedule[0]?.dueOn ?? null,
    hasSubmitted: attempts.length > 0,
  };
}

export type WorkspaceData = NonNullable<Awaited<ReturnType<typeof getWorkspace>>>;

export async function getSolution(problemId: number) {
  const [p] = await db
    .select({
      approach: codingProblems.approach,
      solutionCode: codingProblems.solutionCode,
      expectedTime: codingProblems.expectedTime,
      expectedSpace: codingProblems.expectedSpace,
      complexityNotes: codingProblems.complexityNotes,
      commonMistakes: codingProblems.commonMistakes,
    })
    .from(codingProblems)
    .where(eq(codingProblems.id, problemId));
  return p ?? null;
}

export async function problemTopicIds(problemId: number): Promise<number[]> {
  const { problemTopics } = await import("@/lib/db/schema");
  const rows = await db
    .select({ topicId: problemTopics.topicId })
    .from(problemTopics)
    .where(eq(problemTopics.problemId, problemId));
  return rows.map((r) => r.topicId);
}

export async function problemsByIds(ids: number[]) {
  if (!ids.length) return [];
  return db
    .select({ id: codingProblems.id, slug: codingProblems.slug, title: codingProblems.title })
    .from(codingProblems)
    .where(inArray(codingProblems.id, ids));
}
