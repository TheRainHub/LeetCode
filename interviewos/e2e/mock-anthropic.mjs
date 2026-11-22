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

/* ---------------------------------------------------------------- */
/* Job search: research turns with server-side web tools, then JSON. */
/* ---------------------------------------------------------------- */

const SEARCH_RESULTS = [
  { url: "https://careers.example.com/jobs/101", title: "Graduate Software Engineer — Example Bank" },
  { url: "https://jobs.example.org/listing/202", title: "Junior Backend Developer — Sample Logistics" },
  { url: "https://news.example.net/article", title: "Tech hiring in Prague" },
];
/** Results for searches whose criteria mention "auto-test" (automatic-search spec). */
const SEARCH_RESULTS_AUTO = [
  { url: "https://careers.example.com/jobs/auto-1", title: "Platform Engineer Graduate — Example Cloud" },
  { url: "https://careers.example.com/jobs/auto-2", title: "Developer Productivity Intern — Example Tools" },
];

const FETCHED_POSTING =
  "Backend Engineer (Graduate) at Example Payments, Prague (hybrid). You will build Java and TypeScript services for card payments, " +
  "write tests, and take part in on-call. Requirements: degree in computer science (or final year), Java or TypeScript, SQL, REST APIs. " +
  "Nice to have: Kafka, Docker, cloud experience. Apply by 31 January 2027.";

/** Turns finished content blocks into the SSE events of a streamed message. */
function blocksToSse(body, blocks, stopReason = "end_turn") {
  const events = [
    {
      type: "message_start",
      message: {
        id: "msg_mock_research",
        type: "message",
        role: "assistant",
        model: body.model,
        content: [],
        stop_reason: null,
        stop_sequence: null,
        usage: {
          input_tokens: 300,
          output_tokens: 1,
          cache_creation_input_tokens: 0,
          cache_read_input_tokens: 0,
        },
      },
    },
  ];
  blocks.forEach((block, index) => {
    if (block.type === "text") {
      events.push({ type: "content_block_start", index, content_block: { type: "text", text: "" } });
      events.push({ type: "content_block_delta", index, delta: { type: "text_delta", text: block.text } });
    } else if (block.type === "server_tool_use" || block.type === "tool_use") {
      events.push({ type: "content_block_start", index, content_block: { ...block, input: {} } });
      events.push({
        type: "content_block_delta",
        index,
        delta: { type: "input_json_delta", partial_json: JSON.stringify(block.input) },
      });
    } else {
      events.push({ type: "content_block_start", index, content_block: block });
    }
    events.push({ type: "content_block_stop", index });
  });
  events.push({
    type: "message_delta",
    delta: { stop_reason: stopReason, stop_sequence: null },
    usage: { output_tokens: 200, server_tool_use: { web_search_requests: 1 } },
  });
  events.push({ type: "message_stop" });
  return events;
}

const searchBlocks = (id, query, results = SEARCH_RESULTS) => [
  { type: "server_tool_use", id, name: "web_search", input: { query } },
  {
    type: "web_search_tool_result",
    tool_use_id: id,
    content: results.map((r) => ({
      type: "web_search_result",
      url: r.url,
      title: r.title,
      encrypted_content: "x",
      page_age: null,
    })),
  },
];

function researchReply(body) {
  const system = String(body.system ?? "");
  const prompt = String(body.messages?.[0]?.content ?? "");
  if (system.includes("job-search researcher") && prompt.includes("auto-test")) {
    return blocksToSse(body, [
      ...searchBlocks("srvtoolu_a", "platform engineer graduate Prague", SEARCH_RESULTS_AUTO),
      {
        type: "text",
        text:
          "1. Platform Engineer Graduate, Example Cloud — https://careers.example.com/jobs/auto-1\n" +
          "2. Developer Productivity Intern, Example Tools — https://careers.example.com/jobs/auto-2",
      },
    ]);
  }
  if (system.includes("job-search researcher")) {
    return blocksToSse(body, [
      ...searchBlocks("srvtoolu_1", "graduate software engineer Prague"),
      {
        type: "text",
        text:
          "1. Graduate Software Engineer, Example Bank, Prague, hybrid — https://careers.example.com/jobs/101\n" +
          "2. Junior Backend Developer, Sample Logistics, remote — https://jobs.example.org/listing/202\n" +
          "3. Platform Intern, Ghost Corp — https://invented.example.com/job/999",
      },
    ]);
  }
  if (system.includes("Read the job posting at the URL")) {
    const url = prompt.replace(/^Job posting URL:\s*/, "").trim();
    const fetchUse = { type: "server_tool_use", id: "srvtoolu_f", name: "web_fetch", input: { url } };
    if (url.includes("blocked")) {
      return blocksToSse(body, [
        fetchUse,
        {
          type: "web_fetch_tool_result",
          tool_use_id: "srvtoolu_f",
          content: { type: "web_fetch_tool_result_error", error_code: "url_not_accessible" },
        },
        { type: "text", text: "The page could not be read." },
      ]);
    }
    return blocksToSse(body, [
      fetchUse,
      {
        type: "web_fetch_tool_result",
        tool_use_id: "srvtoolu_f",
        content: {
          type: "web_fetch_result",
          url,
          retrieved_at: null,
          content: {
            type: "document",
            title: "Backend Engineer (Graduate)",
            source: { type: "text", media_type: "text/plain", data: FETCHED_POSTING },
            citations: null,
          },
        },
      },
      { type: "text", text: `Posting details: ${FETCHED_POSTING}` },
    ]);
  }
  // Company hiring-process research.
  return blocksToSse(body, [
    ...searchBlocks("srvtoolu_r", "interview process"),
    {
      type: "text",
      text: "Sources describe an online test, a technical interview and a final behavioural round.",
    },
  ]);
}

/* Mentor: first turn calls tools (one with an unknown lesson), then answers after the results. */
let mentorToolCalls = 0;
function mentorReply(body) {
  const last = body.messages?.at(-1);
  const content = Array.isArray(last?.content) ? last.content : [];
  if (content.some((b) => b.type === "tool_result"))
    return blocksToSse(body, [
      { type: "text", text: "Mock mentor: the tasks are in your list. Tell me how they go." },
    ]);
  mentorToolCalls += 1;
  const n = mentorToolCalls;
  return blocksToSse(
    body,
    [
      { type: "text", text: `Mock mentor reply ${n}: start with caching, then practise.` },
      {
        type: "tool_use",
        id: `toolu_task_${n}`,
        name: "assign_task",
        input: {
          title: `Study caching strategies ${n}`,
          details: "Read the lesson and answer its quiz with at least 80%.",
          kind: "lesson",
          ref: "caching",
          estimate_minutes: 45,
        },
      },
      {
        type: "tool_use",
        id: `toolu_bad_${n}`,
        name: "assign_task",
        input: {
          title: "Read a lesson that does not exist",
          details: "",
          kind: "lesson",
          ref: "no-such-lesson",
        },
      },
      {
        type: "tool_use",
        id: `toolu_note_${n}`,
        name: "remember",
        input: { note: `Prefers product companies (${n})` },
      },
    ],
    "tool_use",
  );
}

const MOCK_RESUME_LINE = "Built an internal integration service in TypeScript used by 3 teams";

function jobsPayload(system, content) {
  if (system.includes("Convert job-search research notes") && content.includes("jobs/auto-1"))
    return {
      jobs: SEARCH_RESULTS_AUTO.map((r, i) => ({
        title: r.title.split(" — ")[0],
        company: r.title.split(" — ")[1],
        location: "Prague",
        workMode: "hybrid",
        level: i === 0 ? "graduate" : "internship",
        url: r.url,
        summary: "Internal developer platform work.",
        whyFit: "Backstage and CI experience.",
        concerns: "",
        deadline: "",
      })),
      notes: "Searched platform and developer-productivity roles.",
    };
  if (system.includes("Convert job-search research notes"))
    return {
      jobs: [
        {
          title: "Graduate Software Engineer",
          company: "Example Bank",
          location: "Prague",
          workMode: "hybrid",
          level: "graduate",
          url: "https://careers.example.com/jobs/101",
          summary: "Rotational graduate programme in backend teams.",
          whyFit: "Matches the TypeScript integration work in the résumé.",
          concerns: "",
          deadline: "",
        },
        {
          title: "Junior Backend Developer",
          company: "Sample Logistics",
          location: "Remote (EU)",
          workMode: "remote",
          level: "junior",
          url: "https://jobs.example.org/listing/202?utm_source=search",
          summary: "Node.js services for shipment tracking.",
          whyFit: "Backend focus.",
          concerns: "Asks for one year of experience.",
          deadline: "15 December 2026",
        },
        {
          title: "Platform Intern",
          company: "Ghost Corp",
          location: "Prague",
          workMode: "unknown",
          level: "internship",
          url: "https://invented.example.com/job/999",
          summary: "Not a page the model read.",
          whyFit: "",
          concerns: "",
          deadline: "",
        },
      ],
      notes: "Searched graduate and junior backend roles in Prague and remote EU.",
    };
  if (system.includes("Convert notes about one job posting"))
    return {
      isJobPosting: true,
      title: "Backend Engineer (Graduate)",
      company: "Example Payments",
      location: "Prague",
      workMode: "hybrid",
      description: FETCHED_POSTING,
    };
  // Résumé-vs-posting analysis.
  return {
    summary: "Good match on backend fundamentals; Kafka and on-call experience are not shown.",
    fit: {
      score: 72,
      verdict: "good",
      reasoning: "Java/TypeScript and REST are shown; payments domain is new.",
    },
    requirements: [
      { requirement: "Java or TypeScript", importance: "must", status: "met", evidence: MOCK_RESUME_LINE },
      { requirement: "Kafka", importance: "nice", status: "missing", evidence: "Not shown in the résumé" },
    ],
    resume: {
      headline: "Final-year CS student who builds TypeScript backend services.",
      emphasize: ["The integration service: move it to the top."],
      deemphasize: ["Unrelated coursework list."],
      keywordsPresent: ["TypeScript", "REST"],
      keywordsMissing: ["Kafka", "Docker"],
      rewrites: [
        {
          original: MOCK_RESUME_LINE,
          suggested: "Designed and built a TypeScript integration service adopted by three internal teams",
          why: "Leads with ownership and reach.",
        },
        {
          original: "Led a team of 12 engineers on payments",
          suggested: "Led 12 engineers",
          why: "Invented — must be dropped.",
        },
      ],
      gaps: [
        {
          gap: "Kafka",
          honestFraming: "Say you have used queues conceptually and are learning Kafka.",
          howToClose: "Build a small producer/consumer project this week.",
        },
      ],
    },
    preparation: {
      focusAreas: [
        {
          area: "Messaging",
          why: "Kafka is listed.",
          priority: "high",
          lessons: ["caching", "made-up-lesson"],
          sdQuestions: ["payment-system", "not-a-question"],
        },
      ],
      stories: [{ story: "Make internship", useFor: "Tell me about a project you owned." }],
      process: "Online test, technical interview, behavioural final round.",
      processBasis: "sources",
      questionsToAsk: ["How do teams handle on-call for payment services?"],
    },
    pitch: "Lead with the integration service and testing discipline.",
    redFlags: [],
  };
}

const server = createServer((req, res) => {
  const url = new URL(req.url ?? "/", `http://localhost:${port}`);
  if (req.method === "GET" && url.pathname === "/__health") return res.end("ok");
  if (req.method === "GET" && url.pathname === "/__image.png") {
    // 1×1 transparent PNG for guide fixtures.
    res.writeHead(200, { "content-type": "image/png" });
    return res.end(
      Buffer.from(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=",
        "base64",
      ),
    );
  }
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
      const usesWebTools =
        Array.isArray(body.tools) && body.tools.some((t) => /^web_(search|fetch)_/.test(t.type));
      if (body.stream && usesWebTools) return sse(res, researchReply(body));
      if (body.stream && String(body.system ?? "").includes("long-term mentor"))
        return sse(res, mentorReply(body));
      if (body.stream) return sse(res, chatReply(body));
      const system = typeof body.system === "string" ? body.system : "";
      const isJobs =
        system.includes("Convert job-search research notes") ||
        system.includes("Convert notes about one job posting") ||
        system.includes("honest career coach");
      const isDesignReview = typeof body.system === "string" && body.system.includes("written system design");
      const rubricSize = isDesignReview
        ? (String(body.messages?.[0]?.content ?? "").match(/^\d+\. /gm) ?? []).length
        : 0;
      const payload = isDesignReview
        ? {
            // Deterministic: every even-numbered rubric item counts as covered.
            rubric: Array.from({ length: rubricSize }, (_, index) => ({
              index,
              covered: index % 2 === 0,
              evidence: "mock evidence",
            })),
            feedback: "- Mock review: clear requirements.\n- Missing: estimates that drive decisions.",
          }
        : isJobs
          ? jobsPayload(system, String(body.messages?.[0]?.content ?? ""))
          : EVALUATION;
      res.writeHead(200, { "content-type": "application/json" });
      res.end(
        JSON.stringify({
          id: "msg_mock_eval",
          type: "message",
          role: "assistant",
          model: body.model,
          content: [{ type: "text", text: JSON.stringify(payload) }],
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
