import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { parseCsv } from "./csv";
import {
  extractPatternProblems,
  leetcodeSlug,
  parseCompanyCsv,
  parsePatternFilename,
  slugify,
  titleFromSlug,
  windowFromFilename,
} from "./parse";
import { emptyModel, readCompanyLists, readPatterns } from "./read-sources";
import { visualizerKey, visualizerUrl } from "./visualizer";

const FIXTURES = join(process.cwd(), "e2e", "fixtures", "problem-bank");

describe("parseCsv", () => {
  it("handles quoted commas, escaped quotes, CRLF, a BOM and a trailing newline", () => {
    const text = '﻿a,b,c\r\n1,"x, y","say ""hi"""\r\n2,,last\n';
    expect(parseCsv(text)).toEqual([
      ["a", "b", "c"],
      ["1", "x, y", 'say "hi"'],
      ["2", "", "last"],
    ]);
  });
});

describe("dataset parsing", () => {
  it("maps file names to time windows", () => {
    expect(windowFromFilename("1. Thirty Days.csv")).toBe("30d");
    expect(windowFromFilename("2. Three Months.csv")).toBe("3m");
    expect(windowFromFilename("3. Six Months.csv")).toBe("6m");
    expect(windowFromFilename("4. More Than Six Months.csv")).toBe("6m_plus");
    expect(windowFromFilename("5. All.csv")).toBe("all");
    expect(windowFromFilename("6. Bonus.csv")).toBeNull();
  });

  it("extracts LeetCode slugs and builds names", () => {
    expect(leetcodeSlug("https://leetcode.com/problems/two-sum")).toBe("two-sum");
    expect(leetcodeSlug("https://leetcode.com/problems/Two-Sum/description/")).toBe("two-sum");
    expect(leetcodeSlug("https://example.com/problems/two-sum")).toBeNull();
    expect(slugify("Fast & Slow pointers")).toBe("fast-and-slow-pointers");
    expect(slugify("AQR Capital Management")).toBe("aqr-capital-management");
    expect(titleFromSlug("fruit-into-baskets")).toBe("Fruit Into Baskets");
  });

  it("parses company CSV rows, skipping invalid ones and ignoring the acceptance column", () => {
    const csv = [
      "Difficulty,Title,Frequency,Acceptance Rate,Link,Topics",
      'MEDIUM,Merge Intervals,92.34,0.0053,https://leetcode.com/problems/merge-intervals,"Array, Sorting"',
      'SUPERHARD,Broken,abc,0,https://example.com/x,""',
    ].join("\n");
    const { rows, skipped } = parseCompanyCsv(csv);
    expect(skipped).toBe(1);
    expect(rows).toEqual([
      {
        slug: "merge-intervals",
        title: "Merge Intervals",
        url: "https://leetcode.com/problems/merge-intervals/",
        difficulty: "medium",
        frequency: 92.3,
        tags: ["Array", "Sorting"],
      },
    ]);
  });

  it("parses the real pattern file names", () => {
    const names = [
      "✅  Pattern 01 : Sliding Window.md",
      "✅  Pattern 03: Fast & Slow pointers.md",
      "✅  Pattern 08:Tree Depth First Search.md",
      "✅ 🙃 Pattern 09: Two Heaps.md",
      "✅ Pattern 12:  Bitwise XOR.md",
      "✅ Pattern 13: Top 'K' Elements.md",
      "✅ Pattern 15: 0-1 Knapsack (Dynamic Programming).md",
      "✅ Pattern 16: 🔎 Topological Sort (Graph).md",
      "Pattern 01 - Sliding Window.md",
    ];
    expect(names.map(parsePatternFilename)).toEqual([
      { position: 1, name: "Sliding Window" },
      { position: 3, name: "Fast & Slow pointers" },
      { position: 8, name: "Tree Depth First Search" },
      { position: 9, name: "Two Heaps" },
      { position: 12, name: "Bitwise XOR" },
      { position: 13, name: "Top 'K' Elements" },
      { position: 15, name: "0-1 Knapsack (Dynamic Programming)" },
      { position: 16, name: "Topological Sort (Graph)" },
      { position: 1, name: "Sliding Window" },
    ]);
    expect(parsePatternFilename("README.md")).toBeNull();
  });

  it("extracts unique LeetCode links from pattern notes in order", () => {
    const md =
      "x https://leetcode.com/problems/b-problem/ y https://leetcode.com/problems/a-problem z https://leetcode.com/problems/b-problem/";
    expect(extractPatternProblems(md)).toEqual(["b-problem", "a-problem"]);
  });
});

describe("reading sources (fixtures)", () => {
  const model = emptyModel();
  readCompanyLists(join(FIXTURES, "leetcode-company-wise-problems"), model);
  readPatterns(join(FIXTURES, "coding-patterns"), model);

  it("reads companies with data, entries per window and counts problems once", () => {
    expect(model.companies.map((c) => c.name)).toEqual(["Acme Robotics", "Apple", "Microsoft"]);
    const microsoft = model.companies.find((c) => c.name === "Microsoft")!;
    expect(microsoft.entries.filter((e) => e.window === "30d")).toHaveLength(2);
    expect(microsoft.entries.filter((e) => e.window === "all")).toHaveLength(6);
    expect(model.skippedRows).toBe(1);
    expect(model.warnings).toEqual(["Unknown time window file: Microsoft/6. Bonus.csv"]);
  });

  it("adds pattern-only problems with unknown difficulty instead of guessing", () => {
    expect(model.patterns.map((p) => [p.position, p.slug, p.problems.length])).toEqual([
      [1, "sliding-window", 3],
      [16, "topological-sort-graph", 2],
    ]);
    expect(model.problems.get("fruit-into-baskets")).toMatchObject({
      title: "Fruit Into Baskets",
      difficulty: null,
      tags: [],
    });
    expect(model.problems.get("minimum-window-substring")).toMatchObject({ difficulty: "hard" });
    expect(model.problems.size).toBe(10);
  });
});

describe("algorithm-visualizer links", () => {
  it("uses the same key rule as the visualizer server", () => {
    expect(visualizerKey("Knight's Tour Problem")).toBe("knights-tour-problem");
    expect(visualizerKey("Boyer–Moore's Majority Vote")).toBe("boyermoores-majority-vote");
    expect(visualizerKey("Bellman-Ford's Shortest Path")).toBe("bellman-fords-shortest-path");
    expect(visualizerUrl("Brute Force", "Breadth-First Search")).toBe(
      "https://algorithm-visualizer.org/brute-force/breadth-first-search",
    );
  });
});
