---
slug: agent-reliability
title: Agent reliability in production
path: ai-engineering
module: ai-reliability
order: 4
minutes: 40
depth: concise
practice: conceptual
summary: Making agentic systems dependable — budgets, deterministic guardrails, retries and fallbacks, tracing, cost control, versioning prompts/models, and human-in-the-loop design.
prerequisites: [agent-architectures, model-evaluation]
problems: []
objectives:
  - Identify failure modes of agents (loops, tool errors, compounding mistakes, drift after model updates)
  - Add guardrails — budgets, validation, fallbacks, idempotent side effects, checkpoints
  - Operate agents with tracing, metrics, versioned prompts/models and evaluation gates
readings:
  - title: "Anthropic — Building effective agents"
    url: https://www.anthropic.com/engineering/building-effective-agents
    kind: article
  - title: "OpenTelemetry — Semantic conventions for generative AI"
    url: https://opentelemetry.io/docs/specs/semconv/gen-ai/
    kind: docs
interview:
  - q: "How do you stop an agent from looping or running up costs?"
    a: "Hard limits on steps, tokens, wall time and spend per task; detect repeated identical tool calls; require progress signals; end with a graceful 'uncertain/incomplete' result rather than failing silently; alert on cost anomalies."
  - q: "A model version upgrade changed your agent's behaviour. How do you manage that?"
    a: "Pin model versions explicitly, run the evaluation suite on the new model before switching, roll out gradually (shadow mode or a percentage of traffic) behind a flag, compare metrics and keep the old version available for rollback."
selfAssessment:
  - I can list agent failure modes and guardrails for each
  - I can describe how to roll out a prompt or model change safely
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "An agent's tool call fails with a timeout. Good default behaviour:"
    options: ["Crash the whole task", "Return an informative error as the tool result so the agent can retry or adapt, within retry limits", "Hide the error", "Retry forever"]
    answer: 1
    why: "Errors are information; bound retries."
  - q: "Running a new prompt version on real traffic without exposing its outputs, to compare with the current one, is:"
    options: ["A canary", "Shadow mode", "Fine-tuning", "RAG"]
    answer: 1
    why: "Shadow mode measures without user impact (watch privacy and cost)."
  - q: "Agent side effects (creating tickets, sending messages) should be:"
    options: ["Fire-and-forget", "Idempotent and logged, with confirmation where risky", "Done twice for safety", "Avoided entirely always"]
    answer: 1
    why: "Agents retry; duplicates must be harmless."
explain:
  prompt: "Explain how you'd take an LLM agent prototype to a reliable production service."
  rubric:
    - "Evaluation suite and success criteria as gates"
    - "Guardrails: budgets, validation of outputs, idempotent side effects, human checkpoints"
    - "Observability: traces of steps/tool calls, cost and latency metrics, feedback"
    - "Change management: pinned models, versioned prompts, gradual rollout, rollback"
  model: "First I'd define success criteria and build an evaluation suite from real cases so every change can be measured. Then guardrails: step, token and time budgets; strict validation of tool inputs and final outputs; idempotent side effects; and human approval for anything consequential. Failures degrade to an explicit 'uncertain' result instead of a confident guess. For operations, each run is traced — prompts, tool calls, results, tokens, latency — with dashboards for success rate, cost per task and error types, plus a feedback channel for reviewers. Model versions are pinned and prompts versioned in code; changes pass the eval gate, run in shadow or for a small share of traffic behind a flag, and can be rolled back instantly."
cards:
  - q: "Agent guardrails"
    a: "Budgets, loop detection, schema validation, idempotent side effects, human checkpoints, graceful 'uncertain'."
  - q: "Safe model/prompt change"
    a: "Pin versions → eval gate → shadow/canary behind flag → compare → rollback path."
---

## Explanation

### Failure modes

Loops and repeated calls, tool errors and timeouts, compounding mistakes, context overflow, injection, nondeterminism, provider outages and rate limits, behaviour drift on model updates, runaway cost.

### Guardrails

- Budgets (steps, tokens, time, money) and loop detection.
- Deterministic validation of tool arguments and final outputs.
- Retries with backoff for provider errors; fallback models where acceptable.
- Idempotent, logged side effects; confirmations for risky actions.
- Graceful degradation: "uncertain" beats wrong.

### Operations

- Tracing every step (OpenTelemetry GenAI conventions), cost/latency metrics, error taxonomy.
- Versioned prompts/tools in code review; pinned models.
- Eval gates in CI; shadow/canary rollouts behind feature flags.
- Human feedback loop into the eval set.

## Worked examples

InterviewOS handles provider failures explicitly: AI errors are mapped to clear messages, a failed turn keeps the candidate's message and records `lastError`, and when no API key is configured the AI features say so instead of faking responses.

## Common misconceptions

- **"If it worked in the demo, it works."** — Reliability is a distribution; measure it.
- **"Retries fix flaky agents."** — They hide systematic failures; analyse errors.

## Practical exercises

1. Add step and token budgets plus loop detection to an agent loop.
2. Write a rollout plan for switching your agent to a new model version.
