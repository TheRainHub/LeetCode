---
slug: structured-outputs
title: Structured outputs
path: ai-engineering
module: ai-foundations
order: 2
minutes: 40
depth: full
practice: conceptual
summary: Getting machine-readable results from LLMs — JSON schemas, constrained decoding vs prompting, validation and repair, and designing schemas that make the model's job easy and the result checkable.
prerequisites: [llm-apis, ts-type-system]
problems: []
objectives:
  - Choose between prompt-only JSON, tool/function schemas and native structured-output modes
  - Design schemas that encode the task (enums, required fields, nullable for unknown, evidence fields)
  - Validate outputs at runtime and post-process (clamp, filter unknown ids) instead of trusting them
readings:
  - title: "Anthropic docs — Structured outputs"
    url: https://platform.claude.com/docs/en/build-with-claude/structured-outputs
    kind: docs
  - title: "JSON Schema — Getting started"
    url: https://json-schema.org/learn/getting-started-step-by-step
    kind: docs
  - title: "Zod documentation"
    url: https://zod.dev/
    kind: docs
interview:
  - q: "How do you reliably get JSON from an LLM?"
    a: "Use the provider's structured-output feature (schema-constrained generation) or a tool definition with an input schema, rather than asking for JSON in prose. Still validate with a schema library at runtime, handle refusals/truncation (stop reasons), and post-process values against your own data (e.g. drop ids that don't exist)."
  - q: "Valid JSON — is the output correct now?"
    a: "No. Schema validity guarantees shape, not truth. Values can still be wrong, inconsistent or hallucinated. Add semantic checks (ids exist, scores in range, cited evidence present), and evaluate quality separately."
selfAssessment:
  - I can write a schema for an extraction task with nullable unknowns
  - I can explain why validation is still needed with constrained decoding
completion:
  - Score at least 70% on the quiz
  - Explain InterviewOS's evaluation schema and sanitisation in interview mode
quiz:
  - q: "For a field the model may not be able to determine, the schema should:"
    options: ["Require a value anyway", "Allow null (or an explicit 'unknown') so the model isn't forced to guess", "Omit the field", "Use a free-text field"]
    answer: 1
    why: "Forcing values encourages fabrication."
  - q: "An enum for 'severity' instead of free text helps because:"
    options: ["It's shorter", "Downstream code can branch reliably and the model can't invent new categories", "It's faster", "It removes the need for validation"]
    answer: 1
    why: "Constrain wherever the domain is closed."
  - q: "The model returns a topic slug that isn't in your catalog. You should:"
    options: ["Insert it into the DB", "Filter or map it against the catalog before using it", "Crash", "Trust it"]
    answer: 1
    why: "InterviewOS drops unknown topic/problem slugs in sanitizeEvaluation."
explain:
  prompt: "Explain how InterviewOS turns a free-form mock interview into a structured, trustworthy evaluation."
  rubric:
    - "Schema with scores, dimensions, evidence, mistakes, recommendations"
    - "Structured output mode/parse with a Zod schema"
    - "Sanitisation: clamp scores, nullable dimensions, filter unknown slugs, cap list sizes"
    - "Calibration instructions and transcript treated as data; limits (code not executed)"
  model: "After an interview ends, the transcript and metadata such as hints requested go to the model with an evaluator system prompt that defines score anchors and says to cite evidence and not inflate scores. The request uses a structured-output format generated from a Zod schema: an overall score, per-dimension scores that may be null when not exercised, evidence strings, strengths, weaknesses, mistakes with corrections, a model answer, recommended and covered topics, follow-up exercises and spaced-repetition cards. The parsed result is then sanitised: scores are clamped, list lengths capped, and topic and problem slugs not in the catalog are dropped so the model can't invent references. Only then is it stored and used to update topic progress and create review cards. The prompt also tells the evaluator that code was never executed, so correctness judgements are reasoned, not tested."
cards:
  - q: "Structured output ≠ correct output"
    a: "Schema guarantees shape; still validate semantics and evaluate quality."
  - q: "Schema design tips"
    a: "Enums for closed sets, nullable for unknown, evidence fields, short descriptions per field."
---

## Explanation

### Approaches

| Approach | Reliability | Notes |
|---|---|---|
| "Respond in JSON" in the prompt | lowest | needs parsing/repair |
| Tool/function definition with input schema | high | model "calls" a tool with arguments |
| Native structured outputs (schema-constrained decoding) | highest for shape | provider-specific schema support |

### Schema design

- Closed sets → enums. Unknowns → nullable. Put **reasoning/evidence fields** where you want justification (order can matter: evidence before verdict).
- Keep schemas small and descriptive; describe each field.
- Version schemas; store raw outputs for debugging.

### Validation and post-processing

Even with constrained decoding: handle refusals and truncation; validate with Zod; clamp numbers; filter ids against your DB; reject or mark uncertain when checks fail.

## Worked examples

InterviewOS (`src/lib/ai/evaluation.ts`) defines `EvaluationSchema` with Zod, sends it as a structured-output format, then `sanitizeEvaluation` clamps dimension scores to 1–5, overall to 0–100, caps list sizes and drops unknown topic and problem slugs.

```ts
const Verdict = z.object({
  verdict: z.enum(["affected", "not_affected", "uncertain"]),
  confidence: z.number().min(0).max(1),
  evidence: z.array(z.object({ path: z.string(), lines: z.string(), why: z.string() })),
});
```

## Common misconceptions

- **"JSON mode solves reliability."** — It solves syntax, not semantics.
- **"Bigger schemas are better."** — Large, deeply nested schemas reduce quality; split tasks.

## Practical exercises

1. Write a schema for extracting job requirements from a job posting, with nullable fields.
2. Read `sanitizeEvaluation` and add one more semantic check you think is missing.
