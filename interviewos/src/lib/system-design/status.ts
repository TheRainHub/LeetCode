import { SD_GENERIC_RUBRIC, SD_PHASES, type SdSectionKey } from "@content/system-design";
import type { SdQuestionDef } from "@/lib/content/defs";

export type SdStatus = "not_started" | "drafted" | "practiced" | "strong";

/** Best rubric share needed for "strong". */
export const SD_STRONG_SCORE = 0.8;
/** Overall mock-interview score (0–100) that counts as strong. */
export const SD_STRONG_INTERVIEW = 70;
/** Characters of written answer before a draft counts as started. */
export const SD_DRAFT_MIN_CHARS = 40;
/** Whiteboard components before a diagram counts as started. */
export const SD_BOARD_MIN_COMPONENTS = 3;

export const SD_SECTION_KEYS: SdSectionKey[] = SD_PHASES.map((p) => p.key);

/** Question rubric plus the process items every design answer is judged on. */
export function fullRubric(q: Pick<SdQuestionDef, "rubric">): string[] {
  return [...q.rubric, ...SD_GENERIC_RUBRIC];
}

export function draftChars(sections: Record<string, string> | null | undefined): number {
  if (!sections) return 0;
  return Object.values(sections).reduce((n, v) => n + v.trim().length, 0);
}

/**
 * Practice status for a design question, from evidence only:
 * strong   — a graded attempt ≥ 80 % of the rubric, or a completed mock interview scoring ≥ 70;
 * practiced — any graded attempt or completed mock interview;
 * drafted  — a written answer or a whiteboard diagram exists but was never graded.
 */
export function deriveSdStatus(input: {
  draftChars: number;
  bestScore: number | null;
  completedInterviews: number;
  bestInterviewScore: number | null;
  /** Components on the question's whiteboard. */
  boardComponents?: number;
}): SdStatus {
  const strongAttempt = input.bestScore !== null && input.bestScore >= SD_STRONG_SCORE;
  const strongInterview =
    input.bestInterviewScore !== null && input.bestInterviewScore >= SD_STRONG_INTERVIEW;
  if (strongAttempt || strongInterview) return "strong";
  if (input.bestScore !== null || input.completedInterviews > 0) return "practiced";
  if (input.draftChars >= SD_DRAFT_MIN_CHARS) return "drafted";
  if ((input.boardComponents ?? 0) >= SD_BOARD_MIN_COMPONENTS) return "drafted";
  return "not_started";
}
