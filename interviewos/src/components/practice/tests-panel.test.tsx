// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { ProblemSignature } from "@/lib/content/types";
import { renderWithI18n } from "@/test/render";
import { TestsPanel, type Execution } from "./tests-panel";

vi.mock("@/app/practice/actions", () => ({ addCustomTestAction: vi.fn(), deleteCustomTestAction: vi.fn() }));
vi.mock("sonner", () => ({ toast: { error: vi.fn(), success: vi.fn() } }));

const signature: ProblemSignature = {
  method: "twoSum",
  params: [
    { name: "nums", type: "int[]" },
    { name: "target", type: "int" },
  ],
  returns: "int[]",
};
const tests = [{ name: "basic", args: [[2, 7, 11, 15], 9], expected: [0, 1] }];

function renderPanel(execution: Execution, code = "const a = 1;", language: "typescript" | "java" = "typescript") {
  return renderWithI18n(
    <TestsPanel
      problemId={1}
      signature={signature}
      comparator="exact"
      tests={tests}
      customTests={[]}
      language={language}
      code={code}
      execution={execution}
      running={false}
      onRun={vi.fn()}
      onLocalResults={vi.fn()}
      tab="results"
      onTabChange={vi.fn()}
    />,
  );
}

describe("TestsPanel results", () => {
  it("says explicitly that code has not been executed when there is no run", () => {
    renderPanel({ mode: "none" });
    expect(screen.getByText("Not executed")).toBeInTheDocument();
    expect(screen.getByText("Not executed yet.")).toBeInTheDocument();
  });

  it("points Java users to local execution instead of pretending to run it", () => {
    renderPanel({ mode: "none" }, "class Solution {}", "java");
    expect(screen.getByText(/In-browser execution supports TypeScript only/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /^Run tests$/ })).not.toBeInTheDocument();
  });

  it("shows real outcomes from a browser run", () => {
    renderPanel({
      mode: "browser",
      code: "const a = 1;",
      language: "typescript",
      logs: [],
      results: [
        { name: "basic", passed: true, durationMs: 0.4 },
        { name: "custom: empty", passed: false, expected: "[]", actual: "null" },
      ],
    });
    expect(screen.getByText("1 / 2 passed")).toBeInTheDocument();
    expect(screen.getByText(/Executed in your browser/)).toBeInTheDocument();
    expect(screen.getByText("null")).toBeInTheDocument();
  });

  it("flags results as stale once the code changes", () => {
    renderPanel(
      { mode: "browser", code: "const a = 1;", language: "typescript", logs: [], results: [{ name: "basic", passed: true }] },
      "const a = 2;",
    );
    expect(screen.getByText(/Code changed since this run/)).toBeInTheDocument();
  });
});
