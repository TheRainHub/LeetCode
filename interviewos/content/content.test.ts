import { readdirSync, readFileSync, statSync } from "node:fs";
import { join, relative } from "node:path";
import { describe, expect, it } from "vitest";
import { parseLesson, type ParsedLesson } from "@/lib/content/lesson-parser";
import { COMPANIES } from "./companies";
import { CURRICULUM } from "./curriculum";
import { LABS } from "./labs";
import { INTERVIEW_SPRINT } from "./plan-template";
import { PROBLEMS } from "./problems";
import { PROJECTS } from "./projects";

const dir = join(process.cwd(), "content", "lessons");
const files = (function list(d: string): string[] {
  return readdirSync(d).flatMap((n) => {
    const f = join(d, n);
    return statSync(f).isDirectory() ? list(f) : n.endsWith(".md") ? [f] : [];
  });
})(dir);
const lessons: ParsedLesson[] = files.map((f) =>
  parseLesson(readFileSync(f, "utf8"), relative(process.cwd(), f)),
);
const lessonSlugs = new Set(lessons.map((l) => l.slug));
const moduleSlugs = new Set(CURRICULUM.flatMap((p) => p.modules.map((m) => m.slug)));
const problemSlugs = new Set(PROBLEMS.map((p) => p.slug));
const labSlugs = new Set(LABS.map((l) => l.slug));

describe("lessons", () => {
  it("all parse and have unique slugs", () => {
    expect(lessons.length).toBeGreaterThan(0);
    expect(new Set(lessons.map((l) => l.slug)).size).toBe(lessons.length);
  });
  it("reference existing paths, modules, prerequisites and problems", () => {
    for (const l of lessons) {
      expect(
        CURRICULUM.find((p) => p.slug === l.path),
        `${l.slug} path`,
      ).toBeTruthy();
      expect(moduleSlugs.has(l.module), `${l.slug} module ${l.module}`).toBe(true);
      for (const pre of l.prerequisites)
        expect(lessonSlugs.has(pre), `${l.slug} prerequisite ${pre}`).toBe(true);
      for (const p of l.problems) expect(problemSlugs.has(p), `${l.slug} problem ${p}`).toBe(true);
    }
  });
  it("keep lesson file location consistent with the declared path", () => {
    for (const f of files) {
      const l = lessons[files.indexOf(f)]!;
      expect(f.includes(`/lessons/${l.path}/`), `${f} should live in content/lessons/${l.path}/`).toBe(true);
    }
  });
  it("every module has at least one lesson", () => {
    for (const m of moduleSlugs)
      expect(
        lessons.some((l) => l.module === m),
        `module ${m} has no lessons`,
      ).toBe(true);
  });
});

describe("problems", () => {
  it("have tests that match the signature arity and reference existing topics", () => {
    for (const p of PROBLEMS) {
      for (const t of p.tests) expect(t.args.length, `${p.slug}/${t.name}`).toBe(p.signature.params.length);
      for (const topic of p.topics) expect(lessonSlugs.has(topic), `${p.slug} topic ${topic}`).toBe(true);
      expect(p.hints.length).toBeGreaterThanOrEqual(3);
      expect(Object.keys(p.solutions).sort()).toEqual(["java", "python", "typescript"]);
    }
  });
});

describe("labs", () => {
  it("have compilable verification patterns and existing topics", () => {
    for (const lab of LABS) {
      for (const s of lab.steps) {
        if (s.verification.kind === "paste" && s.verification.pattern) {
          expect(
            () =>
              new RegExp(
                s.verification.kind === "paste" ? s.verification.pattern!.replace(/^\(\?i\)/, "") : "",
                "i",
              ),
          ).not.toThrow();
        }
      }
      for (const t of lab.topics) expect(lessonSlugs.has(t), `${lab.slug} topic ${t}`).toBe(true);
      expect(lab.reflectionQuestions.length).toBeGreaterThan(0);
    }
  });
});

describe("companies, plan and projects", () => {
  it("company focus topics and problems exist", () => {
    for (const c of COMPANIES) {
      for (const slug of Object.keys(c.focus))
        expect(lessonSlugs.has(slug), `${c.slug} focus ${slug}`).toBe(true);
      for (const p of c.problems) expect(problemSlugs.has(p), `${c.slug} problem ${p}`).toBe(true);
    }
  });
  it("plan tasks reference existing lessons, problems and labs", () => {
    for (const s of INTERVIEW_SPRINT.sessions) {
      for (const t of s.tasks) {
        if (t.kind === "lesson") expect(lessonSlugs.has(t.refSlug!), `plan lesson ${t.refSlug}`).toBe(true);
        if (t.kind === "problem")
          expect(problemSlugs.has(t.refSlug!), `plan problem ${t.refSlug}`).toBe(true);
        if (t.kind === "lab") expect(labSlugs.has(t.refSlug!), `plan lab ${t.refSlug}`).toBe(true);
      }
    }
    expect(INTERVIEW_SPRINT.sessions).toHaveLength(14);
  });
  it("seeded projects contain no invented metrics", () => {
    for (const p of PROJECTS)
      expect(`${p.result} ${p.problem}`).not.toMatch(/\d+\s?%|\d+x faster|reduced .* by \d/i);
  });
});
