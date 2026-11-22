import { describe, expect, it } from "vitest";
import { filterFoundJobs, groundAnalysis, isQuotedFrom, matchCompany, normalizeUrl } from "./grounding";
import { autoSearchInputSchema, type FoundJob, type JobAnalysis, nextRunAfter } from "./model";

const job = (over: Partial<FoundJob>): FoundJob => ({
  title: "Graduate Software Engineer",
  company: "Acme",
  location: "Prague",
  workMode: "hybrid",
  level: "graduate",
  url: "https://jobs.example.com/acme/123",
  summary: "",
  whyFit: "",
  concerns: "",
  deadline: "",
  ...over,
});

const analysis = (over: Partial<JobAnalysis["resume"]> = {}): JobAnalysis => ({
  summary: "s",
  fit: { score: 140, verdict: "good", reasoning: "r" },
  requirements: [],
  resume: {
    headline: "",
    emphasize: [],
    deemphasize: [],
    keywordsPresent: ["Java", "Java"],
    keywordsMissing: [],
    rewrites: [],
    gaps: [],
    ...over,
  },
  preparation: {
    focusAreas: [
      {
        area: "Caching",
        why: "",
        priority: "high",
        lessons: ["caching", "made-up"],
        sdQuestions: ["url-shortener", "nope"],
      },
    ],
    stories: [],
    process: "",
    processBasis: "sources",
    questionsToAsk: [],
  },
  pitch: "",
  redFlags: [],
});

describe("normalizeUrl", () => {
  it("ignores case of the host, www, fragments, tracking parameters and trailing slashes", () => {
    expect(normalizeUrl("https://WWW.Example.com/jobs/1/?utm_source=x&b=2&a=1#apply")).toBe(
      "example.com/jobs/1?a=1&b=2",
    );
    expect(normalizeUrl("ftp://example.com")).toBeNull();
    expect(normalizeUrl("not a url")).toBeNull();
  });
});

describe("filterFoundJobs", () => {
  it("keeps only suggestions whose link was among the pages read, without duplicates", () => {
    const sources = [
      { url: "https://jobs.example.com/acme/123?utm_campaign=x", title: "Acme" },
      { url: "https://careers.beta.cz/role/7", title: "Beta" },
    ];
    const { jobs, dropped } = filterFoundJobs(
      [
        job({}),
        job({ url: "https://jobs.example.com/acme/123/" }),
        job({ company: "Beta", url: "https://careers.beta.cz/role/7" }),
        job({ company: "Ghost", url: "https://invented.example.org/job" }),
      ],
      sources,
    );
    expect(jobs.map((j) => j.company)).toEqual(["Acme", "Beta"]);
    expect(dropped).toBe(1);
  });
});

describe("groundAnalysis", () => {
  const resume =
    "Experience\n- Built an internal integration service in TypeScript used by 3 teams\n- Wrote unit tests";

  it("drops rewrites that do not quote the résumé and lesson links that do not exist", () => {
    const { analysis: a, droppedRewrites } = groundAnalysis(
      analysis({
        rewrites: [
          {
            original: "Built an internal integration service in TypeScript used by 3 teams",
            suggested: "Designed and built a TypeScript integration service adopted by three teams",
            why: "",
          },
          { original: "Led a team of 10 engineers", suggested: "Led 10 engineers", why: "" },
          { original: "Wrote unit tests", suggested: "Wrote unit tests", why: "" },
        ],
      }),
      { resume, lessonSlugs: new Set(["caching"]), sdSlugs: new Set(["url-shortener"]), hasSources: false },
    );
    expect(a.resume.rewrites).toHaveLength(1);
    expect(droppedRewrites).toBe(2);
    expect(a.fit.score).toBe(100);
    expect(a.resume.keywordsPresent).toEqual(["Java"]);
    expect(a.preparation.focusAreas[0]!.lessons).toEqual(["caching"]);
    expect(a.preparation.focusAreas[0]!.sdQuestions).toEqual(["url-shortener"]);
    expect(a.preparation.processBasis).toBe("general");
  });

  it("matches quotes despite bullets, quotes and whitespace", () => {
    expect(isQuotedFrom("• Built an internal   integration service", resume)).toBe(true);
    expect(isQuotedFrom("Built", resume)).toBe(false);
  });
});

describe("matchCompany", () => {
  it("links a posting to a company track by name, ignoring legal suffixes", () => {
    const tracks = [
      { slug: "barclays", name: "Barclays" },
      { slug: "make", name: "Make" },
    ];
    expect(matchCompany("Barclays Bank PLC", tracks)).toBe("barclays");
    expect(matchCompany("barclays", tracks)).toBe("barclays");
    expect(matchCompany("Make s.r.o.", tracks)).toBe("make");
    expect(matchCompany("Makeover Studio", tracks)).toBeNull();
    expect(matchCompany("", tracks)).toBeNull();
  });
});

describe("automatic search schedule", () => {
  it("computes the next run from the interval", () => {
    const from = new Date("2026-11-22T10:00:00Z");
    expect(nextRunAfter(from, 1).toISOString()).toBe("2026-11-23T10:00:00.000Z");
    expect(nextRunAfter(from, 7).toISOString()).toBe("2026-11-29T10:00:00.000Z");
  });
  it("accepts only the offered intervals", () => {
    const criteria = { roles: "x", locations: "", workModes: [], levels: [], focus: "" };
    expect(autoSearchInputSchema.safeParse({ name: "a", criteria, intervalDays: 3 }).success).toBe(true);
    expect(autoSearchInputSchema.safeParse({ name: "a", criteria, intervalDays: 2 }).success).toBe(false);
    expect(autoSearchInputSchema.safeParse({ name: " ", criteria, intervalDays: 7 }).success).toBe(false);
  });
});
