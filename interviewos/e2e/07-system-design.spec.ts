import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { MOCK_URL } from "./env";

type Recorded = { body: { stream?: boolean; system?: unknown } };

const rows = (page: Page) =>
  page.getByTestId("sd-row").evaluateAll((els) => els.map((e) => e.getAttribute("data-slug")));

test("system design catalogue filters questions by difficulty and source list", async ({ page }) => {
  await page.goto("/practice/system-design");
  await expect(page.getByTestId("sd-row")).toHaveCount(31);
  await page.goto("/practice/system-design?difficulty=easy");
  expect(await rows(page)).toEqual(["url-shortener", "pastebin"]);
  await page.goto("/practice/system-design?source=leetcode-most-asked");
  expect((await rows(page)).sort()).toEqual([
    "dropbox",
    "ecommerce",
    "notification-system",
    "recommendation-system",
    "url-shortener",
  ]);
});

test("practise a design question: autosaved answer, self-assessment, AI review and a mock interview", async ({
  page,
  request,
}) => {
  await page.goto("/practice/system-design/url-shortener");
  await expect(page.getByTestId("sd-status")).toHaveText("Not started");

  await page
    .getByTestId("sd-section-requirements")
    .fill(
      "Create short links with optional expiry and custom alias; redirect quickly; click statistics. Non-functional: low latency, high availability, durable mappings.",
    );
  await page
    .getByTestId("sd-section-highLevel")
    .fill(
      "API service writes links to PostgreSQL with a unique code; redirects read from Redis first, then the database; click events go to a queue and are aggregated asynchronously.",
    );
  await expect(page.getByTestId("sd-save-state")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByTestId("sd-section-highLevel")).toHaveValue(/Redis first/);
  // The guide stays hidden until asked for.
  await expect(page.getByText("Questions to ask")).toHaveCount(0);
  await page.getByTestId("sd-guide-toggle").click();
  await expect(page.getByText("Questions to ask")).toBeVisible();

  const rubric = page.getByTestId("sd-assess").getByRole("checkbox");
  await expect(rubric).toHaveCount(8);
  await rubric.nth(0).check();
  await rubric.nth(5).check();
  await page.getByTestId("sd-save-assessment").click();
  await expect(page.getByTestId("sd-result")).toContainText("Saved: 25% of the rubric");
  await expect(page.getByTestId("sd-status")).toHaveText("Practised");

  // AI review goes through the local mock, which marks every even-numbered rubric item as covered.
  await page.getByRole("button", { name: "Review with AI" }).click();
  await expect(page.getByTestId("sd-result")).toContainText("AI review: 50% of the rubric");
  await expect(page.getByTestId("sd-result")).toContainText("Missing: estimates that drive decisions.");
  await expect(page.getByTestId("sd-history")).toContainText("AI review");
  await expect(page.getByTestId("sd-history")).toContainText("Self-assessed");

  await page.getByTestId("sd-start-mock").click();
  await page.waitForURL(/\/interviews\/\d+$/);
  await expect(page.getByText(/Mock interviewer question \d+/)).toBeVisible();
  const recorded = (await (await request.get(`${MOCK_URL}/__requests`)).json()) as Recorded[];
  const lastChat = recorded.filter((r) => r.body.stream).at(-1)!;
  expect(String(lastChat.body.system)).toContain("<design_question>");
  expect(String(lastChat.body.system)).toContain("Design a URL shortening service like TinyURL or Bitly");

  await page.goto("/practice/system-design/url-shortener");
  await expect(page.getByTestId("sd-history")).toContainText("Mock interview");
});
