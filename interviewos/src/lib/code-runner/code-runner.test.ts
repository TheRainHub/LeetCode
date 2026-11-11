import { describe, expect, it } from "vitest";
import { canonicalJson, valuesEqual } from "./canonical";
import {
  generateJavaHarness,
  generatePythonHarness,
  javaLiteral,
  parseHarnessOutput,
  pythonLiteral,
} from "./harness";
import { starterCode } from "./starter";
import { WORKER_SOURCE } from "./worker-source";

describe("canonical comparison", () => {
  it("compares unordered lists and nested groups independent of order", () => {
    expect(valuesEqual([1, 0], [0, 1], "unorderedList")).toBe(true);
    expect(valuesEqual([1, 0], [0, 1], "exact")).toBe(false);
    expect(valuesEqual([["tea", "eat"], ["bat"]], [["bat"], ["eat", "tea"]], "unorderedNested")).toBe(true);
    expect(valuesEqual([["a", "b"]], [["a"], ["b"]], "unorderedNested")).toBe(false);
  });

  it("normalizes Sets and keeps booleans/strings distinct from numbers", () => {
    expect(canonicalJson(new Set([3, 1]), "unorderedList")).toBe("[1,3]");
    expect(valuesEqual(true, 1, "exact")).toBe(false);
    expect(valuesEqual("1", 1, "exact")).toBe(false);
  });

  it("uses the same canonicalization inside the browser worker", () => {
    // Evaluate the worker's helper functions in isolation and compare with canonical.ts.
    const helpers = WORKER_SOURCE.slice(
      WORKER_SOURCE.indexOf("function norm"),
      WORKER_SOURCE.indexOf("function fmt"),
    );
    const canon = new Function(`${helpers}; return canon;`)() as (v: unknown, mode: string) => string;
    const cases: [unknown, "exact" | "unorderedList" | "unorderedNested"][] = [
      [[3, 1, 2], "unorderedList"],
      [[["b", "a"], ["c"]], "unorderedNested"],
      [{ toString: () => "x" }, "exact"],
      [
        [
          [1, 6],
          [8, 10],
        ],
        "unorderedList",
      ],
      [null, "exact"],
      [false, "exact"],
    ];
    for (const [v, mode] of cases) expect(canon(v, mode)).toBe(canonicalJson(v, mode));
  });
});

describe("harness generation", () => {
  const sig = {
    method: "twoSum",
    params: [
      { name: "nums", type: "int[]" as const },
      { name: "target", type: "int" as const },
    ],
    returns: "int[]" as const,
  };

  it("produces language literals", () => {
    expect(javaLiteral([1, 2], "int[]")).toBe("new int[]{1, 2}");
    expect(javaLiteral([["1", "0"]], "char[][]")).toBe("new char[][]{{'1', '0'}}");
    expect(javaLiteral({ values: [1, 2], pos: 0 }, "linkedListWithCycle")).toBe(
      "Harness.buildList(new int[]{1, 2}, 0)",
    );
    expect(pythonLiteral(true, "boolean")).toBe("True");
    expect(pythonLiteral({ values: [3], pos: -1 }, "linkedListWithCycle")).toBe("_build_list([3], -1)");
  });

  it("hoists user imports above the harness and strips public from the solution class", () => {
    const java = generateJavaHarness({
      code: "import java.util.*;\nimport java.util.stream.*;\n\npublic class Solution { public int[] twoSum(int[] a, int t) { return a; } }",
      signature: sig,
      comparator: "unorderedList",
      tests: [{ name: "t1", args: [[2, 7], 9], expected: [0, 1] }],
    });
    const firstClass = java.indexOf("public class Main");
    expect(java.indexOf("import java.util.stream.*;")).toBeLessThan(firstClass);
    expect(java.lastIndexOf("import ")).toBeLessThan(firstClass);
    expect(java).toContain("class Solution {");
    expect(java).not.toContain("public class Solution");
    expect(java).toContain('String exp = "[0,1]";');
  });

  it("embeds the canonical expected value in Python harnesses", () => {
    const py = generatePythonHarness({
      code: "class Solution: pass",
      signature: sig,
      comparator: "unorderedList",
      tests: [{ name: "t1", args: [[2, 7], 9], expected: [1, 0] }],
    });
    expect(py).toContain('Solution().twoSum([2,7], 9), "[0,1]"');
  });

  it("generates compilable-looking starter code for every language", () => {
    expect(starterCode("java", sig)).toContain("public int[] twoSum(int[] nums, int target)");
    expect(starterCode("python", sig)).toContain(
      "def twoSum(self, nums: List[int], target: int) -> List[int]:",
    );
    expect(starterCode("typescript", sig)).toContain(
      "function twoSum(nums: number[], target: number): number[]",
    );
  });
});

describe("parseHarnessOutput", () => {
  const names = ["example 1", "example 2"];
  it("accepts complete output", () => {
    const r = parseHarnessOutput(
      "#1 PASS example 1\n#2 FAIL example 2 expected=[1] actual=[2]\nSUMMARY 1/2\n",
      names,
    );
    expect(r.valid).toBe(true);
    expect(r.results).toEqual([
      { index: 1, name: "example 1", passed: true, detail: undefined },
      { index: 2, name: "example 2", passed: false, detail: "expected=[1] actual=[2]" },
    ]);
  });
  it("rejects incomplete or inconsistent output", () => {
    expect(parseHarnessOutput("#1 PASS example 1\nSUMMARY 1/2", names).valid).toBe(false);
    expect(parseHarnessOutput("#1 PASS a\n#2 PASS b\nSUMMARY 1/2", names).valid).toBe(false);
    expect(parseHarnessOutput("#1 PASS a\n#2 PASS b", names).valid).toBe(false);
  });
});
