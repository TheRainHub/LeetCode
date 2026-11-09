import { diffDays, type ISODate } from "@/lib/dates";
import type { TopicStatus } from "@/lib/mastery/status";

export interface RecommendTopic {
  id: number;
  slug: string;
  title: string;
  status: TopicStatus;
  priority: number;
  /** Recent accuracy 0..1 or null when not enough data. */
  accuracy: number | null;
  nextReviewOn: ISODate | null;
  prerequisitesMet: boolean;
}

export interface UpcomingInterview {
  companyName: string;
  date: ISODate;
  /** topicId → weight (1..3) */
  focus: ReadonlyMap<number, number>;
}

export type RecommendationReason =
  | { kind: "review_due" }
  | { kind: "needs_review" }
  | { kind: "in_progress" }
  | { kind: "high_priority" }
  | { kind: "low_accuracy"; accuracy: number }
  | { kind: "interview_soon"; company: string; days: number }
  | { kind: "active_application"; company: string }
  | { kind: "from_mock_interview" }
  | { kind: "next_in_path" };

export interface Recommendation {
  topicId: number;
  slug: string;
  title: string;
  score: number;
  reasons: RecommendationReason[];
}

export interface RecommendInput {
  today: ISODate;
  topics: readonly RecommendTopic[];
  upcomingInterviews: readonly UpcomingInterview[];
  /** Companies with an active application (no date yet): topicId → weight. */
  activeApplications: readonly { companyName: string; focus: ReadonlyMap<number, number> }[];
  /** Topics flagged by the most recent mock interview evaluation. */
  mockInterviewTopicIds: ReadonlySet<number>;
}

/**
 * Transparent, rule-based topic recommendation. Every point of score comes
 * with a human-readable reason so the user can see why a topic was chosen.
 */
export function recommendTopics(input: RecommendInput, limit = 5): Recommendation[] {
  const out: Recommendation[] = [];

  for (const t of input.topics) {
    let score = 0;
    const reasons: RecommendationReason[] = [];
    const reviewDue = t.nextReviewOn !== null && t.nextReviewOn <= input.today;

    if (t.status === "interview_ready" && !reviewDue) continue;

    switch (t.status) {
      case "needs_review":
        score += 30;
        reasons.push({ kind: "needs_review" });
        break;
      case "practicing":
      case "learning":
        score += 15;
        reasons.push({ kind: "in_progress" });
        break;
      case "not_started":
        score += 6;
        break;
      default:
        break;
    }

    if (reviewDue) {
      score += 25;
      reasons.push({ kind: "review_due" });
    }
    if (t.priority > 0) {
      score += t.priority * 12;
      reasons.push({ kind: "high_priority" });
    } else if (t.priority < 0) {
      score -= 15;
    }
    if (t.accuracy !== null && t.accuracy < 0.6) {
      score += 15;
      reasons.push({ kind: "low_accuracy", accuracy: t.accuracy });
    }

    for (const iv of input.upcomingInterviews) {
      const w = iv.focus.get(t.id);
      const days = diffDays(input.today, iv.date);
      if (w && days >= 0 && days <= 45) {
        score += w * 10 * ((46 - days) / 46);
        reasons.push({ kind: "interview_soon", company: iv.companyName, days });
      }
    }
    for (const app of input.activeApplications) {
      const w = app.focus.get(t.id);
      if (w) {
        score += w * 3;
        if (!reasons.some((r) => r.kind === "interview_soon" && r.company === app.companyName)) {
          reasons.push({ kind: "active_application", company: app.companyName });
        }
      }
    }
    if (input.mockInterviewTopicIds.has(t.id)) {
      score += 20;
      reasons.push({ kind: "from_mock_interview" });
    }
    if (!t.prerequisitesMet && t.status === "not_started") score -= 25;
    if (t.status === "not_started" && t.prerequisitesMet && reasons.length === 0) {
      reasons.push({ kind: "next_in_path" });
    }

    out.push({ topicId: t.id, slug: t.slug, title: t.title, score: Math.round(score * 10) / 10, reasons });
  }

  return out.sort((a, b) => b.score - a.score).slice(0, limit);
}
