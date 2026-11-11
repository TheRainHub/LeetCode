/**
 * Minimal local stand-in for the Anthropic Messages API, used only by the
 * Playwright suite (the app points ANTHROPIC_BASE_URL here). It is not a
 * simulation of model quality: replies are fixed strings so tests can assert
 * on streaming, persistence and request shape. Every request is recorded and
 * can be read back from GET /__requests.
 */
import { createServer } from "node:http";

const port = Number(process.env.MOCK_PORT ?? 4010);
const requests = [];
let chatReplies = 0;

const EVALUATION = {
  overallScore: 58,
  summary:
    "Mock evaluation: correct core idea, but collision handling and complexity were only partly explained.",
  dimensions: {
    technicalCorrectness: { score: 3, evidence: "Described buckets but not resizing." },
    problemSolving: { score: 3, evidence: "Reached the approach after one follow-up." },
    codingQuality: { score: null, evidence: "No code was written." },
    architecture: { score: null, evidence: "Not exercised." },
    communication: { score: 4, evidence: "Clear, structured answers." },
    independence: { score: 4, evidence: "No hints requested." },
    edgeCases: { score: 2, evidence: "Did not mention worst-case collisions." },
  },
  strengths: ["Explained hashing into buckets clearly"],
  weaknesses: ["Did not discuss worst-case O(n) lookups"],
  mistakes: [
    {
      description: "Claimed lookups are always O(1)",
      evidence: "'always constant time'",
      correction: "Average O(1); worst case O(n) with many collisions.",
    },
  ],
  modelAnswer: "A hash map hashes the key to a bucket index…",
  recommendedTopics: [
    { topicSlug: "hashmap-hashset", reason: "Collision handling" },
    { topicSlug: "not-a-real-topic", reason: "Must be dropped by sanitisation" },
  ],
  coveredTopics: [{ topicSlug: "hashmap-hashset", score: 0.55 }],
  followUpExercises: [{ title: "Two Sum", description: "Use a map for complements", problemSlug: "two-sum" }],
  spacedRepetition: [
    {
      prompt: "Worst-case hash map lookup complexity and why?",
      answer: "O(n) when many keys collide into one bucket.",
      topicSlug: "hashmap-hashset",
    },
  ],
};

function sse(res, events) {
  res.writeHead(200, {
    "content-type": "text/event-stream",
    "cache-control": "no-cache",
    connection: "keep-alive",
  });
  for (const e of events) res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`);
  res.end();
}

function chatReply(body) {
  chatReplies += 1;
  const n = chatReplies;
  const thinking = `Mock reasoning ${n}: pick the next question.`;
  const signature = `mock-signature-${n}`;
  const text = `Mock interviewer question ${n}: how does a hash map handle collisions?`;
  const half = Math.ceil(text.length / 2);
  return [
    {
      type: "message_start",
      message: {
        id: `msg_mock_${n}`,
        type: "message",
        role: "assistant",
        model: body.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 100,
          output_tokens: 1,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    },
    {
      type: "content_block_start",
      index: 0,
      content_block: { type: "thinking", thinking: "", signature: "" },
    },
    { type: "content_block_delta", index: 0, delta: { type: "thinking_delta", thinking } },
    { type: "content_block_delta", index: 0, delta: { type: "signature_delta", signature } },
    { type: "content_block_stop", index: 0 },
    { type: "content_block_start", index: 1, content_block: { type: "text", text: "" } },
    { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: text.slice(0, half) } },
    { type: "content_block_delta", index: 1, delta: { type: "text_delta", text: text.slice(half) } },
    { type: "content_block_stop", index: 1 },
    {
      type: "message_delta",
      delta: { stop_reason: "end_turn", stop_sequence: null },
      usage: { output_tokens: 40 },
    },
    { type: "message_stop" },
  ];
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  if (req.method === "GET" && url.pathname === "/__health") return res.end("ok");
  if (req.method === "GET" && url.pathname === "/__requests") {
    res.writeHead(200, { "content-type": "application/json" });
    return res.end(JSON.stringify(requests));
  }
  if (req.method === "POST" && url.pathname === "/v1/messages") {
    let raw = "";
    req.on("data", (c) => (raw += c));
    req.on("end", () => {
      const body = JSON.parse(raw);
      requests.push({
        path: req.url,
        headers: {
          "anthropic-beta": req.headers["anthropic-beta"] ?? null,
          "x-api-key": req.headers["x-api-key"] ? "<present>" : null,
        },
        body,
      });
      if (body.stream) return sse(res, chatReply(body));
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_mock_eval",
          type: "message",
          role: "assistant",
          model: body.model,
          content: [{ type: "text", text: JSON.stringify(EVALUATION) }],
          stop_reason: "end_turn",
          stop_sequence: null,
          usage: { input_tokens: 500, output_tokens: 300 },
        }),
      );
    });
    return;
  }
  res.writeHead(404, { "content-type": "application/json" });
  res.end(
    JSON.stringify({
      type: "error",
      error: { type: "not_found_error", message: `No mock for ${req.method} ${url.pathname}` },
    }),
  );
});

server.listen(port, "127.0.0.1", () => console.log(`[mock-anthropic] listening on ${port}`));
