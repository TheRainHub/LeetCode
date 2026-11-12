import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";

// The server imported e2e/fixtures/guides (synthetic test guides) before the suite started.
const cards = (page: Page) =>
  page.getByTestId("guide-card").evaluateAll((els) => els.map((e) => e.getAttribute("data-slug")));

test("visual guides: browse, filter, read verbatim with attribution, mark as read", async ({ page }) => {
  await page.goto("/practice/system-design/guides");
  await expect(page.getByTestId("guide-count")).toHaveText("1–3 of 3");

  await page
    .getByTestId("guide-categories")
    .getByRole("link", { name: /Database & Storage/ })
    .click();
  await expect(page).toHaveURL(/category=database-and-storage/);
  expect((await cards(page)).sort()).toEqual(["consistent-hashing", "evolution-of-ubers-api-layer"]);

  await page.goto("/practice/system-design/guides?q=eviction");
  expect(await cards(page)).toEqual(["top-8-cache-eviction-strategies"]);

  await page.goto("/practice/system-design/guides/consistent-hashing");
  await expect(page.getByTestId("guide-content")).toContainText("Test text: placing nodes on a ring");
  await expect(page.getByTestId("guide-attribution")).toContainText("CC BY-NC-ND 4.0");
  await expect(
    page.getByTestId("guide-attribution").getByRole("link", { name: "Original on GitHub" }),
  ).toHaveAttribute(
    "href",
    "https://github.com/ByteByteGoHq/system-design-101/blob/HEAD/data/guides/consistent-hashing.md",
  );
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByTestId("guide-read-toggle").click(),
  ]);
  await page.reload();
  await expect(page.getByTestId("guide-read-toggle")).toHaveText("Read");
  await page.goto("/practice/system-design/guides?read=read");
  expect(await cards(page)).toEqual(["consistent-hashing"]);

  // An HTML <img> in the source is rendered as an image (format conversion only).
  await page.goto("/practice/system-design/guides/top-8-cache-eviction-strategies");
  await expect(page.getByTestId("guide-content").locator("img")).toHaveCount(1);
});

test("related guides appear on design questions and lessons", async ({ page }) => {
  await page.goto("/practice/system-design/key-value-store");
  await expect(page.getByTestId("sd-guides").getByRole("link", { name: "Consistent Hashing" })).toBeVisible();
  await page.goto("/learn/lesson/caching");
  await expect(
    page.getByTestId("lesson-guides").getByRole("link", { name: "Top 8 Cache Eviction Strategies" }),
  ).toBeVisible();
});
