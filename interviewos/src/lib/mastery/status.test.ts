import { describe, expect, it } from "vitest";
import { deriveTopicStatus, recentAccuracy, type TopicEvidence } from "./status";

const none: TopicEvidence = {
  practiceKind: "coding",
  read: false,
  recognized: false,
  implemented: false,
  explained: false,
  labVerified: false,
  hasLab: false,
  recentResults: [],
  anyAttempt: false,
  overdueReviews: 0,
};

describe("deriveTopicStatus", () => {
  it("is not_started without evidence", () => {
    expect(deriveTopicStatus(none).status).toBe("not_started");
  });

  it("reading alone never exceeds 'learning'", () => {
    expect(deriveTopicStatus({ ...none, read: true }).status).toBe("learning");
  });

  it("recognition moves a topic to practicing", () => {
    expect(
      deriveTopicStatus({
        ...none,
        read: true,
        recognized: true,
        recentResults: [true, true, true],
        anyAttempt: true,
      }).status,
    ).toBe("practicing");
  });

  it("requires implementation for coding topics", () => {
    const e = {
      ...none,
      read: true,
      recognized: true,
      explained: true,
      recentResults: [true, true, true, true],
      anyAttempt: true,
    };
    const r = deriveTopicStatus(e);
    expect(r.status).toBe("practicing");
    expect(r.missing).toContain("implement");
    expect(deriveTopicStatus({ ...e, implemented: true }).status).toBe("interview_ready");
  });

  it("does not require implementation for conceptual topics", () => {
    const e: TopicEvidence = {
      ...none,
      practiceKind: "conceptual",
      recognized: true,
      explained: true,
      recentResults: [true, true, true],
      anyAttempt: true,
    };
    expect(deriveTopicStatus(e).status).toBe("interview_ready");
  });

  it("requires a verified lab for lab topics only when a lab exists", () => {
    const e: TopicEvidence = {
      ...none,
      practiceKind: "lab",
      hasLab: true,
      recognized: true,
      explained: true,
      recentResults: [true, true, true],
      anyAttempt: true,
    };
    expect(deriveTopicStatus(e).missing).toContain("lab");
    expect(deriveTopicStatus({ ...e, labVerified: true }).status).toBe("interview_ready");
    expect(deriveTopicStatus({ ...e, hasLab: false }).status).toBe("interview_ready");
  });

  it("needs at least three graded results and ≥ 70% recent accuracy", () => {
    const e: TopicEvidence = {
      ...none,
      practiceKind: "conceptual",
      recognized: true,
      explained: true,
      recentResults: [true, true],
      anyAttempt: true,
    };
    expect(deriveTopicStatus(e).missing).toContain("more_results");
    const low = { ...e, recentResults: [true, false, true, false, true, false] };
    expect(deriveTopicStatus(low).status).toBe("practicing");
    expect(deriveTopicStatus(low).missing).toContain("accuracy");
  });

  it("flags needs_review for overdue reviews or regressions", () => {
    const ready: TopicEvidence = {
      ...none,
      practiceKind: "conceptual",
      recognized: true,
      explained: true,
      recentResults: [true, true, true],
      anyAttempt: true,
    };
    expect(deriveTopicStatus({ ...ready, overdueReviews: 2 }).status).toBe("needs_review");
    expect(
      deriveTopicStatus({ ...ready, recentResults: [false, false, false, false, true, true] }).status,
    ).toBe("needs_review");
    // Exactly 50% is not a regression (threshold is < 50%), but accuracy is still missing for readiness.
    expect(
      deriveTopicStatus({ ...ready, recentResults: [false, false, false, true, true, true] }).missing,
    ).toContain("accuracy");
  });

  it("computes recent accuracy over the newest results only", () => {
    expect(recentAccuracy([])).toBeNull();
    expect(recentAccuracy([true, true, false, false, false, false, false, false], 2)).toBe(1);
  });
});
