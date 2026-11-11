---
slug: hallucinations
title: Hallucinations and grounding
path: ai-engineering
module: ai-reliability
order: 2
minutes: 35
depth: concise
practice: conceptual
summary: Why models produce confident falsehoods, how to reduce them (grounding, citations, allowing 'I don't know', verification), and how to detect them in production.
prerequisites: [rag]
problems: []
objectives:
  - Explain why LLMs hallucinate and in which situations it's most likely
  - Apply mitigation techniques — grounding, citations, abstention, constrained outputs, verification steps
  - Detect hallucinations with deterministic checks and evaluation
readings:
  - title: "Anthropic docs — Reduce hallucinations"
    url: https://platform.claude.com/docs/en/test-and-evaluate/strengthen-guardrails/reduce-hallucinations
    kind: docs
  - title: "Ji et al. — Survey of Hallucination in Natural Language Generation"
    url: https://arxiv.org/abs/2202.03629
    kind: paper
interview:
  - q: "Why do LLMs hallucinate?"
    a: "They generate plausible continuations from learned patterns rather than retrieving verified facts; when knowledge is missing, rare or outdated, or the prompt pressures an answer, they may produce fluent but wrong content. Training also tends to reward answering over abstaining."
  - q: "How do you reduce hallucinations in a product?"
    a: "Ground answers in retrieved sources and require citations, explicitly allow 'I don't know', constrain outputs (schemas, enums, ids from a catalog), verify claims deterministically (do cited files/ids exist?), use lower-risk task framing (extract rather than recall), and keep humans in the loop for high-stakes outputs."
selfAssessment:
  - I can list five mitigation techniques
  - I can design a deterministic check for fabricated references
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Most effective single change for a doc Q&A bot inventing answers:"
    options: ["Raise temperature", "Ground in retrieved docs, require citations and allow 'not in the documents'", "Longer answers", "Remove the system prompt"]
    answer: 1
    why: "Grounding plus an abstention path."
  - q: "An LLM-generated list of 'recommended topics' contains slugs not in your catalog. This is:"
    options: ["A feature", "A hallucination caught by validation against known ids", "A network error", "Calibration"]
    answer: 1
    why: "Constrain and validate against the source of truth."
  - q: "Asking the model to quote supporting text before answering helps because:"
    options: ["It's shorter", "Answers become anchored to verifiable evidence, and missing quotes reveal unsupported claims", "It reduces cost", "It disables sampling"]
    answer: 1
    why: "Quotes can also be checked programmatically."
explain:
  prompt: "Explain how you'd prevent an AI interviewer's evaluation from inventing facts about the candidate's performance."
  rubric:
    - "Ground evaluation in the transcript; require evidence/quotes per claim"
    - "Structured output with nullable fields for things not exercised"
    - "Validation against catalogs; clamping; no invented metrics"
    - "Instruction that code wasn't executed; calibration and human review of results"
  model: "The evaluation must be grounded in the transcript, so the evaluator receives the full transcript as data and every dimension requires an evidence field citing or paraphrasing what actually happened. Dimensions that weren't exercised are nullable rather than forced to a score, which removes pressure to invent. Topic and problem references must come from the catalog and are filtered in code, and scores are clamped. The prompt states that code was never executed, so the model must not claim tests passed. I'd also review a sample of evaluations against my own reading of transcripts to check they're calibrated and that cited evidence really appears."
cards:
  - q: "Hallucination mitigations"
    a: "Grounding + citations, abstention allowed, constrained outputs, deterministic verification, human review."
  - q: "Why LLMs hallucinate"
    a: "They generate plausible continuations, not verified facts; missing/rare knowledge and pressure to answer increase it."
---

## Explanation

### Causes

Missing or outdated knowledge, rare facts, ambiguous prompts, pressure to answer, long contexts where relevant info is buried, and compounding errors in multi-step reasoning.

### Mitigations

1. **Grounding**: retrieve sources; instruct to answer only from them.
2. **Citations/quotes**: ask for supporting quotes; check them.
3. **Abstention**: explicitly allow "I don't know"/"not in context".
4. **Constrain**: schemas, enums, ids from your database; validate.
5. **Verify**: deterministic checks (links resolve, files exist, numbers recomputed), second-pass verification, tool use for facts (calculators, search).
6. **Human review** where errors are costly.

### Detection

Evals with known answers, citation validity rates, user feedback, monitoring outputs referencing unknown entities.

## Worked examples

InterviewOS never lets the model invent project metrics: seeded projects contain only user-provided facts, generated questions ask the user to fill missing fields, and the evaluation sanitiser drops unknown slugs.

## Common misconceptions

- **"Hallucinations can be fully eliminated."** — They can be reduced and caught, not eliminated.
- **"Confident tone means correct."** — Fluency isn't evidence.

## Practical exercises

1. Write a check that verifies every URL and file path in a model's answer exists.
2. Take 10 questions outside a doc set and test whether your prompt makes the model abstain.
