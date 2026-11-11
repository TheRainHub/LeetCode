import { expect, test } from "./fixtures";

test("switching the interface to Russian and back", async ({ page }) => {
  await page.goto("/settings");
  await page.getByTestId("locale-select").selectOption("ru");
  await page.getByTestId("save-settings").click();
  await expect(page.getByRole("link", { name: "Учебные треки" }).first()).toBeVisible();

  await page.goto("/");
  await expect(page.getByText("Пока не оценён")).toBeVisible();

  await page.goto("/settings");
  await page.getByTestId("locale-select").selectOption("en");
  await page.getByTestId("save-settings").click();
  await expect(page.getByRole("link", { name: "Learning Paths" }).first()).toBeVisible();
});
