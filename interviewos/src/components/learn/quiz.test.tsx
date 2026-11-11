// @vitest-environment jsdom
import { screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { renderWithI18n } from "@/test/render";
import { Quiz } from "./quiz";

const submitQuizAction = vi.fn();
const toastError = vi.fn();
vi.mock("@/app/learn/actions", () => ({
  submitQuizAction: (...args: unknown[]) => submitQuizAction(...args),
}));
vi.mock("sonner", () => ({
  toast: { error: (...args: unknown[]) => toastError(...args), success: vi.fn() },
}));

const questions = [
  { id: 11, prompt: "Binary search runs in", options: ["O(n)", "O(log n)"] },
  { id: 12, prompt: "A hash map lookup is on average", options: ["O(1)", "O(n log n)"] },
];

describe("Quiz", () => {
  beforeEach(() => {
    submitQuizAction.mockReset();
    toastError.mockReset();
  });

  it("refuses to submit until every question is answered", async () => {
    renderWithI18n(<Quiz lessonId={1} questions={questions} />);
    await userEvent.click(screen.getByRole("radio", { name: "O(log n)" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answers" }));
    expect(toastError).toHaveBeenCalledWith("Answer every question first.");
    expect(submitQuizAction).not.toHaveBeenCalled();
  });

  it("sends the selected options to the server and shows its grading", async () => {
    submitQuizAction.mockResolvedValue({
      ok: true,
      data: {
        correct: 1,
        total: 2,
        passed: false,
        feedback: [
          {
            exerciseId: 11,
            selected: 1,
            correctOption: 1,
            isCorrect: true,
            explanation: "Halves the range each step.",
          },
          {
            exerciseId: 12,
            selected: 1,
            correctOption: 0,
            isCorrect: false,
            explanation: "Average O(1) with a good hash.",
          },
        ],
      },
    });
    renderWithI18n(<Quiz lessonId={7} questions={questions} />);
    await userEvent.click(screen.getByRole("radio", { name: "O(log n)" }));
    await userEvent.click(screen.getByRole("radio", { name: "O(n log n)" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answers" }));

    expect(submitQuizAction).toHaveBeenCalledTimes(1);
    expect(submitQuizAction.mock.calls[0]![0]).toMatchObject({
      lessonId: 7,
      answers: [
        { exerciseId: 11, selected: 1 },
        { exerciseId: 12, selected: 1 },
      ],
    });
    expect(await screen.findByText("1 / 2 correct")).toBeInTheDocument();
    expect(screen.getByText(/Below 70%/)).toBeInTheDocument();
    expect(screen.getByText("Average O(1) with a good hash.")).toBeInTheDocument();
    // Answers are locked after grading; "Try again" resets them.
    expect(screen.getByRole("radio", { name: "O(1)" })).toBeDisabled();
    await userEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByRole("radio", { name: "O(1)" })).toBeEnabled();
    expect(screen.getByRole("radio", { name: "O(log n)" })).not.toBeChecked();
  });

  it("shows a server error instead of a fake result", async () => {
    submitQuizAction.mockResolvedValue({ ok: false, error: "Database unavailable" });
    renderWithI18n(<Quiz lessonId={1} questions={questions} />);
    await userEvent.click(screen.getByRole("radio", { name: "O(log n)" }));
    await userEvent.click(screen.getByRole("radio", { name: "O(1)" }));
    await userEvent.click(screen.getByRole("button", { name: "Check answers" }));
    expect(toastError).toHaveBeenCalledWith("Database unavailable");
    expect(screen.queryByText(/correct$/)).not.toBeInTheDocument();
  });
});
