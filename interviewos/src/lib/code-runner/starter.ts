import type { Language, ProblemSignature, ValueType } from "@/lib/content/types";

const JAVA_TYPES: Record<ValueType, string> = {
  int: "int",
  "int[]": "int[]",
  "int[][]": "int[][]",
  string: "String",
  "string[]": "String[]",
  "string[][]": "List<List<String>>",
  "char[][]": "char[][]",
  boolean: "boolean",
  linkedListWithCycle: "ListNode",
};

const JAVA_DEFAULTS: Record<ValueType, string> = {
  int: "0",
  "int[]": "new int[0]",
  "int[][]": "new int[0][]",
  string: '""',
  "string[]": "new String[0]",
  "string[][]": "new ArrayList<>()",
  "char[][]": "new char[0][]",
  boolean: "false",
  linkedListWithCycle: "null",
};

const PY_TYPES: Record<ValueType, string> = {
  int: "int",
  "int[]": "List[int]",
  "int[][]": "List[List[int]]",
  string: "str",
  "string[]": "List[str]",
  "string[][]": "List[List[str]]",
  "char[][]": "List[List[str]]",
  boolean: "bool",
  linkedListWithCycle: "Optional[ListNode]",
};

const TS_TYPES: Record<ValueType, string> = {
  int: "number",
  "int[]": "number[]",
  "int[][]": "number[][]",
  string: "string",
  "string[]": "string[]",
  "string[][]": "string[][]",
  "char[][]": "string[][]",
  boolean: "boolean",
  linkedListWithCycle: "ListNode | null",
};

const TS_DEFAULTS: Record<ValueType, string> = {
  int: "0",
  "int[]": "[]",
  "int[][]": "[]",
  string: '""',
  "string[]": "[]",
  "string[][]": "[]",
  "char[][]": "[]",
  boolean: "false",
  linkedListWithCycle: "null",
};

function usesListNode(sig: ProblemSignature) {
  return sig.params.some((p) => p.type === "linkedListWithCycle") || sig.returns === "linkedListWithCycle";
}

export function javaType(t: ValueType): string {
  return JAVA_TYPES[t];
}
export function pythonType(t: ValueType): string {
  return PY_TYPES[t];
}
export function tsType(t: ValueType): string {
  return TS_TYPES[t];
}

export function starterCode(language: Language, sig: ProblemSignature): string {
  switch (language) {
    case "java": {
      const params = sig.params.map((p) => `${JAVA_TYPES[p.type]} ${p.name}`).join(", ");
      const note = usesListNode(sig)
        ? "// ListNode is provided by the test harness:\n// class ListNode { int val; ListNode next; ListNode(int x) { val = x; } }\n\n"
        : "";
      return `import java.util.*;\n\n${note}class Solution {\n    public ${JAVA_TYPES[sig.returns]} ${sig.method}(${params}) {\n        // Write your solution here\n        return ${JAVA_DEFAULTS[sig.returns]};\n    }\n}\n`;
    }
    case "python": {
      const params = sig.params.map((p) => `${p.name}: ${PY_TYPES[p.type]}`).join(", ");
      const note = usesListNode(sig)
        ? "# ListNode is provided by the test harness:\n# class ListNode:\n#     def __init__(self, x=0, next=None): self.val = x; self.next = next\n\n"
        : "";
      return `from typing import *\n\n${note}class Solution:\n    def ${sig.method}(self, ${params}) -> ${PY_TYPES[sig.returns]}:\n        # Write your solution here\n        pass\n`;
    }
    case "typescript": {
      const params = sig.params.map((p) => `${p.name}: ${TS_TYPES[p.type]}`).join(", ");
      const note = usesListNode(sig)
        ? "// ListNode { val: number; next: ListNode | null } is provided by the runner.\n\n"
        : "";
      return `${note}function ${sig.method}(${params}): ${TS_TYPES[sig.returns]} {\n  // Write your solution here\n  return ${TS_DEFAULTS[sig.returns]};\n}\n`;
    }
  }
}
