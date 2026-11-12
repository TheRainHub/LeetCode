import { expect, test } from "./fixtures";

test("roadmap shows paths and lesson trees with direct prerequisites", async ({ page }) => {
  await page.goto("/");
  await page.getByRole("link", { name: "Roadmap" }).first().click();
  await expect(page).toHaveURL(/\/roadmap$/);
  await expect(page.getByTestId("roadmap-node")).toHaveCount(8);
  // Path-level edges come from cross-path prerequisites.
  await expect(page.locator('[data-edge="backend->system-design"]')).toHaveCount(1);
  await expect(page.locator('[data-edge="linux-networking->backend"]')).toHaveCount(1);

  await page
    .getByTestId("roadmap-tabs")
    .getByRole("link", { name: /Algorithms & Data Structures/ })
    .click();
  await expect(page).toHaveURL(/path=dsa/);
  await expect(page.getByTestId("roadmap-node")).toHaveCount(16);
  // The root topic has no prerequisites and is not started, so it is the next step.
  await expect(page.locator('[data-testid="roadmap-node"][data-id="complexity"]')).toHaveAttribute(
    "data-next",
    "true",
  );
  // complexity → hashmap is implied by complexity → arrays → hashmap, so only direct edges are drawn.
  await expect(page.locator('[data-edge="complexity->arrays-strings"]')).toHaveCount(1);
  await expect(page.locator('[data-edge="complexity->hashmap-hashset"]')).toHaveCount(0);

  await page.locator('[data-testid="roadmap-node"][data-id="arrays-strings"]').click();
  await expect(page).toHaveURL(/\/learn\/lesson\/arrays-strings$/);

  await page.goto("/roadmap?path=system-design");
  await expect(page.getByTestId("roadmap-external")).toContainText("Idempotency");
  await expect(page.getByTestId("roadmap-external")).toContainText("Case study: Booking platform");
});
