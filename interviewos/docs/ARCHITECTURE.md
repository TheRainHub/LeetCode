# InterviewOS — Architecture

A single-user, local-first interview preparation platform. One Next.js process
(App Router) renders the UI and owns all server logic; PostgreSQL stores content
and progress. No microservices, no queues, no background workers.

```
Browser ──► Next.js (RSC pages + Server Actions + Route Handlers) ──► PostgreSQL (Drizzle)
   │                         │
   │                         └──► Anthropic API (server-side only, optional)
   └──► Web Worker (in-browser TypeScript runner; never on the server)
```

## Key decisions

| Concern        | Decision                                                                                                                                                                                                                                                                | Why                                                                                                     |
| -------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------- |
| Framework      | Next.js 16 App Router, React Server Components                                                                                                                                                                                                                          | Data loads on the server, minimal client JS, one deployable                                             |
| Mutations      | Server Actions validated with Zod; Route Handlers only for streaming (interview chat) and beacons                                                                                                                                                                       | Type-safe end to end, no hand-written REST layer                                                        |
| DB             | PostgreSQL + Drizzle ORM, SQL migrations in `drizzle/`                                                                                                                                                                                                                  | Typed schema, plain SQL migrations, easy local setup                                                    |
| Auth           | Single local user (`users.id = 1`) resolved by `getCurrentUserId()`; every user-owned row has `user_id`                                                                                                                                                                 | Swap that function for real auth later without schema changes                                           |
| Content        | Authored as Markdown + YAML frontmatter in `content/`, upserted into the DB by `npm run db:seed` (idempotent, never touches progress)                                                                                                                                   | Content is reviewable in git; the app reads only the DB                                                 |
| UI             | Tailwind v4 + shadcn/ui-style components (Radix primitives) + Lucide                                                                                                                                                                                                    | Accessible primitives, owned code, consistent design tokens                                             |
| Editor         | Monaco via `@monaco-editor/react`, assets copied to `public/monaco` at install                                                                                                                                                                                          | Works offline, no CDN                                                                                   |
| Code execution | **Never on the server.** TypeScript runs in a sandboxed Web Worker in the browser (timeout + terminate). Java/Python: the app generates a self-contained test harness to run locally; pasted output is parsed into results. Everything else is labelled "not executed". | Satisfies the security constraint; a remote sandbox can implement the same `CodeRunner` interface later |
| AI             | `@anthropic-ai/sdk` on the server only; model/effort/token limits from env; disabled cleanly without a key                                                                                                                                                              | Optional feature; keys never reach the browser                                                          |
| i18n           | Typed message bundles (`en`, `ru`) via `defineMessages`; locale stored in user settings                                                                                                                                                                                 | No routing changes, compile-time key parity                                                             |

## Learning model (understanding over memorization)

Evidence is recorded per **topic**, at four levels:

1. **Read** — lesson marked as read.
2. **Recognize** — lesson quiz passed (≥ 70 %), or review cards answered correctly.
3. **Implement** — a linked coding problem solved _independently_ (no hints, no solution view) with executed or locally-verified tests, or a linked lab verified.
4. **Explain** — an "interview-mode" explanation (lesson hidden, timed) scored ≥ 70 % against its rubric, or a mock interview covering the topic.

`deriveTopicStatus()` (pure, unit-tested) maps evidence to:
`not_started → learning → practicing → needs_review / interview_ready`.
Reading alone can never exceed `learning`. `interview_ready` requires recognize +
explain (+ implement for coding topics, + lab for lab topics), recent accuracy ≥ 70 %,
and no overdue reviews.

### Spaced repetition (SM-2 variant, `src/lib/srs`)

Grades `again | hard | good | easy` → quality 1/3/4/5. Ease starts at 2.5, floor 1.3,
standard SM-2 ease update. Intervals: 1 → 3 → `interval × ease` days; `hard` ×1.2,
`easy` ×1.3 bonus; `again` resets to 1 day and counts a lapse. Intervals are capped
at 60 days and, if an interview is scheduled, to 2 days before it. Coding problems
are scheduled the same way using the attempt outcome as the grade.

### Scheduler (`src/lib/scheduler`, pure)

A plan = ordered template sessions → tasks with estimated minutes. Placement walks
calendar days from the start date and fills each day up to its **capacity**:
daily budget, 0 on rest/unavailable days, reduced around university obligations
(lightweight window before an exam when "prioritize university" is on) and on
interview days. Tasks are atomic; overflow carries to the next available day.
Re-scheduling (day marked unavailable, overdue tasks) re-runs placement for
unfinished, unpinned tasks from today forward. Nothing is ever scheduled beyond
capacity except a single task larger than any day's capacity (flagged in the UI).

### Readiness

Company readiness = topic-status scores weighted by the company track's topic
weights. It is labelled **estimated** and shows "Not enough data" until enough
topics have evidence. Observed performance (quiz accuracy, attempts, mock scores)
is shown separately.

## Module layout

```
interviewos/
  content/            authored lessons (md), problems, labs, companies, plan template, projects
  drizzle/            SQL migrations (drizzle-kit)
  scripts/            migrate, seed, copy-monaco, check-links, verify-harnesses
  e2e/                Playwright specs
  src/
    app/              routes (pages, server actions colocated as actions.ts, route handlers in api/)
    components/ui     design-system primitives
    components/*      feature components
    lib/db            schema + client
    lib/srs, lib/mastery, lib/scheduler, lib/readiness, lib/recommend   pure domain logic (tested)
    lib/code-runner   CodeRunner interface, browser worker, harness generators
    lib/ai            Anthropic client, interviewer prompt, evaluator
    lib/content       lesson parser used by the seed
    lib/i18n          dictionaries
    server/           data access (queries) and domain services used by pages/actions
```

## Implementation checklist (ordered)

Phase 1 — Foundation

- [x] Scaffold Next.js/TS strict/Tailwind/ESLint/Prettier/Vitest/Playwright
- [x] Drizzle schema, migrations, DB client, env validation
- [x] Design system + app shell (sidebar nav, i18n, dark theme)
- [x] Content pipeline (lesson parser) + seed script; first content batch
- [x] Learning paths, lesson reader, quiz/explain exercises, persistent progress
- [x] Mastery derivation + dashboard with honest empty states

Phase 2 — Coding practice

- [x] Problem catalog (10 problems, 3 languages, tests, hints, solutions)
- [x] Workspace: Monaco, resizable panels, stopwatch, focus mode, shortcuts
- [x] In-browser TS runner; Java/Python harness generator + output parser
- [x] Attempt recording, complexity review, attempt history, notes, drafts

Phase 3 — Mock interviews

- [x] Anthropic client (server-only), config, error handling, disabled state
- [x] Interview setup, streaming chat, hints, timer, code sharing
- [x] Structured evaluation, history/report, SRS cards from evaluation

Phase 4 — Advanced learning

- [x] Spaced repetition review sessions
- [x] Practical labs with evidence-based verification
- [x] Company tracks, readiness, checklist, application pipeline
- [x] My Engineering Experience + STAR stories + generated questions
- [x] Scheduler (plan from template, capacity, unavailable days, carry-over)
- [x] Analytics with "Not enough data" handling; recommendations
- [x] Remaining curriculum content, link check, README, tests, e2e

## Verification status

| Check                                                       | Result                                                                                                          |
| ----------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`, `npm run lint`, `npm run format:check` | pass                                                                                                            |
| `npm test` (Vitest)                                         | 87 tests pass: domain logic, code runner, problem-bank parsers, i18n parity, content integrity, component tests |
| `npm run test:e2e` (Playwright, production build)           | 7 tests pass against a fresh test database, a mock Anthropic API and synthetic problem-bank fixtures            |
| `npm run content:verify-harnesses`                          | all 10 reference solutions pass in Java, Python and TypeScript                                                  |
| `npm run db:setup` twice                                    | idempotent: 8 paths, 104 lessons, 10 problems, 5 labs, 8 companies                                              |
| `npm run content:check-links`                               | 0 broken; most links unverifiable from the build environment (network policy) — see README                      |
| AI interviewer against the real Anthropic API               | not exercised in automated tests (mock only)                                                                    |
| `npm run bank:import` against the real sources              | 3,397 problems, 423 companies with data, 36,347 company/period entries, 16 patterns; re-run is idempotent       |
| `npm run bank:verify-visualizations`                        | 39/39 visualizer entries exist in the algorithms repository                                                     |
