import { describe, expect, it } from "vitest";
import { buildTranscript, sanitizeEvaluation, type RawEvaluation } from "@/lib/ai/evaluation";
import { buildInterviewerSystemPrompt, displayCandidateMessage, formatCandidateMessage } from "@/lib/ai/interviewer";
import { complexityMatches, normalizeComplexity } from "@/lib/complexity";
import { addDays, diffDays, isISODate, startOfWeek, todayIn, weekday } from "@/lib/dates";
import { generateProjectQuestions, projectCompleteness } from "@/lib/experience";
import { checkStepEvidence } from "@/lib/labs";

describe("complexity matching", () => {
  it("normalizes equivalent notations", () => {
    expect(normalizeComplexity("O(N log N)")).toBe("nlogn");
    expect(complexityMatches("O(n*log(n))", "O(n log n)")).toBe(true);
    expect(complexityMatches("O(n^2)", "O(n²)")).toBe(true);
    expect(complexityMatches("O(mn)", "O(m·n)")).toBe(true);
    expect(complexityMatches("O(n)", "O(log n)")).toBe(false);
    expect(complexityMatches("", "O(1)")).toBe(false);
  });
});

describe("dates", () => {
  it("does calendar arithmetic on ISO dates", () => {
    expect(addDays("2026-11-30", 1)).toBe("2026-12-01");
    expect(diffDays("2026-11-09", "2026-11-11")).toBe(2);
    expect(weekday("2026-11-09")).toBe(1);
    expect(startOfWeek("2026-11-15")).toBe("2026-11-09");
    expect(isISODate("2026-02-30")).toBe(false);
    expect(todayIn("Europe/Prague", new Date("2026-11-08T23:30:00Z"))).toBe("2026-11-09");
  });
});

describe("interviewer prompt", () => {
  it("contains the core interviewer rules and the frozen configuration", () => {
    const p = buildInterviewerSystemPrompt({
      type: "algorithms",
      difficulty: "medium",
      durationMinutes: 45,
      language: "java",
      company: { name: "Microsoft", role: "SWE", focusTopics: ["Trees"] },
      candidateProfile: "Student",
      practisedProblems: ["Two Sum"],
    });
    expect(p).toContain("one question at a time");
    expect(p).toContain("Never claim tests pass");
    expect(p).toContain("[HINT REQUEST]");
    expect(p).toContain("Two Sum");
    expect(p).toContain("not a claim about the company's real process");
  });

  it("round-trips candidate messages for display", () => {
    const content = formatCandidateMessage({ text: "Use a hash map", kind: "hint_request", code: { language: "java", code: "int x;" }, elapsedMinutes: 12.4, durationMinutes: 45 });
    expect(content).toContain("[HINT REQUEST]");
    expect(content).toContain("[Elapsed: 12 of 45 min]");
    expect(displayCandidateMessage(content)).toBe("Use a hash map\n\n```java\nint x;\n```");
  });
});

describe("evaluation sanitizing", () => {
  const raw: RawEvaluation = {
    overallScore: 140,
    summary: "ok",
    dimensions: Object.fromEntries(
      ["technicalCorrectness", "problemSolving", "codingQuality", "architecture", "communication", "independence", "edgeCases"].map((k, i) => [k, { score: i === 3 ? null : 9, evidence: "e" }]),
    ) as RawEvaluation["dimensions"],
    strengths: ["s"],
    weaknesses: ["w"],
    mistakes: [],
    modelAnswer: "m",
    recommendedTopics: [{ topicSlug: "dns", reason: "r" }, { topicSlug: "made-up", reason: "x" }],
    coveredTopics: [{ topicSlug: "dns", score: 1.7 }, { topicSlug: "dns", score: 0.2 }],
    followUpExercises: [{ title: "t", description: "d", problemSlug: "nope" }],
    spacedRepetition: [{ prompt: "What is TTL?", answer: "Time to live", topicSlug: "made-up" }],
  };
  it("clamps scores and drops unknown slugs", () => {
    const s = sanitizeEvaluation(raw, { topicSlugs: new Set(["dns"]), problemSlugs: new Set(["two-sum"]) });
    expect(s.overallScore).toBe(100);
    expect(s.dimensions.technicalCorrectness.score).toBe(5);
    expect(s.dimensions.architecture.score).toBeNull();
    expect(s.recommendedTopics).toHaveLength(1);
    expect(s.coveredTopics).toEqual([{ topicSlug: "dns", score: 1 }]);
    expect(s.followUpExercises[0]!.problemSlug).toBeNull();
    expect(s.spacedRepetition[0]!.topicSlug).toBeNull();
  });
  it("builds a transcript without the opening marker", () => {
    expect(
      buildTranscript([
        { role: "user", content: "[INTERVIEW START]", kind: "opening" },
        { role: "assistant", content: "Hi", kind: "normal" },
        { role: "user", content: "Help", kind: "hint_request" },
      ]),
    ).toBe("Interviewer: Hi\n\nCandidate (requested a hint): Help");
  });
});

describe("lab evidence", () => {
  const paste = { id: "s", title: "t", instructions: "", verification: { kind: "paste" as const, prompt: "p", pattern: "(?i)listen[\\s\\S]*8080", minLength: 10 } };
  it("checks length and case-insensitive patterns", () => {
    expect(checkStepEvidence(paste, { text: "short" })).toEqual({ passed: false, reason: "short" });
    expect(checkStepEvidence(paste, { text: "LISTEN 0 5 127.0.0.1:8080" }).passed).toBe(true);
    expect(checkStepEvidence(paste, { text: "ESTAB 0 0 127.0.0.1:9090 peer" })).toEqual({ passed: false, reason: "pattern" });
  });
  it("requires checkbox confirmation", () => {
    const step = { id: "c", title: "t", instructions: "", verification: { kind: "checkbox" as const, prompt: "p" } };
    expect(checkStepEvidence(step, { checked: false }).passed).toBe(false);
    expect(checkStepEvidence(step, { checked: true }).passed).toBe(true);
  });
});

describe("experience questions", () => {
  const project = {
    title: "LLM Vulnerability Triage",
    problem: "Alerts need triage",
    context: "",
    responsibility: "",
    architecture: "LLM agents explore the repository",
    decisions: "",
    tradeoffs: "",
    challenges: "false negatives",
    result: "",
    lessonsLearned: "",
    techStack: ["LLM agents"],
  };
  it("asks for missing facts instead of inventing them", () => {
    const qs = generateProjectQuestions(project);
    expect(qs.find((q) => q.id === "ownership")!.needsField).toBe("responsibility");
    expect(qs.find((q) => q.id === "impact")!.lookFor).toMatch(/Don't|If there are no metrics/i);
    expect(qs.map((q) => q.id)).toEqual(expect.arrayContaining(["kw-false-negatives", "kw-llm-structure", "kw-repo-exploration"]));
  });
  it("measures completeness over narrative fields", () => {
    expect(projectCompleteness(project)).toBeCloseTo(3 / 9);
  });
});
