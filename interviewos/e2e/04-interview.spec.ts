import { expect, test } from "./fixtures";
import { E2E_API_KEY, MOCK_URL } from "./env";

type Recorded = {
  path: string;
  body: { stream?: boolean; system?: unknown; messages: { role: string; content: unknown }[] };
};

test("mock interview streams replies, replays thinking blocks unchanged and stores a sanitised evaluation", async ({
  page,
  request,
}) => {
  await page.goto("/interviews");
  await page.getByTestId("start-interview").click();
  await page.waitForURL(/\/interviews\/\d+$/);

  // Opening question is requested automatically and streamed in.
  await expect(
    page.getByText("Mock interviewer question 1: how does a hash map handle collisions?"),
  ).toBeVisible();

  await page
    .getByTestId("interview-input")
    .fill("Keys are hashed into buckets; collisions are chained in a list per bucket.");
  await page.getByTestId("interview-send").click();
  await expect(page.getByText(/Mock interviewer question 2/)).toBeVisible();

  await page.getByTestId("interview-input").fill("Lookups are always constant time.");
  await page.getByTestId("interview-send").click();
  await expect(page.getByText(/Mock interviewer question 3/)).toBeVisible();

  const recorded = (await (await request.get(`${MOCK_URL}/__requests`)).json()) as Recorded[];
  const chats = recorded.filter((r) => r.body.stream);
  expect(chats).toHaveLength(3);
  // The opening turn and the elapsed-time marker are added by the server, not typed by the user.
  expect(chats[0]!.body.messages).toEqual([{ role: "user", content: "[INTERVIEW START]" }]);
  const second = chats[1]!.body.messages;
  expect(second).toHaveLength(3);
  // The assistant turn is replayed with its original content blocks, thinking + signature included.
  expect(second[1]).toMatchObject({
    role: "assistant",
    content: [
      {
        type: "thinking",
        thinking: "Mock reasoning 1: pick the next question.",
        signature: "mock-signature-1",
      },
      { type: "text", text: "Mock interviewer question 1: how does a hash map handle collisions?" },
    ],
  });
  expect(String(second[2]!.content)).toContain("[Elapsed:");
  // The frozen system prompt is identical on every turn.
  expect(chats[2]!.body.system).toEqual(chats[0]!.body.system);

  // The API key is used server-side only.
  expect(await page.content()).not.toContain(E2E_API_KEY);

  page.once("dialog", (d) => void d.accept());
  await page.getByTestId("end-interview").click();
  await expect(page.getByTestId("overall-score")).toHaveText(/58/);
  await expect(page.getByText("Did not discuss worst-case O(n) lookups")).toBeVisible();
  await expect(page.getByText("not-a-real-topic")).toHaveCount(0);

  const evalRequest = (await (await request.get(`${MOCK_URL}/__requests`)).json()) as Recorded[];
  const evaluation = evalRequest.filter((r) => !r.body.stream);
  expect(evaluation).toHaveLength(1);
  expect(String(evaluation[0]!.body.messages[0]!.content)).toContain("Hints requested by the candidate: 0");
});
