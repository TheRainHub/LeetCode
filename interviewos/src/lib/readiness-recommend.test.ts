import { describe, expect, it } from "vitest";
import { estimateReadiness, preparationLevel } from "./readiness";
import { recommendTopics, type RecommendTopic } from "./recommend";

describe("estimateReadiness", () => {
  it("returns null when coverage or the number of started topics is too low", () => {
    expect(estimateReadiness([]).estimate).toBeNull();
    expect(estimateReadiness([{ topicId: 1, weight: 3, status: "interview_ready" }]).estimate).toBeNull();
    const many = Array.from({ length: 20 }, (_, i) => ({
      topicId: i,
      weight: 2,
      status: i < 3 ? ("practicing" as const) : ("not_started" as const),
    }));
    expect(estimateReadiness(many).estimate).toBeNull(); // 15% coverage
  });

  it("weights statuses by topic weight", () => {
    const r = estimateReadiness([
      { topicId: 1, weight: 3, status: "interview_ready" },
      { topicId: 2, weight: 1, status: "not_started" },
      { topicId: 3, weight: 2, status: "practicing" },
      { topicId: 4, weight: 2, status: "learning" },
    ]);
    // (3*1 + 1*0 + 2*0.5 + 2*0.15) / 8 = 0.5375
    expect(r.estimate).toBe(54);
    expect(r.startedTopics).toBe(3);
  });
});

describe("preparationLevel", () => {
  it("is not assessed without enough graded evidence", () => {
    expect(
      preparationLevel({
        gradedResults: 4,
        topicsPracticed: 5,
        topicsReady: 3,
        totalTopics: 100,
        avgInterviewScore: null,
        interviewsCompleted: 0,
      }),
    ).toBe("not_assessed");
  });
  it("requires observed interview scores for 'strong'", () => {
    const base = { gradedResults: 200, topicsPracticed: 80, topicsReady: 70, totalTopics: 100 };
    expect(preparationLevel({ ...base, avgInterviewScore: null, interviewsCompleted: 0 })).toBe(
      "interview_capable",
    );
    expect(preparationLevel({ ...base, avgInterviewScore: 80, interviewsCompleted: 3 })).toBe("strong");
  });
});

describe("recommendTopics", () => {
  const topic = (id: number, extra: Partial<RecommendTopic> = {}): RecommendTopic => ({
    id,
    slug: `t${id}`,
    title: `Topic ${id}`,
    status: "not_started",
    priority: 0,
    accuracy: null,
    nextReviewOn: null,
    prerequisitesMet: true,
    ...extra,
  });
  const base = {
    today: "2026-11-12",
    upcomingInterviews: [],
    activeApplications: [],
    mockInterviewTopicIds: new Set<number>(),
  };

  it("prioritizes due reviews and needs_review topics", () => {
    const recs = recommendTopics({
      ...base,
      topics: [
        topic(1),
        topic(2, { status: "needs_review", nextReviewOn: "2026-11-10" }),
        topic(3, { status: "practicing" }),
      ],
    });
    expect(recs[0]!.topicId).toBe(2);
    expect(recs[0]!.reasons.map((r) => r.kind)).toEqual(
      expect.arrayContaining(["needs_review", "review_due"]),
    );
  });

  it("boosts topics that matter for an upcoming interview, with a reason", () => {
    const recs = recommendTopics({
      ...base,
      topics: [topic(1), topic(2)],
      upcomingInterviews: [{ companyName: "CDN77", date: "2026-11-15", focus: new Map([[2, 3]]) }],
    });
    expect(recs[0]!.topicId).toBe(2);
    expect(recs[0]!.reasons).toContainEqual({ kind: "interview_soon", company: "CDN77", days: 3 });
  });

  it("skips interview-ready topics without due reviews and demotes unmet prerequisites", () => {
    const recs = recommendTopics({
      ...base,
      topics: [topic(1, { status: "interview_ready" }), topic(2, { prerequisitesMet: false }), topic(3)],
    });
    expect(recs.map((r) => r.topicId)).toEqual([3, 2]);
  });
});
