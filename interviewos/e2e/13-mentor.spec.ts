import type { Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { MOCK_URL } from "./env";

type Block = {
  type: string;
  text?: string;
  name?: string;
  tool_use_id?: string;
  is_error?: boolean;
  content?: unknown;
};
type Recorded = {
  body: {
    system?: unknown;
    tools?: { name: string }[];
    messages?: { role: string; content: string | Block[] }[];
  };
};

const mentorRequests = async (page: Page) =>
  ((await (await page.request.get(`${MOCK_URL}/__requests`)).json()) as Recorded[]).filter((r) =>
    String(r.body.system).includes("long-term mentor"),
  );
const blocks = (c: string | Block[] | undefined): Block[] =>
  Array.isArray(c) ? c : c ? [{ type: "text", text: c }] : [];

test("mentor: conversation with validated assignments, memory, follow-up and new threads", async ({
  page,
}) => {
  await page.goto("/mentor");
  await expect(page.getByTestId("mentor-starter")).toHaveCount(4);
  await expect(page.getByText("No tasks yet. Ask the mentor for some.")).toBeVisible();

  // First message: the mentor replies and calls its tools; the unknown lesson is rejected by the server.
  await page.getByTestId("mentor-starter").first().click();
  await expect(page.getByTestId("mentor-msg-assistant").first()).toContainText("Mock mentor reply 1");
  await page.waitForURL(/\/mentor\?thread=\d+/);
  await expect(page.getByTestId("mentor-task")).toHaveCount(1);
  await expect(page.getByTestId("mentor-task")).toContainText("Study caching strategies 1");
  await expect(page.getByTestId("mentor-task-link")).toHaveAttribute("href", "/learn/lesson/caching");
  await expect(page.getByTestId("mentor-note")).toContainText("Prefers product companies (1)");
  await expect(page.getByTestId("mentor-tool")).toHaveCount(3);
  await expect(page.locator("[data-testid=mentor-tool][data-tool=assign_task]")).toHaveCount(2);

  let requests = await mentorRequests(page);
  const first = requests[0]!;
  expect(first.body.tools?.map((t) => t.name)).toEqual(["assign_task", "update_task", "remember", "forget"]);
  expect(String(first.body.system)).toContain("caching: ");
  expect(blocks(first.body.messages?.[0]?.content)[0]?.text).toContain("<current_progress");
  const results = blocks(requests[1]!.body.messages?.at(-1)?.content);
  expect(results.find((b) => b.tool_use_id === "toolu_bad_1")).toMatchObject({ is_error: true });
  expect(String(results.find((b) => b.tool_use_id === "toolu_bad_1")?.content)).toContain("Unknown lesson");

  // The user reports on the task; the next turn carries a fresh snapshot with it, and history is replayed.
  await page.getByTestId("mentor-task").getByRole("button", { name: "Study caching strategies 1" }).click();
  await page.getByPlaceholder("How did it go? The mentor will see this.").fill("Read it, quiz 85%");
  await page.getByTestId("mentor-task-done").click();
  await expect(page.locator("[data-testid=mentor-task][data-status=done]")).toHaveCount(1);
  await page.getByTestId("mentor-input").fill("I finished the caching task.");
  await page.getByTestId("mentor-send").click();
  await expect(page.getByTestId("mentor-msg-assistant").last()).toContainText("the tasks are in your list");
  requests = await mentorRequests(page);
  const followUp = requests.find((r) =>
    blocks(r.body.messages?.at(-1)?.content).some((b) => b.text === "I finished the caching task."),
  )!;
  const snapshot = blocks(followUp.body.messages?.at(-1)?.content)[0]!.text!;
  expect(snapshot).toContain("<current_progress");
  expect(snapshot).toContain("candidate: Read it, quiz 85%");
  const replayed = followUp.body.messages!.flatMap((msg) => blocks(msg.content));
  expect(replayed.some((b) => b.type === "tool_use" && b.name === "remember")).toBe(true);
  expect(replayed.some((b) => b.type === "tool_result")).toBe(true);

  // History persists (including which tool calls were rejected); a new conversation starts empty but
  // keeps tasks and memory.
  await page.reload();
  await expect(page.getByTestId("mentor-msg-user")).toHaveCount(2);
  await expect(page.getByTestId("mentor-tool").filter({ hasText: "(rejected)" })).toHaveCount(2);
  await page.getByTestId("mentor-new-thread").click();
  await expect(page.getByTestId("mentor-starter")).toHaveCount(4);
  await expect(page.getByTestId("mentor-task")).toHaveCount(2);
  await expect(page.getByTestId("mentor-note")).toHaveCount(2);
  await expect(page.getByTestId("mentor-threads").locator("li")).toHaveCount(2);

  // Wrong memories can be deleted.
  await page.getByTestId("mentor-note").first().getByRole("button").click();
  await expect(page.getByTestId("mentor-note")).toHaveCount(1);

  // Open assignments are surfaced on the dashboard.
  await expect(page.locator("[data-testid=mentor-task][data-status=open]")).toHaveCount(1);
  await page.goto("/");
  await expect(page.getByTestId("dashboard-mentor-tasks")).toHaveText("1 open task from your mentor");
  await page.getByTestId("dashboard-mentor-tasks").click();
  await page.waitForURL(/\/mentor/);
});
