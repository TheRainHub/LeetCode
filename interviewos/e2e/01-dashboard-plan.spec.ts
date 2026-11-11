import { expect, test } from "./fixtures";
import { today } from "./env";

// Runs first, on a freshly seeded database: nothing has been practised yet.
test("fresh dashboard shows honest empty states, then a plan can be created and today marked unavailable", async ({
  page,
}) => {
  await page.goto("/");
  await expect(page.getByText("Not assessed yet")).toBeVisible();
  await expect(page.getByText("No study plan yet")).toBeVisible();
  await expect(page.getByText("No coding attempts yet")).toBeVisible();

  await page.goto("/schedule");
  await page.getByTestId("generate-plan").click();
  await expect(page.locator('[data-testid^="day-"]').first()).toBeVisible();
  // The 14-session sprint places real tasks into the calendar.
  await expect(page.locator('[data-testid^="day-"] li').first()).toBeVisible();

  await page.goto("/");
  await page.getByRole("button", { name: "I'm unavailable today" }).click();
  await expect(page.getByText(/Rescheduled \d+ task\(s\)/)).toBeVisible();

  await page.goto("/schedule");
  const todayRow = page.getByTestId(`day-${today()}`);
  await expect(todayRow.locator('[data-reason="unavailable"]')).toBeVisible();
  await expect(todayRow.locator("li")).toHaveCount(0);
});
