import { describe, expect, it } from "vitest";
import { SD_GENERIC_RUBRIC, SD_QUESTIONS } from "@content/system-design";
import { buildInterviewerSystemPrompt } from "@/lib/ai/interviewer";
import { deriveSdStatus, draftChars, fullRubric } from "./status";

describe("deriveSdStatus", () => {
  const base = { draftChars: 0, bestScore: null, completedInterviews: 0, bestInterviewScore: null };
  it("needs evidence for every level", () => {
    expect(deriveSdStatus(base)).toBe("not_started");
    expect(deriveSdStatus({ ...base, draftChars: 39 })).toBe("not_started");
    expect(deriveSdStatus({ ...base, draftChars: 40 })).toBe("drafted");
    expect(deriveSdStatus({ ...base, draftChars: 500, bestScore: 0.5 })).toBe("practiced");
    expect(deriveSdStatus({ ...base, completedInterviews: 1, bestInterviewScore: 55 })).toBe("practiced");
    expect(deriveSdStatus({ ...base, bestScore: 0.8 })).toBe("strong");
    expect(deriveSdStatus({ ...base, completedInterviews: 1, bestInterviewScore: 70 })).toBe("strong");
  });
  it("a long draft alone is never 'practiced'", () => {
    expect(deriveSdStatus({ ...base, draftChars: 10_000 })).toBe("drafted");
  });
});

describe("rubric and drafts", () => {
  it("adds the generic process items to each question's rubric", () => {
    const q = SD_QUESTIONS[0]!;
    expect(fullRubric(q)).toEqual([...q.rubric, ...SD_GENERIC_RUBRIC]);
  });
  it("counts written characters, ignoring whitespace-only sections", () => {
    expect(draftChars({ requirements: "  abc  ", api: "   " })).toBe(3);
    expect(draftChars(null)).toBe(0);
  });
});

describe("interviewer prompt with a design question", () => {
  const base = {
    type: "system_design" as const,
    difficulty: "medium" as const,
    durationMinutes: 45,
    language: "java" as const,
    candidateProfile: "Student",
    practisedProblems: [],
  };
  it("includes the chosen question only when given", () => {
    const q = SD_QUESTIONS.find((x) => x.slug === "url-shortener")!;
    const withQ = buildInterviewerSystemPrompt({
      ...base,
      designQuestion: { title: q.title, prompt: q.prompt },
    });
    expect(withQ).toContain("<design_question>");
    expect(withQ).toContain(q.prompt);
    expect(buildInterviewerSystemPrompt(base)).not.toContain("<design_question>");
  });
});
