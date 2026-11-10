import type { Comparator, Language, ProblemSignature, ProblemTest } from "@/lib/content/types";

export interface TestOutcome {
  name: string;
  passed: boolean;
  actual?: string;
  expected?: string;
  error?: string;
  durationMs?: number;
}

export interface RunRequest {
  language: Language;
  code: string;
  signature: ProblemSignature;
  comparator: Comparator;
  tests: ProblemTest[];
}

export interface RunResult {
  /** False means the code was NOT executed and results must not be presented as such. */
  executed: boolean;
  mode: "browser" | "local" | "none";
  results: TestOutcome[];
  compileError?: string;
  logs: string[];
  message?: string;
}

/**
 * A code runner executes code in some sandbox. Implementations:
 *  - browserTypeScriptRunner: Web Worker in the user's browser (TypeScript only).
 *  - (future) a remote sandbox service, e.g. a self-hosted container runner.
 * The Next.js server never executes user code.
 */
export interface CodeRunner {
  id: string;
  supports(language: Language): boolean;
  run(request: RunRequest): Promise<RunResult>;
}

export function notExecuted(message: string): RunResult {
  return { executed: false, mode: "none", results: [], logs: [], message };
}
