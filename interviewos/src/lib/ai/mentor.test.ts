import { describe, expect, it } from "vitest";
import { assignTaskInput, BANK_REF_PREFIX, buildMentorSystemPrompt, MENTOR_TOOLS, taskHref } from "./mentor";

describe("mentor", () => {
  it("links tasks to InterviewOS pages, and bank problems to LeetCode", () => {
    expect(taskHref("lesson", "caching")).toBe("/learn/lesson/caching");
    expect(taskHref("system_design", "url-shortener")).toBe("/practice/system-design/url-shortener");
    expect(taskHref("problem", "two-sum")).toBe("/practice/problems/two-sum");
    expect(taskHref("problem", `${BANK_REF_PREFIX}lru-cache`)).toBe(
      "https://leetcode.com/problems/lru-cache/",
    );
    expect(taskHref("project", "anything")).toBeNull();
    expect(taskHref("lesson", null)).toBeNull();
  });

  it("validates assignments", () => {
    const ok = {
      title: "Read the caching lesson",
      details: "",
      kind: "lesson",
      ref: "caching",
      estimate_minutes: 45,
    };
    expect(assignTaskInput.safeParse(ok).success).toBe(true);
    expect(assignTaskInput.safeParse({ ...ok, kind: "nap" }).success).toBe(false);
    expect(assignTaskInput.safeParse({ ...ok, due_on: "next week" }).success).toBe(false);
    expect(assignTaskInput.safeParse({ ...ok, due_on: "2026-12-01" }).success).toBe(true);
    expect(assignTaskInput.safeParse({ ...ok, estimate_minutes: 2 }).success).toBe(false);
  });

  it("gives the mentor its rules and the catalogue it may link to", () => {
    const prompt = buildMentorSystemPrompt({
      lessons: [{ slug: "caching", title: "Caching strategies" }],
      problems: [{ slug: "two-sum", title: "Two Sum" }],
      designQuestions: [{ slug: "url-shortener", title: "URL shortener" }],
    });
    expect(prompt).toContain("caching: Caching strategies");
    expect(prompt).toContain("url-shortener: URL shortener");
    expect(prompt).toContain("Never invent progress");
    expect(MENTOR_TOOLS.map((t) => t.name)).toEqual(["assign_task", "update_task", "remember", "forget"]);
  });
});
