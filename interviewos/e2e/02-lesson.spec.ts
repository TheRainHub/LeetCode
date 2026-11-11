import { readFileSync } from "node:fs";
import matter from "gray-matter";
import { expect, test } from "./fixtures";

const lesson = matter(readFileSync("content/lessons/dsa/hashmap-hashset.md", "utf8")).data as {
  quiz: { q: string; options: string[]; answer: number }[];
};

test("lesson quiz is graded on the server and reading + quiz never make a topic interview-ready", async ({ page }) => {
  await page.goto("/learn/lesson/hashmap-hashset");
  await expect(page.locator("[data-status]").first()).toHaveAttribute("data-status", "not_started");

  for (const q of lesson.quiz) {
    await page.getByRole("group", { name: q.q }).getByRole("radio", { name: q.options[q.answer]!, exact: true }).check();
  }
  await page.getByTestId("quiz-submit").click();
  await expect(page.getByText(`${lesson.quiz.length} / ${lesson.quiz.length} correct`)).toBeVisible();
  await expect(page.getByText("Passed — recognition evidence recorded.")).toBeVisible();

  await page.getByTestId("mark-read").click();

  // Interview-mode explanation with an honest self-assessment against the rubric.
  await page.getByTestId("explain-start").click();
  await page
    .getByRole("textbox", { name: "Your explanation…" })
    .fill("A hash map hashes the key to pick a bucket in an array; collisions are handled by chaining or probing, and the table resizes when the load factor grows so average lookups stay O(1).");
  await page.getByRole("button", { name: "I'm done — show rubric" }).click();
  const rubric = page.getByTestId("explain-exercise").getByRole("checkbox");
  await rubric.first().check();
  await page.getByTestId("explain-save").click();
  await expect(page.getByText(/Saved: \d+% of the rubric covered\./)).toBeVisible();

  await page.reload();
  const status = await page.locator("[data-status]").first().getAttribute("data-status");
  expect(status).not.toBe("not_started");
  expect(status).not.toBe("interview_ready");
});
