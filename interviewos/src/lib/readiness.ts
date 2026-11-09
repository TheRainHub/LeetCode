import { STATUS_SCORE, type TopicStatus } from "@/lib/mastery/status";

export interface FocusTopicState {
  topicId: number;
  weight: number;
  status: TopicStatus;
}

export interface ReadinessEstimate {
  /** 0..100, or null when there is not enough evidence to estimate. */
  estimate: number | null;
  /** Fraction of focus topics with any evidence (0..1). */
  coverage: number;
  readyTopics: number;
  startedTopics: number;
  totalTopics: number;
}

/** Minimum share of focus topics with evidence before an estimate is shown. */
export const MIN_COVERAGE_FOR_ESTIMATE = 0.25;

/**
 * Weighted readiness estimate for a company track. This is a model-based
 * estimate derived from topic statuses — not observed interview performance —
 * and the UI must label it as such.
 */
export function estimateReadiness(topics: readonly FocusTopicState[]): ReadinessEstimate {
  const total = topics.length;
  const started = topics.filter((t) => t.status !== "not_started").length;
  const ready = topics.filter((t) => t.status === "interview_ready").length;
  const coverage = total === 0 ? 0 : started / total;
  if (total === 0 || coverage < MIN_COVERAGE_FOR_ESTIMATE) {
    return { estimate: null, coverage, readyTopics: ready, startedTopics: started, totalTopics: total };
  }
  const weightSum = topics.reduce((s, t) => s + t.weight, 0);
  const score = topics.reduce((s, t) => s + t.weight * STATUS_SCORE[t.status], 0);
  return {
    estimate: Math.round((score / weightSum) * 100),
    coverage,
    readyTopics: ready,
    startedTopics: started,
    totalTopics: total,
  };
}

export type PreparationLevel = "not_assessed" | "foundations" | "developing" | "interview_capable" | "strong";

/**
 * Overall preparation level from observed evidence. Requires a minimum amount
 * of graded evidence; otherwise reports "not_assessed".
 */
export function preparationLevel(input: {
  gradedResults: number;
  topicsPracticed: number;
  topicsReady: number;
  totalTopics: number;
  avgInterviewScore: number | null;
  interviewsCompleted: number;
}): PreparationLevel {
  if (input.gradedResults < 10 || input.topicsPracticed < 3) return "not_assessed";
  const readyShare = input.totalTopics === 0 ? 0 : input.topicsReady / input.totalTopics;
  const interview = input.interviewsCompleted >= 2 ? input.avgInterviewScore : null;
  if (readyShare >= 0.6 && interview !== null && interview >= 75) return "strong";
  if (readyShare >= 0.35 && (interview === null || interview >= 60)) return "interview_capable";
  if (readyShare >= 0.12 || input.topicsPracticed >= 10) return "developing";
  return "foundations";
}
