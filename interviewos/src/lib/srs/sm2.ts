import { addDays, diffDays, type ISODate } from "@/lib/dates";

/**
 * Spaced repetition — a documented SM-2 variant.
 *
 * Grades map to SM-2 quality scores: again → 1, hard → 3, good → 4, easy → 5.
 *
 * - Ease factor starts at 2.5 and follows the SM-2 update
 *   EF' = EF + (0.1 − (5 − q)·(0.08 + (5 − q)·0.02)), floored at 1.3.
 * - `again` (q < 3) resets repetitions, counts a lapse and schedules the item
 *   for the next day.
 * - Successful reviews use intervals 1 → 3 → round(interval × EF) days.
 *   `hard` uses ×1.2 instead of ×EF, `easy` gets an extra ×1.3 bonus.
 *   (Classic SM-2 uses 1 → 6; 3 days keeps interview material fresher.)
 * - Intervals are capped at 60 days, and — when an interview is scheduled —
 *   at two days before the interview so the item is reviewed before it.
 */

export type Grade = "again" | "hard" | "good" | "easy";

export const GRADE_QUALITY: Record<Grade, number> = { again: 1, hard: 3, good: 4, easy: 5 };

export interface SrsState {
  ease: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export interface SrsResult extends SrsState {
  dueOn: ISODate;
}

export const INITIAL_SRS_STATE: SrsState = { ease: 2.5, intervalDays: 0, repetitions: 0, lapses: 0 };
export const MIN_EASE = 1.3;
export const MAX_INTERVAL_DAYS = 60;

export interface ReviewOptions {
  today: ISODate;
  /** Next scheduled interview, if any. Intervals are shortened to land before it. */
  interviewOn?: ISODate | null;
}

export function nextEase(ease: number, quality: number): number {
  const updated = ease + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02));
  return Math.max(MIN_EASE, Math.round(updated * 1000) / 1000);
}

export function review(state: SrsState, grade: Grade, opts: ReviewOptions): SrsResult {
  const q = GRADE_QUALITY[grade];
  const ease = nextEase(state.ease, q);

  if (q < 3) {
    return {
      ease,
      intervalDays: 1,
      repetitions: 0,
      lapses: state.lapses + 1,
      dueOn: addDays(opts.today, 1),
    };
  }

  let interval: number;
  if (state.repetitions === 0) {
    interval = grade === "easy" ? 3 : 1;
  } else if (state.repetitions === 1) {
    interval = grade === "hard" ? 2 : grade === "easy" ? 5 : 3;
  } else {
    const base = Math.max(1, state.intervalDays);
    const factor = grade === "hard" ? 1.2 : grade === "easy" ? ease * 1.3 : ease;
    interval = Math.max(base + 1, Math.round(base * factor));
  }

  interval = Math.min(interval, MAX_INTERVAL_DAYS);

  if (opts.interviewOn) {
    const untilInterview = diffDays(opts.today, opts.interviewOn) - 2;
    if (untilInterview >= 1) interval = Math.min(interval, untilInterview);
  }

  interval = Math.max(1, interval);

  return {
    ease,
    intervalDays: interval,
    repetitions: state.repetitions + 1,
    lapses: state.lapses,
    dueOn: addDays(opts.today, interval),
  };
}

/**
 * Converts a coding attempt into an SRS grade. Solving independently and
 * quickly earns longer intervals; hints or a viewed solution bring the
 * problem back soon so it is re-implemented from scratch.
 */
export function gradeFromCodingAttempt(input: {
  outcome: "passed" | "partial" | "failed" | "not_run";
  independence: "independent" | "with_hints" | "with_solution";
  durationSeconds: number;
  targetSeconds: number;
}): Grade {
  if (input.outcome !== "passed" || input.independence === "with_solution") return "again";
  if (input.independence === "with_hints") return "hard";
  return input.durationSeconds <= input.targetSeconds * 0.6 ? "easy" : "good";
}
