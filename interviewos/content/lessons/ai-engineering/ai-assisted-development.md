---
slug: ai-assisted-development
title: AI-assisted software development
path: ai-engineering
module: ai-reliability
order: 5
minutes: 35
depth: concise
practice: conceptual
summary: Using coding assistants effectively and responsibly — context, verification through tests, reviewing generated code, security and licensing concerns, and keeping your own skills sharp for interviews.
prerequisites: [prompt-engineering]
problems: []
objectives:
  - Use coding assistants with good context and small, verifiable steps
  - Review and verify AI-generated code with tests, types and critical reading
  - Explain risks (subtle bugs, insecure patterns, invented APIs, licensing) and team practices to manage them
readings:
  - title: "Anthropic — Claude Code best practices"
    url: https://www.anthropic.com/engineering/claude-code-best-practices
    kind: article
  - title: "OWASP Top 10 for LLM Applications"
    url: https://genai.owasp.org/llm-top-10/
    kind: docs
interview:
  - q: "How do you use AI coding tools without lowering code quality?"
    a: "Give clear context and constraints, work in small steps, have tests (ideally written or checked first) and type checks as objective feedback, read every diff critically as if reviewing a colleague, verify APIs against docs, and own the result — I must be able to explain every line I commit."
  - q: "How might AI-generated tests be weak, and how would you check them?"
    a: "They can assert what the code currently does rather than what it should, miss edge cases, or be tautological. Check with mutation testing (do tests fail when the code is deliberately broken?), coverage of edge cases, and review of assertions against requirements."
selfAssessment:
  - I can describe my workflow with an AI assistant and its verification steps
  - I can explain mutation testing as a check on test quality
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "An assistant suggests calling a library function you've never seen. You should:"
    options: ["Trust it", "Verify it exists and behaves as described (docs, types, a quick test)", "Rename it", "Ask it again"]
    answer: 1
    why: "Invented or outdated APIs are a common failure."
  - q: "Mutation testing evaluates:"
    options: ["Code style", "Whether tests detect small deliberate changes (mutants) in the code", "Runtime speed", "Model accuracy"]
    answer: 1
    why: "Surviving mutants reveal weak tests — useful for AI-generated tests."
  - q: "In a technical interview without AI tools, the best preparation is:"
    options: ["Memorising AI outputs", "Practising implementing and explaining solutions yourself, under time pressure", "Reading more generated code", "Skipping fundamentals"]
    answer: 1
    why: "InterviewOS focuses on unassisted practice for this reason."
explain:
  prompt: "Explain how you use AI assistants in your development workflow and how you ensure the resulting code is correct and secure."
  rubric:
    - "Concrete workflow: context, small steps, planning"
    - "Verification: tests, types, linters, running the code; critical review"
    - "Risks: hallucinated APIs, subtle logic/security bugs, licensing, secrets"
    - "Ownership: can explain all code; keeps fundamentals sharp"
  model: "I use assistants for scaffolding, exploring unfamiliar APIs, writing tests and refactoring, but I give them precise context — the relevant files, constraints and the goal — and work in small steps so each change is reviewable. Verification is objective wherever possible: type checking, linters and tests, often written or checked before the implementation, and I run the code rather than assuming it works. I read diffs as carefully as a colleague's, looking for wrong edge-case handling, insecure patterns like unvalidated input or injection, and APIs that don't exist, and I check docs when unsure. Secrets never go into prompts. Most importantly I own the result: if I can't explain a line, it doesn't get committed. And because interviews test unassisted skills, I practise implementing and explaining solutions without AI."
cards:
  - q: "Verifying AI-written code"
    a: "Types, linters, tests (incl. mutation testing), running it, critical review, doc checks."
  - q: "What mutation testing reveals"
    a: "Tests that still pass after small deliberate code changes (surviving mutants) don't pin down behaviour."
---

## Explanation

### Effective use

- Provide context: relevant files, conventions, constraints, desired outcome.
- Plan first for larger changes; small iterative steps; keep diffs reviewable.
- Use objective feedback loops: tests, type checks, linters, running the app.

### Verification and review

- Read every line; check edge cases, error handling, concurrency, security.
- Verify unfamiliar APIs; watch for outdated patterns.
- Test quality: mutation testing reveals tests that don't actually check behaviour.

### Risks and team practices

Subtle bugs that look plausible, insecure defaults, leaking secrets or proprietary code into prompts (follow company policy), licence concerns, over-reliance and skill atrophy. Teams set policies on tool use, data handling and review standards.

### Interviews

Most interviews are unassisted. Practise translating ideas into correct code yourself, explaining decisions without tools, and debugging by reasoning — exactly what InterviewOS's practice and interview modes target.

## Worked examples

Mutation testing in one sentence: change `<` to `<=` in a binary search; if no test fails, the tests don't pin down the boundary behaviour.

## Common misconceptions

- **"Generated code that compiles is correct."** — Compilation proves little.
- **"Using AI means I don't need fundamentals."** — You need them to judge the output.

## Practical exercises

1. Take an AI-generated function and its tests; introduce three mutants and see whether tests catch them.
2. Write down your personal checklist for reviewing AI-generated diffs.
