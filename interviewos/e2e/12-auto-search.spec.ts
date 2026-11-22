import { expect, test } from "./fixtures";
import { E2E_CRON_SECRET } from "./env";

const RESUME = `Final-year CS student
- Moved a developer portal to a new UI library across 10 plugins
- Cut CI pipeline time from 8 to 5 minutes by running checks in parallel
Skills: TypeScript, Java, Kubernetes, PostgreSQL`;

test("automatic job search: scheduler endpoint, only new postings, catch-up runs on the page", async ({
  page,
  request,
}) => {
  // A profile is required before anything runs.
  await page.goto("/jobs/profile");
  await page.getByTestId("profile-resume").fill(RESUME);
  await page.getByTestId("profile-targetRoles").fill("platform engineer");
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByTestId("profile-save").click(),
  ]);

  // The scheduler endpoint refuses requests without the secret (the app's access check is skipped for it).
  expect((await request.get("/api/cron/job-search")).status()).toBe(401);
  expect(
    (
      await request.get("/api/cron/job-search", { headers: { authorization: "Bearer wrong-secret-value" } })
    ).status(),
  ).toBe(401);

  // Save an automatic search while catch-up runs on the page are blocked, so the scheduler runs it.
  await page.route("**/api/jobs/auto/run", (route) =>
    route.fulfill({
      status: 200,
      contentType: "application/x-ndjson",
      body: '{"type":"result","status":"idle","reason":"nothing-due"}\n',
    }),
  );
  await page.goto("/jobs/find");
  await page.locator("#jf-focus").fill("auto-test");
  await page.locator("#auto-name").fill("Platform roles");
  await page.locator("#auto-interval").selectOption("1");
  await page.getByTestId("auto-save-button").click();
  await expect(page.getByTestId("auto-item")).toHaveCount(1);
  await expect(page.getByTestId("auto-item")).toContainText("Due now");

  const cron = async () =>
    (
      await request.post("/api/cron/job-search", { headers: { authorization: `Bearer ${E2E_CRON_SECRET}` } })
    ).json();
  expect(await cron()).toMatchObject({ status: "done", name: "Platform roles", found: 2, newCount: 2 });
  // Nothing else is due until tomorrow.
  expect(await cron()).toEqual({ status: "idle", reason: "nothing-due" });

  // The overview announces the new postings until they are opened.
  await page.goto("/jobs");
  await expect(page.getByTestId("jobs-new-results")).toContainText("2 new postings from automatic search");
  await page.getByTestId("jobs-new-results").getByRole("link").click();
  await expect(page.getByTestId("found-job")).toHaveCount(2);
  await expect(page.getByTestId("job-results")).toContainText("Auto: Platform roles");
  await expect(page.getByTestId("auto-item")).toContainText("Next run:");
  await page.goto("/jobs");
  await expect(page.getByTestId("jobs-new-results")).toHaveCount(0);

  // "Run now" runs it on the page; the same postings are not reported twice.
  await page.unroute("**/api/jobs/auto/run");
  await page.goto("/jobs/find");
  await page.getByTestId("auto-run-now").click();
  await expect(page.getByTestId("auto-runner")).toContainText("“Platform roles”: nothing new this time");
  await page.getByTestId("auto-runner").getByRole("link").click();
  await expect(page.getByTestId("found-job")).toHaveCount(0);
  await expect(page.getByTestId("job-results-skipped")).toContainText(
    "2 postings seen in earlier searches hidden",
  );
});
