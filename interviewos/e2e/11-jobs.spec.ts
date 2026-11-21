import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { MOCK_URL } from "./env";

type Recorded = {
  body: {
    stream?: boolean;
    system?: unknown;
    tools?: { type: string }[];
    messages?: { content?: unknown }[];
  };
};

const RESUME = `Jane Doe — Computer Science student, final year

Experience
- Software engineering intern, Example Automation (2025-2026)
- Built an internal integration service in TypeScript used by 3 teams
- Wrote unit and integration tests for REST endpoints with Vitest

Skills: TypeScript, Java, SQL, REST APIs, Git`;

const requests = async (page: Page) =>
  (await (await page.request.get(`${MOCK_URL}/__requests`)).json()) as Recorded[];

test("job search: profile, AI job finder, import, grounded analysis and a tailored mock interview", async ({
  page,
}) => {
  // Profile and résumé.
  await page.goto("/jobs");
  await expect(page.getByTestId("jobs-profile-missing")).toBeVisible();
  await expect(page.getByTestId("jobs-empty")).toBeVisible();
  await page.goto("/jobs/profile");
  await page.getByTestId("profile-resume").fill(RESUME);
  await page.getByTestId("profile-targetRoles").fill("graduate software engineer");
  await page.getByTestId("profile-locations").fill("Prague, remote EU");
  await page.getByLabel("Hybrid").check();
  await page.getByLabel("Graduate").check();
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByTestId("profile-save").click(),
  ]);
  await expect(page.getByText("Profile saved")).toBeVisible();

  // AI job finder: progress streams in; a suggestion whose link was never read is dropped.
  await page.goto("/jobs/find");
  await expect(page.locator("#jf-roles")).toHaveValue("graduate software engineer");
  await page.getByTestId("job-finder-run").click();
  await expect(page.getByTestId("job-finder-progress")).toContainText(
    "Searched: graduate software engineer Prague",
  );
  await page.waitForURL(/\/jobs\/find\?search=\d+/);
  await expect(page.getByTestId("found-job")).toHaveCount(2);
  await expect(page.getByTestId("job-results-dropped")).toContainText("1 suggestion was removed");
  await expect(page.getByText("Ghost Corp")).toHaveCount(0);
  const search = (await requests(page)).find((r) => String(r.body.system).includes("job-search researcher"))!;
  expect(search.body.tools?.map((t) => t.type)).toEqual(["web_search_20250305", "web_fetch_20250910"]);
  expect(String(search.body.messages?.[0]?.content)).toContain(
    "Built an internal integration service in TypeScript",
  );

  await page.getByTestId("found-save").first().click();
  await expect(page.getByTestId("found-open")).toHaveCount(1);

  // Import a posting from its link; an unreadable page reports an error instead of inventing one.
  await page.goto("/jobs");
  await page.getByTestId("import-url").fill("https://careers.example.com/blocked/1");
  await page.getByTestId("import-submit").click();
  await expect(page.getByText(/could not be read/)).toBeVisible();
  await page.getByTestId("import-url").fill("https://careers.example.com/jobs/303");
  await page.getByTestId("import-submit").click();
  await page.waitForURL(/\/jobs\/\d+$/);
  await expect(page.getByRole("heading", { name: "Backend Engineer (Graduate)" })).toBeVisible();
  await expect(page.getByTestId("posting-text")).toContainText("card payments");

  // Analysis with company research: invented rewrites and unknown lesson links are removed.
  await page.getByLabel(/research the company's interview process/).check();
  await page.getByTestId("analyze-run").click();
  await expect(page.getByTestId("analysis-score")).toHaveText("72");
  const rewrites = page.getByTestId("analysis-rewrites");
  await expect(rewrites.locator("li")).toHaveCount(1);
  await expect(rewrites).toContainText("adopted by three internal teams");
  await expect(rewrites).toContainText("1 suggested rewrite was removed");
  await expect(page.getByTestId("prep-lesson")).toHaveCount(1);
  await expect(page.getByTestId("analysis-process")).toHaveAttribute("data-basis", "sources");
  await expect(page.getByTestId("analysis-process")).toContainText(
    "Graduate Software Engineer — Example Bank",
  );
  await expect(page.getByTestId("posting-status")).toHaveValue("preparing");

  // Changing the résumé marks the analysis as outdated.
  const postingUrl = page.url();
  await page.goto("/jobs/profile");
  await page.getByTestId("profile-resume").fill(`${RESUME}\n- Added a line`);
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByTestId("profile-save").click(),
  ]);
  await page.goto(postingUrl);
  await expect(page.getByTestId("analysis-stale")).toBeVisible();

  // Status history records the change when it happens.
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST"),
    page.getByTestId("posting-status").selectOption("applied"),
  ]);
  await expect(page.getByTestId("posting-history")).toContainText("Applied");

  // Mock interview tailored to the posting.
  await page.getByTestId("job-interview-start").click();
  await page.waitForURL(/\/interviews\/\d+$/);
  await expect(page.getByText(/Mock interviewer question \d+/)).toBeVisible();
  const chat = (await requests(page)).filter((r) => r.body.stream && !r.body.tools).at(-1)!;
  expect(String(chat.body.system)).toContain("<job_posting>");
  expect(String(chat.body.system)).toContain("Backend Engineer (Graduate)");

  // Overview groups postings by status.
  await page.goto("/jobs");
  await expect(page.getByTestId("job-row")).toHaveCount(2);
  await expect(page.locator("[data-testid=jobs-group][data-status=applied]")).toContainText(
    "Backend Engineer (Graduate)",
  );
});

test("job search: add a posting by pasting it", async ({ page }) => {
  await page.goto("/jobs");
  await page.getByTestId("add-paste").click();
  await page.locator("#pf-title").fill("Junior Java Developer");
  await page.locator("#pf-company").fill("Barclays");
  await page.locator("#pf-description").fill("Java, Spring, SQL. Graduate programme in Prague.");
  await page.getByTestId("posting-save").click();
  await page.waitForURL(/\/jobs\/\d+$/);
  await expect(page.getByTestId("posting-company")).toHaveText("Barclays");
  // The employer has an InterviewOS company track, so the posting links to it.
  await expect(page.getByTestId("posting-company-track")).toHaveAttribute("href", "/companies/barclays");
  // Too little posting text for an analysis.
  await expect(page.getByTestId("analyze-run")).toBeDisabled();
});
