---
slug: llm-apis
title: Working with LLM APIs
path: ai-engineering
module: ai-foundations
order: 1
minutes: 45
depth: full
practice: conceptual
summary: Messages, roles and system prompts, tokens and context windows, sampling, streaming, stop reasons, cost and latency, errors and rate limits — the production basics of calling an LLM.
prerequisites: [promises-async]
problems: []
objectives:
  - Explain how a chat-style LLM API request is structured (system prompt, alternating messages, max tokens) and that the model is stateless between calls
  - Reason about tokens, context windows, cost and latency, and use streaming for responsiveness
  - Handle stop reasons, errors, rate limits and retries in production code, keeping API keys server-side
readings:
  - title: "Anthropic docs — Messages API overview"
    url: https://platform.claude.com/docs/en/build-with-claude/working-with-messages
    kind: docs
  - title: "Anthropic docs — Streaming messages"
    url: https://platform.claude.com/docs/en/build-with-claude/streaming
    kind: docs
  - title: "Anthropic docs — Prompt caching"
    url: https://platform.claude.com/docs/en/build-with-claude/prompt-caching
    kind: docs
  - title: "Anthropic docs — Errors"
    url: https://platform.claude.com/docs/en/api/errors
    kind: docs
interview:
  - q: "How does a chatbot 'remember' a conversation if the model is stateless?"
    a: "The application stores the history and sends the relevant previous turns with every request. The model only sees what is in that request's context window, so long conversations need truncation, summarisation or retrieval, and every turn costs input tokens for the history (prompt caching reduces the cost of repeated prefixes)."
  - q: "Why stream LLM responses?"
    a: "Generation is token by token and can take many seconds; streaming shows output as it's produced, improving perceived latency, and lets you cancel early. It also avoids HTTP timeouts on long generations. The server must handle partial output, errors mid-stream and client disconnects."
  - q: "Why must API keys never reach the browser?"
    a: "Anything in client code or network requests from the browser is visible to users, who could then spend your quota or access your account. Call the provider from your server, authenticate your own users, and apply per-user limits."
selfAssessment:
  - I can describe the request/response shape of a messages API
  - I can estimate token cost of a multi-turn conversation
  - I know how to handle rate limits and overload errors
completion:
  - Score at least 70% on the quiz
  - Explain how InterviewOS's interviewer streams and stores messages in interview mode
quiz:
  - q: "A response stopped because it hit max_tokens. The application should:"
    options: ["Treat it as complete", "Detect the stop reason and handle truncation (continue, raise the limit, or show it as incomplete)", "Retry the identical request forever", "Ignore stop reasons"]
    answer: 1
    why: "Truncated output (e.g. half a JSON object) must not be treated as a finished answer."
  - q: "Each turn of a long chat gets more expensive mainly because:"
    options: ["The model gets tired", "The whole history is re-sent as input tokens", "Streaming costs more", "Output tokens are free"]
    answer: 1
    why: "Prompt caching of the stable prefix can reduce cost and latency."
  - q: "On a 429 rate-limit error, you should:"
    options: ["Retry immediately in a tight loop", "Back off (respect retry-after headers) and limit concurrency", "Switch API keys", "Give up permanently"]
    answer: 1
    why: "Same retry discipline as any external API."
  - q: "Lower temperature generally makes outputs:"
    options: ["Longer", "More deterministic/focused (less random sampling)", "Faster", "Cheaper"]
    answer: 1
    why: "Even at low temperature, outputs aren't guaranteed identical across calls."
explain:
  prompt: "Explain how you'd integrate an LLM API into a web app's backend for a chat feature, including streaming and error handling."
  rubric:
    - "Server-side calls only; key in environment/secret store; per-user auth and limits"
    - "Conversation state stored by the app; history (or summary) sent each turn; context limits"
    - "Streaming to the client (SSE/NDJSON), handling disconnects and partial output"
    - "Stop reasons, errors (429/overloaded/5xx) with backoff, timeouts; logging tokens/cost"
  model: "The browser talks only to my backend; the backend holds the API key from a secret store, authenticates the user and enforces per-user limits. The app stores each conversation in the database; on a new message it appends the user turn and sends the system prompt plus the history — summarised or truncated if it would exceed the context budget — to the API with a max token limit. I stream the response to the client over SSE or newline-delimited JSON so text appears immediately, and persist the assistant message once the stream completes, checking the stop reason so a max_tokens cutoff or a refusal is shown accurately. Rate-limit and overload errors are retried with backoff a couple of times; other errors produce a clear message and the user's input is kept so they can retry. I log token usage, latency and errors per request to watch cost. InterviewOS's interviewer works this way: a server route streams NDJSON and the conversation history is replayed on each turn."
cards:
  - q: "LLM statelessness"
    a: "The model sees only the current request; the app re-sends history each turn."
  - q: "Stop reasons to handle"
    a: "end_turn (done), max_tokens (truncated), tool_use (call tools), refusal/stop sequences."
  - q: "Why prompt caching"
    a: "Reuse a stable prompt prefix across calls → lower cost and latency."
---

## Explanation

### Request shape

A chat-style API takes a **system prompt** (role, rules, context), a list of **messages** alternating user/assistant, the **model**, and a **max_tokens** limit; optional tools, sampling parameters and output formats. The response contains content blocks, a **stop reason** and **token usage**.

### Tokens, context, cost

- Text is split into tokens (roughly ¾ of an English word on average; varies by language and model).
- **Context window** = input + output tokens the model can handle in one request.
- Cost ≈ input tokens × input price + output tokens × output price; output is usually more expensive per token.
- Multi-turn chats re-send history → input grows each turn. **Prompt caching** reuses a stable prefix (system prompt, documents) for cheaper, faster calls.

### Latency

Time to first token + generation time (∝ output length). Streaming improves perceived latency; shorter outputs and smaller models reduce total latency.

### Sampling

Temperature/top-p control randomness. Low values for extraction and classification; outputs still aren't perfectly deterministic.

### Production concerns

- Keys server-side only; authenticate users; per-user quotas.
- Timeouts, retries with backoff for 429/overload/5xx, idempotent handling of your own side effects.
- Handle stop reasons and refusals explicitly.
- Log model, tokens, latency, errors (not sensitive content unless needed and permitted).
- Configurable model and limits (InterviewOS reads them from environment variables).

## Worked examples

### Minimal streaming call (TypeScript SDK, illustrative)

```ts
import Anthropic from "@anthropic-ai/sdk";
const client = new Anthropic(); // reads ANTHROPIC_API_KEY on the server

const stream = client.messages.stream({
  model: process.env.ANTHROPIC_MODEL!,
  max_tokens: 1024,
  system: "You are a concise technical interviewer.",
  messages: [{ role: "user", content: "Ask me one question about hash maps." }],
});
for await (const event of stream) {
  if (event.type === "content_block_delta" && event.delta.type === "text_delta") process.stdout.write(event.delta.text);
}
const final = await stream.finalMessage();
console.log(final.stop_reason, final.usage);
```

### Token arithmetic

A 20-turn conversation averaging 300 tokens per turn re-sends ~6,000 tokens of history on the last turn alone; summed across turns that's ~60,000 input tokens — which is why caching or summarising history matters.

## Common misconceptions

- **"The model remembers previous requests."** — Only what you send.
- **"Temperature 0 means deterministic."** — Mostly stable, not guaranteed.
- **"A bigger context window means you should fill it."** — More tokens cost more and can dilute attention; send what's relevant.

## Practical exercises

1. Read `src/lib/ai/` and `src/server/interviews.ts` in InterviewOS and trace one interviewer turn from request to stored message.
2. Estimate the token cost of a 45-minute mock interview with your own numbers.
3. Implement retry with backoff for 429/overload errors around an LLM call.
