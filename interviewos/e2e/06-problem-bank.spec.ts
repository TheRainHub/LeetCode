import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// The server imported e2e/fixtures/problem-bank (synthetic frequencies) before the suite started.
const slugs = (page: Page) =>
  page.getByTestId("bank-row").evaluateAll((rows) => rows.map((r) => r.getAttribute("data-slug")));

test("problem bank: filter by company and period, track a self-reported status, browse patterns", async ({
  page,
}) => {
  await page.goto("/practice/bank");
  await expect(page.getByTestId("bank-count")).toHaveText("1–10 of 10");

  await page.locator("#bank-company").selectOption("microsoft");
  await expect(page).toHaveURL(/company=microsoft/);
  await page.locator("#bank-window").selectOption("30d");
  await expect(page).toHaveURL(/window=30d/);
  await expect(page.getByTestId("bank-count")).toHaveText("1–2 of 2 · Microsoft · Last 30 days");
  expect(await slugs(page)).toEqual(["two-sum", "lru-cache"]);
  // InterviewOS has an executable Two Sum, so the row links to the workspace.
  await expect(
    page.locator('[data-slug="two-sum"]').getByRole("link", { name: "Solve in InterviewOS" }),
  ).toBeVisible();

  // Wait for the server action (a POST to the current page) before navigating away.
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/practice/bank")),
    page.getByTestId("bank-row").first().getByRole("combobox").selectOption("solved"),
  ]);
  await page.goto("/practice/bank?status=solved");
  expect(await slugs(page)).toEqual(["two-sum"]);
  await expect(page.getByLabel("Status for Two Sum")).toHaveValue("solved");

  await page.goto("/practice/bank?tag=Stack");
  expect(await slugs(page)).toEqual(["valid-parentheses"]);

  await page.goto("/practice/patterns");
  const sliding = page.getByTestId("pattern-sliding-window");
  await expect(sliding).toContainText("3 problems");
  await sliding.getByRole("link", { name: /Practice this pattern/ }).click();
  await expect(page).toHaveURL(/pattern=sliding-window/);
  expect((await slugs(page)).sort()).toEqual([
    "fruit-into-baskets",
    "longest-substring-without-repeating-characters",
    "minimum-window-substring",
  ]);
  // Known only from the pattern notes: difficulty is shown as unknown, not guessed.
  await expect(page.locator('[data-slug="fruit-into-baskets"]').getByText("Unknown")).toBeVisible();
});

test("company and lesson pages show matching bank problems", async ({ page }) => {
  await page.goto("/companies/microsoft");
  const card = page.getByTestId("company-bank");
  // The fixture's 3-month list has only 4 problems (< 5), so the card falls back to all time (6).
  await expect(card).toContainText("All time");
  await expect(card).toContainText("1 of 6 solved (self-reported)");
  await expect(card.getByRole("link", { name: /All 6 problems for this company/ })).toHaveAttribute(
    "href",
    "/practice/bank?company=microsoft",
  );

  await page.goto("/companies/cdn77");
  await expect(page.getByTestId("company-bank")).toContainText("no entry for this company");

  await page.goto("/learn/lesson/sliding-window");
  const lesson = page.getByTestId("lesson-bank");
  await expect(
    lesson.getByRole("link", { name: /Longest Substring Without Repeating Characters/ }),
  ).toBeVisible();
  await expect(lesson.getByRole("link", { name: "Sliding Window", exact: true })).toHaveAttribute(
    "href",
    "https://algorithm-visualizer.org/dynamic-programming/sliding-window",
  );
});
