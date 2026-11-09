/**
 * Shapes for structured content stored in JSONB columns. Shared by the seed
 * pipeline, the database schema and the UI.
 */

export type Language = "java" | "typescript" | "python";
export const LANGUAGES: readonly Language[] = ["java", "typescript", "python"] as const;

export type Area =
  | "dsa"
  | "java"
  | "linux-networking"
  | "backend"
  | "ts-react"
  | "system-design"
  | "ai-engineering"
  | "behavioral";

export type PracticeKind = "coding" | "lab" | "conceptual";

export interface Reading {
  title: string;
  url: string;
  /** docs | rfc | book | article | course | spec | video */
  kind: string;
  note?: string;
}

export interface InterviewQuestion {
  q: string;
  /** Key points a strong answer contains (not a script to memorize). */
  a: string;
}

/**
 * Abstract parameter/return types used to generate test harnesses for every
 * supported language from one JSON test definition.
 */
export type ValueType =
  | "int"
  | "int[]"
  | "int[][]"
  | "string"
  | "string[]"
  | "string[][]"
  | "char[][]"
  | "boolean"
  | "linkedListWithCycle";

export interface ProblemSignature {
  /** Function/method name, identical across languages (camelCase). */
  method: string;
  params: { name: string; type: ValueType }[];
  returns: ValueType;
}

/** How a produced value is compared with the expected one. */
export type Comparator = "exact" | "unorderedList" | "unorderedNested";

export interface ProblemTest {
  name: string;
  /** Arguments in signature order, as JSON values. */
  args: unknown[];
  expected: unknown;
}

export interface ProblemExample {
  input: string;
  output: string;
  explanation?: string;
}

export interface LabStep {
  id: string;
  title: string;
  /** Markdown instructions. */
  instructions: string;
  /** What the learner should expect to see (markdown). */
  expectedOutput?: string;
  verification:
    | { kind: "paste"; prompt: string; pattern?: string; patternHint?: string; minLength?: number }
    | { kind: "checkbox"; prompt: string };
}

export interface LabFailureScenario {
  symptom: string;
  cause: string;
  fix: string;
}

export interface EvaluationDimension {
  score: number | null;
  evidence: string;
}
