---
slug: frontend-testing
title: Frontend testing
path: ts-react
module: react-quality
order: 2
minutes: 45
depth: full
practice: lab
summary: The testing pyramid for UIs — unit tests with Vitest, component tests with React Testing Library, end-to-end tests with Playwright, mocking at the network boundary, and avoiding flaky tests.
prerequisites: [react-hooks]
problems: []
objectives:
  - Write component tests that query by role and assert on user-visible behaviour
  - Decide what to test at unit, component and end-to-end level
  - Mock at the right boundary (network) and avoid brittle implementation-detail tests
  - Write reliable Playwright tests with auto-waiting locators
readings:
  - title: "Testing Library — Guiding principles"
    url: https://testing-library.com/docs/guiding-principles
    kind: docs
  - title: "Testing Library — About queries (priority)"
    url: https://testing-library.com/docs/queries/about
    kind: docs
  - title: "Playwright — Best practices"
    url: https://playwright.dev/docs/best-practices
    kind: docs
  - title: "Vitest — Getting started"
    url: https://vitest.dev/guide/
    kind: docs
interview:
  - q: "What should a React component test assert on?"
    a: "What a user sees and can do: rendered text, roles, enabled/disabled states, and outcomes of interactions (userEvent click/type) — not internal state, hook calls or class names. Query by role/label first so tests also check accessibility."
  - q: "Why are E2E tests flaky and how do you reduce flakiness?"
    a: "Timing assumptions, shared state between tests, uncontrolled external services, animation and network variability. Use auto-waiting locators and web-first assertions (no fixed sleeps), isolate test data (reset DB per run), mock third parties, and make tests independent."
  - q: "How do you test code that calls an LLM API?"
    a: "Unit-test prompt building and response parsing deterministically; test the integration against a mock server that returns recorded/structured responses; keep a small evaluation set run separately against the real model, since outputs are nondeterministic."
selfAssessment:
  - I can write an RTL test with userEvent and role queries
  - I can explain what belongs in E2E vs component tests
  - I can make a flaky test deterministic
completion:
  - Score at least 70% on the quiz
  - Complete the fullstack lab's testing step
quiz:
  - q: "Preferred Testing Library query for a submit button:"
    options: ["getByTestId('submit')", "getByRole('button', { name: /submit/i })", "container.querySelector('.btn')", "getByClassName"]
    answer: 1
    why: "Role queries mirror how users and assistive tech find elements."
  - q: "In Playwright, await page.waitForTimeout(3000) before an assertion is:"
    options: ["Best practice", "A flakiness smell — use expect(locator).toBeVisible() which auto-waits", "Required", "Faster"]
    answer: 1
    why: "Fixed sleeps are slow and still race."
  - q: "Mocking fetch globally vs a network-level mock (MSW / mock server):"
    options: ["Same thing", "Network-level mocks test more of your real code (request building, parsing) with fewer implementation assumptions", "fetch mocks are always better", "Neither works"]
    answer: 1
    why: "Mock at the boundary you don't own."
explain:
  prompt: "Explain your testing strategy for a React + Node feature such as 'submit a coding attempt and see the result'."
  rubric:
    - "Unit tests for pure logic (result parsing, comparison)"
    - "Component tests for UI states (running, passed, failed, not executed) with RTL"
    - "API/integration tests against a real test database"
    - "A few E2E happy-path tests with Playwright; deterministic data and mocks for external services"
  model: "Pure logic — comparing outputs, parsing harness results, grading — gets fast unit tests with Vitest, including edge cases. The result panel gets component tests with React Testing Library: render it in each state, like running, all passed, some failed, or not executed, and assert on visible text and roles, interacting with userEvent. The server action that records an attempt gets an integration test against a real test PostgreSQL database, so constraints and queries are exercised. Finally one or two Playwright tests cover the happy path end-to-end — open a problem, run a correct solution, see the result saved — with the database reset before the run so they're deterministic. External services such as an LLM are replaced by a local mock server."
cards:
  - q: "RTL query priority"
    a: "getByRole > getByLabelText > getByPlaceholderText > getByText > … > getByTestId."
  - q: "Flaky E2E fixes"
    a: "Auto-waiting assertions, isolated data, no sleeps, mock third parties, independent tests."
  - q: "Testing pyramid"
    a: "Many fast unit tests, fewer component/integration tests, few E2E tests on critical flows."
---

## Explanation

### Levels

| Level | Tool | Tests |
|---|---|---|
| Unit | Vitest | pure functions, hooks logic |
| Component | Vitest + React Testing Library (jsdom) | rendering, interactions, states |
| Integration | Vitest + test DB / route handlers | server logic with real dependencies |
| End-to-end | Playwright | critical user journeys in a real browser |

### Principles

- Test behaviour through the public interface — "the more your tests resemble the way your software is used, the more confidence they can give you".
- Query by role/label; use `@testing-library/user-event` for realistic interactions.
- Mock at boundaries you don't own (network, time, randomness) — not internal modules.
- Deterministic data: seed and reset databases; freeze time with fake timers.
- E2E: locators + web-first assertions (`await expect(locator).toHaveText(...)`), trace on failure.

## Worked examples

```tsx
// @vitest-environment jsdom
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

it("shows feedback after answering", async () => {
  render(<QuizQuestion q={question} />);
  await userEvent.click(screen.getByRole("radio", { name: /O\(log n\)/ }));
  await userEvent.click(screen.getByRole("button", { name: /check/i }));
  expect(screen.getByText(/correct/i)).toBeInTheDocument();
});
```

```ts
// Playwright
test("solve a problem", async ({ page }) => {
  await page.goto("/practice/two-sum");
  await page.getByRole("button", { name: "Run tests" }).click();
  await expect(page.getByText(/passed/i)).toBeVisible();
});
```

## Common misconceptions

- **"100% coverage means well tested."** — Coverage shows what ran, not what was asserted.
- **"Snapshot tests catch regressions."** — Large snapshots get rubber-stamped; assert specific behaviour.
- **"E2E tests replace unit tests."** — They're slow and coarse; use few.

## Practical exercises

1. Complete the testing step of the **fullstack lab**.
2. Write RTL tests for a form with validation errors and a successful submit.
3. Take a flaky test (or write one with a sleep) and make it deterministic.
