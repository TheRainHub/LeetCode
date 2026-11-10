/**
 * Topic mastery derivation.
 *
 * Evidence levels (from weakest to strongest):
 *   read → recognize → implement → explain (under interview conditions)
 *
 * Rules:
 * - No evidence at all → not_started.
 * - Only reading (or failed attempts) → learning. Reading can never mark a
 *   topic as interview ready.
 * - Any recognition, implementation or explanation evidence → practicing.
 * - interview_ready needs: recognize AND explain AND (implement for coding
 *   topics | verified lab for lab topics), recent accuracy ≥ 70 % over at
 *   least 3 graded results, and no overdue reviews.
 * - needs_review: the topic was practiced but a review is overdue, or the
 *   latest graded results show a regression (recent accuracy < 50 %).
 */

export type TopicStatus = "not_started" | "learning" | "practicing" | "needs_review" | "interview_ready";

export const TOPIC_STATUSES: readonly TopicStatus[] = [
  "not_started",
  "learning",
  "practicing",
  "needs_review",
  "interview_ready",
] as const;

export interface TopicEvidence {
  practiceKind: "coding" | "lab" | "conceptual";
  read: boolean;
  recognized: boolean;
  implemented: boolean;
  explained: boolean;
  labVerified: boolean;
  /** Whether a lab exists for this topic (lab topics without a lab fall back to conceptual rules). */
  hasLab: boolean;
  /** Most recent graded results, newest first (true = correct). */
  recentResults: boolean[];
  /** Any attempt at all (quiz, coding, review, interview). */
  anyAttempt: boolean;
  overdueReviews: number;
}

export const READY_ACCURACY = 0.7;
export const REGRESSION_ACCURACY = 0.5;
export const MIN_RESULTS_FOR_READY = 3;
export const RECENT_WINDOW = 6;

export function recentAccuracy(results: boolean[], window = RECENT_WINDOW): number | null {
  const slice = results.slice(0, window);
  if (slice.length === 0) return null;
  return slice.filter(Boolean).length / slice.length;
}

export interface StatusExplanation {
  status: TopicStatus;
  /** Which requirements for interview_ready are still missing (i18n keys). */
  missing: MissingRequirement[];
}

export type MissingRequirement =
  | "read"
  | "recognize"
  | "implement"
  | "lab"
  | "explain"
  | "accuracy"
  | "more_results"
  | "overdue_reviews";

export function deriveTopicStatus(e: TopicEvidence): StatusExplanation {
  const missing: MissingRequirement[] = [];
  if (!e.read) missing.push("read");
  if (!e.recognized) missing.push("recognize");
  const needsImplementation = e.practiceKind === "coding";
  const needsLab = e.practiceKind === "lab" && e.hasLab;
  if (needsImplementation && !e.implemented) missing.push("implement");
  if (needsLab && !e.labVerified) missing.push("lab");
  if (!e.explained) missing.push("explain");

  const acc = recentAccuracy(e.recentResults);
  if (e.recentResults.length < MIN_RESULTS_FOR_READY) missing.push("more_results");
  else if (acc !== null && acc < READY_ACCURACY) missing.push("accuracy");
  if (e.overdueReviews > 0) missing.push("overdue_reviews");

  const hasPractice = e.recognized || e.implemented || e.explained || e.labVerified;

  if (!e.read && !e.anyAttempt && !hasPractice) return { status: "not_started", missing };
  if (!hasPractice) return { status: "learning", missing };

  const regressed =
    e.recentResults.length >= MIN_RESULTS_FOR_READY && acc !== null && acc < REGRESSION_ACCURACY;
  if (e.overdueReviews > 0 || regressed) return { status: "needs_review", missing };

  // "read" is not required for readiness if the learner proves mastery otherwise.
  const blocking = missing.filter((m) => m !== "read");
  if (blocking.length === 0) return { status: "interview_ready", missing: [] };
  return { status: "practicing", missing };
}

/** Numeric weight of a status for readiness estimates (0..1). */
export const STATUS_SCORE: Record<TopicStatus, number> = {
  not_started: 0,
  learning: 0.15,
  practicing: 0.5,
  needs_review: 0.4,
  interview_ready: 1,
};
