---
slug: prompt-engineering
title: Prompt engineering
path: ai-engineering
module: ai-foundations
order: 3
minutes: 40
depth: full
practice: conceptual
summary: Writing prompts as specifications — role and context, clear instructions and success criteria, examples, separating data from instructions, and iterating against an evaluation set.
prerequisites: [llm-apis]
problems: []
objectives:
  - Write clear, specific prompts with context, constraints and output expectations
  - Use examples, delimiters/XML-style tags and step-by-step decomposition appropriately
  - Iterate on prompts empirically with test cases rather than by intuition
readings:
  - title: "Anthropic docs — Prompt engineering overview"
    url: https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/overview
    kind: docs
  - title: "Anthropic — Interactive prompt engineering tutorial (GitHub)"
    url: https://github.com/anthropics/prompt-eng-interactive-tutorial
    kind: docs
interview:
  - q: "What makes a good system prompt?"
    a: "It explains the role and audience, the task and why it matters, constraints and rules (including what not to do), the output format, and how to handle edge cases and uncertainty. It's specific and unambiguous, like a brief for a smart new colleague with no context."
  - q: "How do you know a prompt change is an improvement?"
    a: "Run it against a fixed evaluation set of representative and edge-case inputs with clear grading (exact checks, rubrics, or model-graded with human spot checks) and compare metrics with the previous version. Single anecdotal examples mislead."
selfAssessment:
  - I can rewrite a vague prompt into a specific one
  - I can explain why data should be delimited from instructions
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Wrapping a user-provided document in tags like <document>…</document> helps:"
    options: ["Nothing", "The model distinguish data from instructions (and lets you refer to it precisely)", "Reduce tokens", "Encrypt it"]
    answer: 1
    why: "It also helps (not guarantees) against injected instructions in the data."
  - q: "Few-shot examples are most useful for:"
    options: ["Every task", "Conveying format, style and edge-case handling that's hard to describe", "Reducing cost", "Replacing evaluation"]
    answer: 1
    why: "Use diverse examples to avoid overfitting to one pattern."
  - q: "Telling the model what to do when information is missing (e.g. 'say you don't know') mainly reduces:"
    options: ["Latency", "Fabricated answers", "Tokens", "Rate limits"]
    answer: 1
    why: "Give the model an explicit path for uncertainty."
explain:
  prompt: "Explain how you designed (or would design) the system prompt for an AI mock interviewer that behaves realistically."
  rubric:
    - "Role, interview type, company context and candidate background"
    - "Behavioural rules: one question at a time, don't give away answers, hints only on request, follow-ups on weak answers"
    - "Handling of time, hints and end of interview; no inflated praise"
    - "Iteration with test conversations / evaluation"
  model: "The system prompt sets the role — a senior interviewer at a given company for a specific interview type and difficulty — and includes the candidate's background so questions are relevant. Behavioural rules make it realistic: ask one question at a time, let the candidate drive, don't reveal solutions, give hints only when explicitly requested and keep them minimal, probe weak or vague answers with follow-ups, and keep neutral feedback during the interview instead of praising everything. It explains the message conventions the app adds, such as elapsed-time markers and hint-request tags, and what to do near the time limit. Candidate messages are treated as conversation, not instructions that change the rules. I'd iterate by running scripted candidate conversations — strong, weak, off-topic, hint-seeking — and checking the interviewer's behaviour against these rules."
cards:
  - q: "Prompt checklist"
    a: "Role/context, task + why, constraints, output format, edge cases/uncertainty, examples."
  - q: "Evaluate prompt changes"
    a: "Fixed test set + grading, compare versions; not single anecdotes."
---

## Explanation

### Principles

1. **Be clear and direct**: say exactly what you want, including audience, length and format.
2. **Give context and motivation**: why the task matters changes how the model prioritises.
3. **Structure the prompt**: separate instructions, context and data with headings or XML-style tags.
4. **Examples**: a few diverse input→output examples for format and edge cases.
5. **Let it think when needed**: for multi-step reasoning, ask for reasoning before the answer (or use the model's extended thinking features).
6. **Handle uncertainty**: explicit instructions for missing info.
7. **Decompose**: chain smaller prompts for complex pipelines (extract → analyse → format).

### Engineering process

Define success criteria → build a test set → write prompt v1 → measure → change one thing → re-measure. Version prompts in code; review prompt diffs like code.

## Worked examples

**Vague**: "Summarise this ticket."
**Better**:
```text
You are helping an on-call engineer triage support tickets.
Summarise the ticket in <ticket> tags in at most 3 bullet points:
1) the user-visible problem, 2) affected component if stated, 3) any error messages verbatim.
If a field isn't mentioned, write "not stated". Do not guess root causes.
<ticket>{{ticket_text}}</ticket>
```

InterviewOS's `buildInterviewerSystemPrompt` (in `src/lib/ai/interviewer.ts`) is a full example: role, interview type rules, hint policy, time handling, and a frozen prompt per interview so the conversation stays consistent.

## Common misconceptions

- **"Prompt engineering is magic phrases."** — It's clear specification plus empirical testing.
- **"Longer prompts are always better."** — Irrelevant detail dilutes; keep what changes behaviour.

## Practical exercises

1. Rewrite three vague prompts you've used into specific ones with output formats.
2. Build a 10-case test set for one prompt and compare two variants.
