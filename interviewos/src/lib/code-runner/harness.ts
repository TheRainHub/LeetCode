import type { Comparator, Language, ProblemSignature, ProblemTest, ValueType } from "@/lib/content/types";
import { canonicalJson } from "./canonical";

/**
 * Generates self-contained, locally runnable test harnesses. The user runs
 * them on their own machine (`java Main.java`, `python3 solution_test.py`,
 * `npx tsx solution.test.ts`) and pastes the output back; nothing is executed
 * by the InterviewOS server.
 *
 * Output protocol (parsed by `parseHarnessOutput`):
 *   #<n> PASS <name>
 *   #<n> FAIL <name> expected=<json> actual=<json>
 *   #<n> ERROR <name> <message>
 *   SUMMARY <passed>/<total>
 */

export interface HarnessInput {
  code: string;
  signature: ProblemSignature;
  comparator: Comparator;
  tests: ProblemTest[];
}

export const HARNESS_FILENAMES: Record<Language, string> = {
  java: "Main.java",
  python: "solution_test.py",
  typescript: "solution.test.ts",
};

export const HARNESS_COMMANDS: Record<Language, string> = {
  java: "java Main.java",
  python: "python3 solution_test.py",
  typescript: "npx tsx solution.test.ts",
};

/* ---------------------------- literals ---------------------------- */

function jsonString(s: string): string {
  return JSON.stringify(s);
}

function asLinkedListArg(value: unknown): { values: number[]; pos: number } {
  const v = value as { values?: unknown; pos?: unknown };
  if (!v || !Array.isArray(v.values) || typeof v.pos !== "number") {
    throw new Error("linkedListWithCycle arguments must look like { values: number[], pos: number }");
  }
  return { values: v.values as number[], pos: v.pos };
}

export function javaLiteral(value: unknown, type: ValueType): string {
  switch (type) {
    case "int":
      return String(value as number);
    case "boolean":
      return String(Boolean(value));
    case "string":
      return jsonString(value as string);
    case "int[]":
      return `new int[]{${(value as number[]).join(", ")}}`;
    case "int[][]":
      return `new int[][]{${(value as number[][]).map((r) => `{${r.join(", ")}}`).join(", ")}}`;
    case "string[]":
      return `new String[]{${(value as string[]).map(jsonString).join(", ")}}`;
    case "char[][]":
      return `new char[][]{${(value as string[][])
        .map((r) => `{${r.map((c) => `'${c === "'" ? "\\'" : c === "\\" ? "\\\\" : c}'`).join(", ")}}`)
        .join(", ")}}`;
    case "string[][]":
      return `java.util.Arrays.asList(${(value as string[][])
        .map((r) => `java.util.Arrays.asList(${r.map(jsonString).join(", ")})`)
        .join(", ")})`;
    case "linkedListWithCycle": {
      const { values, pos } = asLinkedListArg(value);
      return `Harness.buildList(new int[]{${values.join(", ")}}, ${pos})`;
    }
  }
}

export function pythonLiteral(value: unknown, type: ValueType): string {
  switch (type) {
    case "boolean":
      return value ? "True" : "False";
    case "int":
      return String(value as number);
    case "linkedListWithCycle": {
      const { values, pos } = asLinkedListArg(value);
      return `_build_list([${values.join(", ")}], ${pos})`;
    }
    default:
      // JSON arrays of numbers/strings are valid Python literals.
      return JSON.stringify(value);
  }
}

export function tsLiteral(value: unknown, type: ValueType): string {
  if (type === "linkedListWithCycle") {
    const { values, pos } = asLinkedListArg(value);
    return `buildList(${JSON.stringify(values)}, ${pos})`;
  }
  return JSON.stringify(value);
}

/* ------------------------------ Java ------------------------------ */

const JAVA_RUNTIME = String.raw`
final class Harness {
    static ListNode buildList(int[] values, int pos) {
        ListNode dummy = new ListNode(0), tail = dummy, cycleTarget = null;
        for (int i = 0; i < values.length; i++) {
            tail.next = new ListNode(values[i]);
            tail = tail.next;
            if (i == pos) cycleTarget = tail;
        }
        if (pos >= 0) tail.next = cycleTarget;
        return dummy.next;
    }

    static Object norm(Object v) {
        if (v == null) return null;
        if (v instanceof Boolean || v instanceof String) return v;
        if (v instanceof Character) return String.valueOf(v);
        if (v instanceof Number) return ((Number) v).longValue();
        if (v instanceof int[]) { java.util.List<Object> l = new java.util.ArrayList<>(); for (int x : (int[]) v) l.add((long) x); return l; }
        if (v instanceof long[]) { java.util.List<Object> l = new java.util.ArrayList<>(); for (long x : (long[]) v) l.add(x); return l; }
        if (v instanceof char[]) { java.util.List<Object> l = new java.util.ArrayList<>(); for (char x : (char[]) v) l.add(String.valueOf(x)); return l; }
        if (v instanceof boolean[]) { java.util.List<Object> l = new java.util.ArrayList<>(); for (boolean x : (boolean[]) v) l.add(x); return l; }
        if (v instanceof Object[]) { java.util.List<Object> l = new java.util.ArrayList<>(); for (Object x : (Object[]) v) l.add(norm(x)); return l; }
        if (v instanceof Iterable) { java.util.List<Object> l = new java.util.ArrayList<>(); for (Object x : (Iterable<?>) v) l.add(norm(x)); return l; }
        return String.valueOf(v);
    }

    static String json(Object v) {
        if (v == null) return "null";
        if (v instanceof String) return quote((String) v);
        if (v instanceof java.util.List) {
            StringBuilder sb = new StringBuilder("[");
            boolean first = true;
            for (Object x : (java.util.List<?>) v) { if (!first) sb.append(','); sb.append(json(x)); first = false; }
            return sb.append(']').toString();
        }
        return String.valueOf(v);
    }

    static String quote(String s) {
        StringBuilder sb = new StringBuilder("\"");
        for (char c : s.toCharArray()) {
            switch (c) {
                case '"': sb.append("\\\""); break;
                case '\\': sb.append("\\\\"); break;
                case '\n': sb.append("\\n"); break;
                case '\r': sb.append("\\r"); break;
                case '\t': sb.append("\\t"); break;
                case '\b': sb.append("\\b"); break;
                case '\f': sb.append("\\f"); break;
                default:
                    if (c < 0x20) sb.append(String.format("\\u%04x", (int) c)); else sb.append(c);
            }
        }
        return sb.append('"').toString();
    }

    @SuppressWarnings("unchecked")
    static java.util.List<Object> sorted(java.util.List<Object> l) {
        java.util.List<Object> copy = new java.util.ArrayList<>(l);
        copy.sort((a, b) -> json(a).compareTo(json(b)));
        return copy;
    }

    @SuppressWarnings("unchecked")
    static String canon(Object value, String mode) {
        Object n = norm(value);
        if (n instanceof java.util.List) {
            java.util.List<Object> l = (java.util.List<Object>) n;
            if (mode.equals("unorderedList")) n = sorted(l);
            if (mode.equals("unorderedNested")) {
                java.util.List<Object> inner = new java.util.ArrayList<>();
                for (Object x : l) inner.add(x instanceof java.util.List ? sorted((java.util.List<Object>) x) : x);
                n = sorted(inner);
            }
        }
        return json(n);
    }
}
`;

const JAVA_LISTNODE = `
class ListNode {
    int val;
    ListNode next;
    ListNode(int x) { val = x; }
}
`;

const JAVA_IMPORT_RE = /^\s*import\s+(static\s+)?[\w.]+(\.\*)?\s*;\s*$/gm;

/** Imports must precede all type declarations, so they are hoisted to the top of the harness. */
function javaImports(code: string): string[] {
  const found = code.match(JAVA_IMPORT_RE) ?? [];
  return [...new Set(["import java.util.*;", ...found.map((l) => l.trim())])];
}

function stripJavaUserCode(code: string): string {
  let out = code.replace(JAVA_IMPORT_RE, "").replace(/^\s*package\s+[\w.]+\s*;\s*$/gm, "");
  out = out.replace(/\bpublic\s+(final\s+)?class\s+/g, "class ");
  // The harness always provides ListNode; drop a user-declared copy to avoid duplicates.
  out = out.replace(/^\s*(public\s+)?class\s+ListNode\s*\{[^}]*\}\s*$/m, "");
  return out;
}

export function generateJavaHarness(input: HarnessInput): string {
  const { signature: sig } = input;
  const cases = input.tests
    .map((t, i) => {
      const n = i + 1;
      const args = sig.params.map((p, j) => javaLiteral(t.args[j], p.type)).join(", ");
      const expected = canonicalJson(t.expected, input.comparator);
      return `        try {
            Object actual = new Solution().${sig.method}(${args});
            String got = Harness.canon(actual, ${jsonString(input.comparator)});
            String exp = ${jsonString(expected)};
            if (got.equals(exp)) { passed++; System.out.println("#${n} PASS " + ${jsonString(t.name)}); }
            else System.out.println("#${n} FAIL " + ${jsonString(t.name)} + " expected=" + exp + " actual=" + got);
        } catch (Throwable e) {
            System.out.println("#${n} ERROR " + ${jsonString(t.name)} + " " + e);
        }`;
    })
    .join("\n");

  return `// Generated by InterviewOS — run locally with:  java Main.java   (JDK 17+)
// Nothing here was executed by InterviewOS. Paste the output back into the app.
${javaImports(input.code).join("\n")}

public class Main {
    public static void main(String[] args) {
        int passed = 0;
        int total = ${input.tests.length};
${cases}
        System.out.println("SUMMARY " + passed + "/" + total);
    }
}
${JAVA_RUNTIME}${JAVA_LISTNODE}
// ---------------- your solution ----------------
${stripJavaUserCode(input.code)}
`;
}

/* ----------------------------- Python ----------------------------- */

const PYTHON_RUNTIME = `
def _norm(v):
    if v is None or isinstance(v, (bool, str)):
        return v
    if isinstance(v, int):
        return int(v)
    if isinstance(v, (list, tuple, set, frozenset)):
        return [_norm(x) for x in v]
    return str(v)


def _json(v):
    return json.dumps(v, separators=(",", ":"), ensure_ascii=False)


def _sorted(items):
    return sorted(items, key=_json)


def _canon(value, mode):
    n = _norm(value)
    if isinstance(n, list):
        if mode == "unorderedList":
            n = _sorted(n)
        elif mode == "unorderedNested":
            n = _sorted([_sorted(x) if isinstance(x, list) else x for x in n])
    return _json(n)


def _build_list(values, pos):
    dummy = ListNode(0)
    tail, target = dummy, None
    for i, x in enumerate(values):
        tail.next = ListNode(x)
        tail = tail.next
        if i == pos:
            target = tail
    if pos >= 0:
        tail.next = target
    return dummy.next
`;

export function generatePythonHarness(input: HarnessInput): string {
  const { signature: sig } = input;
  const cases = input.tests
    .map((t) => {
      const args = sig.params.map((p, j) => pythonLiteral(t.args[j], p.type)).join(", ");
      const expected = canonicalJson(t.expected, input.comparator);
      return `    (${JSON.stringify(t.name)}, lambda: Solution().${sig.method}(${args}), ${JSON.stringify(expected)}),`;
    })
    .join("\n");

  return `# Generated by InterviewOS — run locally with:  python3 solution_test.py
# Nothing here was executed by InterviewOS. Paste the output back into the app.
from typing import *
import json


class ListNode:
    def __init__(self, x=0, next=None):
        self.val = x
        self.next = next


# ---------------- your solution ----------------
${input.code}

# ---------------- generated harness ----------------
${PYTHON_RUNTIME}

_TESTS = [
${cases}
]

if __name__ == "__main__":
    passed = 0
    for i, (name, call, expected) in enumerate(_TESTS, start=1):
        try:
            got = _canon(call(), ${JSON.stringify(input.comparator)})
            if got == expected:
                passed += 1
                print(f"#{i} PASS {name}")
            else:
                print(f"#{i} FAIL {name} expected={expected} actual={got}")
        except Exception as e:  # noqa: BLE001
            print(f"#{i} ERROR {name} {type(e).__name__}: {e}")
    print(f"SUMMARY {passed}/{len(_TESTS)}")
`;
}

/* --------------------------- TypeScript --------------------------- */

export function generateTypeScriptHarness(input: HarnessInput): string {
  const { signature: sig } = input;
  const cases = input.tests
    .map((t) => {
      const args = sig.params.map((p, j) => tsLiteral(t.args[j], p.type)).join(", ");
      return `  [${JSON.stringify(t.name)}, () => ${sig.method}(${args}), ${JSON.stringify(
        canonicalJson(t.expected, input.comparator),
      )}],`;
    })
    .join("\n");
  return `// Generated by InterviewOS — run locally with:  npx tsx solution.test.ts
// Nothing here was executed by InterviewOS. Paste the output back into the app.
class ListNode {
  val: number;
  next: ListNode | null;
  constructor(val = 0, next: ListNode | null = null) {
    this.val = val;
    this.next = next;
  }
}
function buildList(values: number[], pos: number): ListNode | null {
  const dummy = new ListNode(0);
  let tail = dummy;
  let target: ListNode | null = null;
  values.forEach((v, i) => {
    tail.next = new ListNode(v);
    tail = tail.next;
    if (i === pos) target = tail;
  });
  if (pos >= 0) tail.next = target;
  return dummy.next;
}
type Json = null | boolean | number | string | Json[];
function norm(v: unknown): Json {
  if (v === null || v === undefined) return null;
  if (typeof v === "boolean" || typeof v === "string" || typeof v === "number") return v;
  if (Array.isArray(v)) return v.map(norm);
  if (v instanceof Set) return [...v].map(norm);
  return String(v);
}
const byJson = (a: Json, b: Json) => (JSON.stringify(a) < JSON.stringify(b) ? -1 : JSON.stringify(a) > JSON.stringify(b) ? 1 : 0);
function canon(value: unknown, mode: string): string {
  let n = norm(value);
  if (Array.isArray(n)) {
    if (mode === "unorderedList") n = [...n].sort(byJson);
    if (mode === "unorderedNested") n = n.map((x) => (Array.isArray(x) ? [...x].sort(byJson) : x)).sort(byJson);
  }
  return JSON.stringify(n);
}

// ---------------- your solution ----------------
${input.code.replace(/^\s*export\s+(default\s+)?/gm, "")}

// ---------------- generated harness ----------------
const tests: [string, () => unknown, string][] = [
${cases}
];
let passed = 0;
tests.forEach(([name, call, expected], i) => {
  try {
    const got = canon(call(), ${JSON.stringify(input.comparator)});
    if (got === expected) {
      passed++;
      console.log(\`#\${i + 1} PASS \${name}\`);
    } else console.log(\`#\${i + 1} FAIL \${name} expected=\${expected} actual=\${got}\`);
  } catch (e) {
    console.log(\`#\${i + 1} ERROR \${name} \${e}\`);
  }
});
console.log(\`SUMMARY \${passed}/\${tests.length}\`);
`;
}

export function generateHarness(language: Language, input: HarnessInput): string {
  switch (language) {
    case "java":
      return generateJavaHarness(input);
    case "python":
      return generatePythonHarness(input);
    case "typescript":
      return generateTypeScriptHarness(input);
  }
}

/* ------------------------- output parsing ------------------------- */

export interface ParsedHarnessOutput {
  results: { index: number; name: string; passed: boolean; detail?: string }[];
  summary: { passed: number; total: number } | null;
  /** True when the output looks complete and consistent. */
  valid: boolean;
}

export function parseHarnessOutput(output: string, testNames: string[]): ParsedHarnessOutput {
  const results: ParsedHarnessOutput["results"] = [];
  let summary: ParsedHarnessOutput["summary"] = null;
  for (const raw of output.split(/\r?\n/)) {
    const line = raw.trim();
    const m = /^#(\d+)\s+(PASS|FAIL|ERROR)\b\s?(.*)$/.exec(line);
    if (m) {
      const index = Number(m[1]);
      const name = testNames[index - 1] ?? `Test ${index}`;
      const rest = (m[3] ?? "").trim();
      const detail = rest.startsWith(name) ? rest.slice(name.length).trim() : rest;
      results.push({ index, name, passed: m[2] === "PASS", detail: detail || undefined });
      continue;
    }
    const s = /^SUMMARY\s+(\d+)\/(\d+)$/.exec(line);
    if (s) summary = { passed: Number(s[1]), total: Number(s[2]) };
  }
  const valid =
    summary !== null &&
    summary.total === testNames.length &&
    results.length === summary.total &&
    results.filter((r) => r.passed).length === summary.passed;
  return { results, summary, valid };
}
