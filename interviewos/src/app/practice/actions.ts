"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { parseHarnessOutput } from "@/lib/code-runner/harness";
import { complexityMatches } from "@/lib/complexity";
import { db } from "@/lib/db";
import { codeDrafts, codingAttempts, codingProblems, customTestCases, problemNotes, type StoredTestResult } from "@/lib/db/schema";
import { gradeFromCodingAttempt } from "@/lib/srs/sm2";
import { recomputeTopicProgress } from "@/server/mastery";
import { getSolution, problemTopicIds } from "@/server/practice";
import { completeMatchingTasks } from "@/server/scheduler";
import { scheduleProblem } from "@/server/srs";
import { logTime } from "@/server/time";
import { getCurrentUserId } from "@/server/user";

type Result<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };
const fail = (err: unknown): { ok: false; error: string } =>
  err instanceof z.ZodError
    ? { ok: false, error: err.issues.map((i) => i.message).join("; ") }
    : { ok: false, error: err instanceof Error ? err.message : "Unexpected error" };

const language = z.enum(["java", "typescript", "python"]);
const id = z.number().int().positive();

export async function saveDraftAction(input: { problemId: number; language: string; code: string }): Promise<Result> {
  try {
    const data = z.object({ problemId: id, language, code: z.string().max(100_000) }).parse(input);
    await db
      .insert(codeDrafts)
      .values({ userId: getCurrentUserId(), ...data })
      .onConflictDoUpdate({
        target: [codeDrafts.userId, codeDrafts.problemId, codeDrafts.language],
        set: { code: data.code, updatedAt: new Date() },
      });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function saveProblemNotesAction(input: { problemId: number; notes: string }): Promise<Result> {
  try {
    const data = z.object({ problemId: id, notes: z.string().max(50_000) }).parse(input);
    await db
      .insert(problemNotes)
      .values({ userId: getCurrentUserId(), ...data })
      .onConflictDoUpdate({ target: [problemNotes.userId, problemNotes.problemId], set: { notes: data.notes, updatedAt: new Date() } });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function getHintAction(input: { problemId: number; index: number }): Promise<Result<{ hint: string }>> {
  try {
    const data = z.object({ problemId: id, index: z.number().int().min(0).max(20) }).parse(input);
    const [p] = await db.select({ hints: codingProblems.hints }).from(codingProblems).where(eq(codingProblems.id, data.problemId));
    const hint = p?.hints[data.index];
    if (!hint) throw new Error("No such hint");
    return { ok: true, data: { hint } };
  } catch (e) {
    return fail(e);
  }
}

export async function getSolutionAction(input: { problemId: number }): Promise<Result<NonNullable<Awaited<ReturnType<typeof getSolution>>>>> {
  try {
    const { problemId } = z.object({ problemId: id }).parse(input);
    const s = await getSolution(problemId);
    if (!s) throw new Error("Problem not found");
    return { ok: true, data: s };
  } catch (e) {
    return fail(e);
  }
}

const jsonValue: z.ZodType<unknown> = z.unknown();

export async function addCustomTestAction(input: { problemId: number; name: string; args: unknown[]; expected: unknown }): Promise<Result<{ id: number }>> {
  try {
    const data = z
      .object({ problemId: id, name: z.string().trim().min(1).max(80), args: z.array(jsonValue).max(10), expected: jsonValue })
      .parse(input);
    const size = JSON.stringify(data.args).length + JSON.stringify(data.expected).length;
    if (size > 50_000) throw new Error("Test case too large");
    const [p] = await db.select({ signature: codingProblems.signature, slug: codingProblems.slug }).from(codingProblems).where(eq(codingProblems.id, data.problemId));
    if (!p) throw new Error("Problem not found");
    if (data.args.length !== p.signature.params.length) {
      throw new Error(`Expected ${p.signature.params.length} argument(s): ${p.signature.params.map((x) => `${x.name}: ${x.type}`).join(", ")}`);
    }
    const [row] = await db
      .insert(customTestCases)
      .values({ userId: getCurrentUserId(), problemId: data.problemId, name: data.name, args: data.args, expected: data.expected })
      .returning({ id: customTestCases.id });
    revalidatePath(`/practice/problems/${p.slug}`);
    return { ok: true, data: { id: row!.id } };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteCustomTestAction(input: { id: number }): Promise<Result> {
  try {
    const data = z.object({ id }).parse(input);
    await db.delete(customTestCases).where(and(eq(customTestCases.id, data.id), eq(customTestCases.userId, getCurrentUserId())));
    revalidatePath("/practice", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const testResult = z.object({
  name: z.string().max(200),
  passed: z.boolean(),
  actual: z.string().max(20_000).optional(),
  expected: z.string().max(20_000).optional(),
  error: z.string().max(5_000).optional(),
  durationMs: z.number().optional(),
});

const attemptSchema = z.object({
  problemId: id,
  language,
  code: z.string().min(1).max(100_000),
  durationSeconds: z.number().int().min(0).max(24 * 3600),
  hintsUsed: z.number().int().min(0).max(20),
  viewedSolution: z.boolean(),
  execution: z.discriminatedUnion("mode", [
    z.object({ mode: z.literal("browser"), results: z.array(testResult).max(200) }),
    z.object({ mode: z.literal("local"), output: z.string().max(200_000), testNames: z.array(z.string()).max(200) }),
    z.object({ mode: z.literal("none") }),
  ]),
  claimedTime: z.string().trim().min(1).max(60),
  claimedSpace: z.string().trim().min(1).max(60),
  reflection: z.string().max(10_000),
  confidence: z.number().int().min(1).max(5),
});

export interface AttemptReview {
  attemptId: number;
  outcome: "passed" | "partial" | "failed" | "not_run";
  executionMode: "browser" | "local" | "none";
  independence: "independent" | "with_hints" | "with_solution";
  testsPassed: number;
  testsTotal: number;
  timeCorrect: boolean;
  spaceCorrect: boolean;
  expectedTime: string;
  expectedSpace: string;
  complexityNotes: string;
  nextReviewOn: string;
}

export async function recordAttemptAction(input: z.input<typeof attemptSchema>): Promise<Result<AttemptReview>> {
  try {
    const data = attemptSchema.parse(input);
    const [problem] = await db.select().from(codingProblems).where(eq(codingProblems.id, data.problemId));
    if (!problem) throw new Error("Problem not found");

    let results: StoredTestResult[] = [];
    if (data.execution.mode === "browser") {
      if (data.language !== "typescript") throw new Error("Browser execution is only available for TypeScript");
      results = data.execution.results;
    } else if (data.execution.mode === "local") {
      const parsed = parseHarnessOutput(data.execution.output, data.execution.testNames);
      if (!parsed.valid) throw new Error("The pasted harness output is incomplete.");
      results = parsed.results.map((r) => ({ name: r.name, passed: r.passed, error: r.passed ? undefined : r.detail }));
    }

    const passed = results.filter((r) => r.passed).length;
    const total = results.length;
    const outcome: AttemptReview["outcome"] =
      data.execution.mode === "none" || total === 0 ? "not_run" : passed === total ? "passed" : passed > 0 ? "partial" : "failed";
    const independence: AttemptReview["independence"] = data.viewedSolution ? "with_solution" : data.hintsUsed > 0 ? "with_hints" : "independent";
    const timeCorrect = complexityMatches(data.claimedTime, problem.expectedTime);
    const spaceCorrect = complexityMatches(data.claimedSpace, problem.expectedSpace);

    const [row] = await db
      .insert(codingAttempts)
      .values({
        userId: getCurrentUserId(),
        problemId: problem.id,
        language: data.language,
        code: data.code,
        outcome,
        executionMode: data.execution.mode,
        testsPassed: passed,
        testsTotal: total,
        testResults: results,
        durationSeconds: data.durationSeconds,
        hintsUsed: data.hintsUsed,
        viewedSolution: data.viewedSolution,
        independence,
        claimedTime: data.claimedTime,
        claimedSpace: data.claimedSpace,
        timeCorrect,
        spaceCorrect,
        reflection: data.reflection,
        confidence: data.confidence,
      })
      .returning({ id: codingAttempts.id });

    // Problems target ~15–25 min under interview conditions (stored per problem in content).
    const targetSeconds = (problem.difficulty === "easy" ? 15 : problem.difficulty === "medium" ? 25 : 40) * 60;
    const next = await scheduleProblem(problem.id, gradeFromCodingAttempt({ outcome, independence, durationSeconds: data.durationSeconds, targetSeconds }));
    await logTime("problem", data.durationSeconds, problem.slug);
    await recomputeTopicProgress(await problemTopicIds(problem.id));
    if (outcome === "passed") await completeMatchingTasks("problem", problem.slug);
    revalidatePath("/", "layout");

    return {
      ok: true,
      data: {
        attemptId: row!.id,
        outcome,
        executionMode: data.execution.mode,
        independence,
        testsPassed: passed,
        testsTotal: total,
        timeCorrect,
        spaceCorrect,
        expectedTime: problem.expectedTime,
        expectedSpace: problem.expectedSpace,
        complexityNotes: problem.complexityNotes,
        nextReviewOn: next.dueOn,
      },
    };
  } catch (e) {
    return fail(e);
  }
}
