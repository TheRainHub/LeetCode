---
slug: tool-calling
title: Tool calling
path: ai-engineering
module: ai-agents
order: 1
minutes: 45
depth: full
practice: conceptual
summary: How models request tool calls, the client-side tool loop, designing tool names/descriptions/schemas, validating arguments, handling errors, and security boundaries.
prerequisites: [structured-outputs]
problems: []
objectives:
  - Explain the tool-use loop (model requests tool → app executes → result returned → model continues)
  - Design clear, minimal tools with good descriptions and strict input schemas
  - Validate arguments, handle tool errors, and limit what tools can do (least privilege, confirmation for side effects)
readings:
  - title: "Anthropic docs — Tool use overview"
    url: https://platform.claude.com/docs/en/agents-and-tools/tool-use/overview
    kind: docs
  - title: "Anthropic engineering — Writing effective tools for agents"
    url: https://www.anthropic.com/engineering/writing-tools-for-agents
    kind: article
interview:
  - q: "Does the model execute tools itself?"
    a: "For client tools, no: the model outputs a structured tool-use request (name + JSON arguments) and stops; your application validates and executes it, then sends the result back in the next request. The model decides when and how to call; your code decides whether to allow it. (Some providers also offer server-side tools they execute.)"
  - q: "What makes a tool easy for a model to use correctly?"
    a: "A clear name and description saying what it does, when to use it and what it returns; a small, strict input schema with described parameters and enums; meaningful, concise outputs (not huge raw dumps); actionable error messages; and not too many overlapping tools."
  - q: "How do you make tool use safe?"
    a: "Least privilege (read-only where possible, scoped credentials), validate arguments, require human confirmation for destructive or external side effects, rate/step limits, treat tool outputs as untrusted data (prompt injection), and log every call."
selfAssessment:
  - I can implement the tool loop with message history
  - I can write a good tool description and schema
  - I know which tools need human confirmation
completion:
  - Score at least 70% on the quiz
  - Explain the tool loop in interview mode
quiz:
  - q: "When the model's response has stop reason 'tool_use', the app should:"
    options: ["Show it to the user as the answer", "Execute the requested tool(s) and send back tool results, then call the model again", "Discard it", "Retry the request"]
    answer: 1
    why: "That's the agent loop."
  - q: "A tool returns 2 MB of raw logs. Better design:"
    options: ["Return it all", "Return a filtered/summarised, paginated result with the most relevant lines", "Return nothing", "Return a link the model can't open"]
    answer: 1
    why: "Context is limited and noisy output degrades decisions."
  - q: "A 'delete_branch' tool should:"
    options: ["Run automatically", "Require explicit confirmation or not be exposed at all unless needed", "Be described vaguely", "Have no schema"]
    answer: 1
    why: "Side-effecting tools need human-in-the-loop controls."
explain:
  prompt: "Explain how a tool-calling loop works and how you'd design tools for an agent that investigates a code repository."
  rubric:
    - "Loop: request with tools → tool_use → app executes → tool_result → repeat until final answer"
    - "Tool design: few focused read-only tools with clear descriptions and schemas"
    - "Validation, error results, output size limits"
    - "Budgets, logging, prompt injection from tool outputs"
  model: "The application sends the conversation plus tool definitions — name, description and JSON input schema. When the model wants information it responds with a tool-use block naming the tool and arguments and stops. My code validates the arguments against the schema and policy, executes the tool, and sends the result back as a tool-result message in the next request; the model continues, possibly calling more tools, until it produces a final answer. For a repository investigator I'd expose a few read-only tools: search code with a query and optional path filter returning matches with line numbers, read file with a line range, and list usages of a symbol. Descriptions say when to use each, outputs are truncated and paginated so they fit the context, and errors come back as informative tool results so the model can correct itself. The loop has a step and token budget, every call is logged, and file contents are treated as untrusted data because they could contain injected instructions."
cards:
  - q: "Tool-use loop"
    a: "Model emits tool_use → app validates & executes → returns tool_result → model continues."
  - q: "Good tool design"
    a: "Clear name/description, strict small schema, concise outputs, actionable errors, few tools."
---

## Explanation

### The loop

```text
messages + tools ─► model ─► stop_reason = tool_use { name, input }
                         ◄─ app executes, appends assistant turn + tool_result
            repeat until stop_reason = end_turn (final answer) or budget exhausted
```
The assistant's tool-use turn must be included in history before the tool result.

### Designing tools

- Names and descriptions are prompts: what, when, what it returns, limitations.
- Strict schemas: types, enums, required fields, descriptions; reject invalid input.
- Return concise, relevant, structured results; paginate.
- Errors as tool results with guidance ("file not found; did you mean …?").
- Prefer a few well-scoped tools over many overlapping ones.

### Safety

Least privilege, read-only by default, confirmation for side effects, sandboxing for code execution, rate and step limits, audit logs, and treating tool output as untrusted (indirect prompt injection).

## Worked examples

```ts
const tools = [{
  name: "search_code",
  description: "Search the repository for a literal string or regex. Returns up to 20 matches as path:line: text. Use to find where a package or function is used.",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string", description: "Text or regex to search for" },
      path_prefix: { type: "string", description: "Optional directory to limit the search" },
    },
    required: ["query"],
  },
}];
```

## Common misconceptions

- **"The model runs my functions."** — Your code does, after deciding to allow it.
- **"More tools = more capable agent."** — Overlapping tools confuse selection.

## Practical exercises

1. Implement a two-tool loop (search + read file) with a step limit over a small local repo.
2. Write descriptions for three tools and test whether the model picks the right one on 10 prompts.
