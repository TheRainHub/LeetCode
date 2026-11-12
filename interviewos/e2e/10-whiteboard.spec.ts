import type { Locator, Page } from "@playwright/test";
import { expect, test } from "./fixtures";
import { MOCK_URL } from "./env";

type Recorded = { body: { stream?: boolean; system?: unknown; messages?: { content?: unknown }[] } };

const node = (page: Page, kind: string) => page.locator(`[data-testid=wb-node][data-kind=${kind}]`);
const edges = (page: Page) => page.locator(".react-flow__edge");

/** Drags a palette item onto the canvas at a position relative to the canvas. */
async function drop(page: Page, kind: string, x: number, y: number) {
  await page.getByTestId(`wb-palette-${kind}`).dragTo(page.getByTestId("wb-canvas"), {
    targetPosition: { x, y },
  });
  await expect(node(page, kind)).toHaveCount(1);
}

/** Draws an arrow from the right-hand dot of one component onto the body of another. */
async function connect(page: Page, from: Locator, to: Locator) {
  const h = (await from.locator(".react-flow__handle-right").boundingBox())!;
  const t = (await to.boundingBox())!;
  await page.mouse.move(h.x + h.width / 2, h.y + h.height / 2);
  await page.mouse.down();
  await page.mouse.move(t.x + 10, t.y + 10, { steps: 8 });
  await page.mouse.move(t.x + t.width / 2, t.y + t.height / 2, { steps: 8 });
  await page.mouse.up();
}

test("whiteboard sandbox: drag, connect, load-test, inject failures, undo and persist", async ({ page }) => {
  await page.goto("/practice/system-design/whiteboard");
  await expect(page.getByTestId("wb-empty")).toBeVisible();
  await expect(page.getByTestId("wb-disclaimer")).toContainText("nothing is deployed or executed");

  await drop(page, "client", 120, 200);
  await drop(page, "service", 420, 200);
  await drop(page, "sql", 720, 200);
  await expect(page.getByTestId("wb-no-clients")).toHaveCount(0);

  await connect(page, node(page, "client"), node(page, "service"));
  await connect(page, node(page, "service"), node(page, "sql"));
  await expect(edges(page)).toHaveCount(2);

  // 1000 req/s, 90 % reads: 2 × 1000/s service at 50 %, a single SQL primary at 20 %.
  await expect(page.getByTestId("wb-served")).toHaveText("100%");
  await expect(page.getByTestId("wb-limit")).toContainText(
    "Holds about 2k req/s; beyond that Service saturates.",
  );
  await expect(page.locator("[data-testid=wb-check][data-code=multiInstanceNoLb]")).toHaveCount(1);
  const spof = page.locator("[data-testid=wb-resilience-row][data-verdict=spof]");
  await expect(spof).toHaveCount(1);
  await expect(spof).toContainText("SQL database");

  // Ten times the traffic overloads both: the service serves 1/5 and the database 1/2 of its demand.
  await page.getByTestId("wb-preset-10000").click();
  await expect(node(page, "service")).toHaveAttribute("data-status", "overloaded");
  await expect(node(page, "sql")).toHaveAttribute("data-status", "overloaded");
  await expect(page.getByTestId("wb-served")).toHaveText("10%");
  await page.getByTestId("wb-preset-1000").click();

  // Taking the database down fails every request; healing restores them.
  await node(page, "sql").click();
  await expect(page.getByTestId("wb-inspector")).toBeVisible();
  await page.getByTestId("wb-field-failure").selectOption("down");
  await expect(page.getByTestId("wb-served")).toHaveText("0%");
  await page.getByTestId("wb-heal").click();
  await expect(page.getByTestId("wb-served")).toHaveText("100%");

  // A second database instance removes the single point of failure.
  await page.getByTestId("wb-field-replicas").fill("2");
  await expect(spof).toHaveCount(0);
  await expect(page.locator("[data-testid=wb-check][data-code=replicaLag]")).toHaveCount(1);

  // Delete removes the selection; undo brings it back with its arrow.
  await node(page, "sql").click();
  await page.keyboard.press("Delete");
  await expect(node(page, "sql")).toHaveCount(0);
  await expect(edges(page)).toHaveCount(1);
  await page.getByTestId("wb-undo").click();
  await expect(node(page, "sql")).toHaveCount(1);
  await expect(edges(page)).toHaveCount(2);

  await expect(page.getByTestId("wb-save-state")).toHaveText("Saved");
  await page.reload();
  await expect(page.getByTestId("wb-node")).toHaveCount(3);
  await expect(edges(page)).toHaveCount(2);
  await expect(node(page, "sql").getByTestId("wb-node-replicas")).toHaveText("×2");
});

test("question whiteboard: expected blocks, drafted status and the diagram in the AI review", async ({
  page,
  request,
}) => {
  await page.goto("/practice/system-design/pastebin");
  await expect(page.getByTestId("sd-status")).toHaveText("Not started");
  await expect(page.getByTestId("sd-board-card")).toContainText("Draw the architecture");
  await page.getByTestId("sd-open-board").click();
  await page.waitForURL("**/practice/system-design/pastebin/whiteboard");
  await expect(page.getByTestId("wb-prompt")).toContainText("Pastebin");

  await page.getByTestId("wb-template").selectOption("readHeavy");
  await expect(page.getByTestId("wb-node")).toHaveCount(6);

  // Expected building blocks stay hidden until revealed.
  await expect(page.getByTestId("wb-block")).toHaveCount(0);
  await page.getByTestId("wb-blocks-toggle").click();
  const met = await page
    .getByTestId("wb-block")
    .evaluateAll((els) => els.map((e) => `${e.textContent}:${e.getAttribute("data-met")}`));
  expect(met).toEqual([
    "Service:true",
    "SQL database or NoSQL database:true",
    "Object storage:false",
    "CDN or Cache:true",
    "Worker:false",
  ]);
  await expect(page.getByTestId("wb-save-state")).toHaveText("Saved");

  await page.getByTestId("wb-back").click();
  await expect(page.getByTestId("sd-board-card")).toContainText("6 components on your board");
  await expect(page.getByTestId("sd-status")).toHaveText("Drafted");

  await page
    .getByTestId("sd-section-requirements")
    .fill(
      "Users paste text up to a megabyte and get a short link; pastes can expire; reads dominate writes. Non-functional: durable, highly available reads, low latency for popular pastes.",
    );
  await page
    .getByTestId("sd-section-highLevel")
    .fill(
      "Paste API stores metadata in PostgreSQL and content in object storage; popular pastes are served from a CDN and a Redis cache; a cleanup worker deletes expired pastes.",
    );
  await expect(page.getByTestId("sd-save-state")).toHaveText("Saved");
  await page.getByRole("button", { name: "Review with AI" }).click();
  await expect(page.getByTestId("sd-result")).toContainText("AI review");

  const recorded = (await (await request.get(`${MOCK_URL}/__requests`)).json()) as Recorded[];
  const review = recorded
    .filter((r) => !r.body.stream && String(r.body.system).includes("written system design"))
    .at(-1)!;
  const content = String(review.body.messages?.[0]?.content);
  expect(content).toContain("<candidate_diagram>");
  expect(content).toContain("- CDN (CDN, hit rate 90%)");
  expect(content).toContain("- Service → Cache");
  expect(content).toContain("- SQL database (SQL database, primary + 2 read replica(s))");
});
