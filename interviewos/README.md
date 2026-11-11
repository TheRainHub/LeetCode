# InterviewOS

A personal, local-first platform for preparing for software engineering interviews: structured
learning paths, a coding workspace, spaced repetition, practical labs, company-specific tracks, an
AI mock interviewer, a capacity-aware study scheduler and honest progress analytics.

It is built for one person on one machine. Nothing is shared; there is no login.

> **Do not deploy this to the public internet.** There is no authentication: anyone who can reach the
> server can read and change all data and spend your Anthropic API credits.

---

## Contents

- [Requirements](#requirements)
- [Setup](#setup)
- [First steps in the app](#first-steps-in-the-app)
- [AI features (optional)](#ai-features-optional)
- [How code is executed](#how-code-is-executed)
- [How progress is measured](#how-progress-is-measured)
- [Tests and checks](#tests-and-checks)
- [Content](#content)
- [Data, privacy and backups](#data-privacy-and-backups)
- [Known limitations](#known-limitations)
- [Project structure](#project-structure)

## Requirements

| Tool              | Version                    | Needed for                                                 |
| ----------------- | -------------------------- | ---------------------------------------------------------- |
| Node.js           | 20.9 or newer (tested: 22) | everything                                                 |
| PostgreSQL        | 14 or newer (tested: 16)   | everything                                                 |
| JDK               | 17 or newer                | optional — running Java solutions locally                  |
| Python            | 3 (tested: 3.13)           | optional — running Python solutions locally                |
| Anthropic API key | —                          | optional — mock interviewer and AI grading of explanations |

## Setup

All commands run from the `interviewos/` directory.

### 1. Install dependencies

```bash
npm install
```

`postinstall` copies the Monaco editor assets to `public/monaco`, so the editor works offline.

### 2. Create the database

Create a role and a database named `interviewos` (password `interviewos` matches `.env.example`;
choose your own if you like and update `DATABASE_URL`).

Linux:

```bash
sudo -u postgres psql -c "CREATE ROLE interviewos LOGIN PASSWORD 'interviewos';"
```

```bash
sudo -u postgres psql -c "CREATE DATABASE interviewos OWNER interviewos;"
```

macOS with Homebrew PostgreSQL:

```bash
psql postgres -c "CREATE ROLE interviewos LOGIN PASSWORD 'interviewos';"
```

```bash
psql postgres -c "CREATE DATABASE interviewos OWNER interviewos;"
```

Or with Docker:

```bash
docker run -d --name interviewos-db -e POSTGRES_USER=interviewos -e POSTGRES_PASSWORD=interviewos -e POSTGRES_DB=interviewos -p 5432:5432 postgres:16
```

### 3. Configure the environment

```bash
cp .env.example .env
```

Edit `.env`. Only `DATABASE_URL` is required. Every variable is documented in `.env.example`.

### 4. Create the schema and load the curriculum

```bash
npm run db:setup
```

This runs the SQL migrations in `drizzle/` and then the seed. The seed is idempotent: it upserts
lessons, problems, labs, companies and the plan template by slug and **never overwrites your progress,
notes, edited projects or company settings**. Re-run it after pulling new content.

### 5. Start the app

```bash
npm run dev
```

Open http://localhost:3000.

For a production build:

```bash
npm run build && npm run start
```

## First steps in the app

1. **Settings** — language (English/Russian), theme, time zone, preferred coding language, and the
   background the AI interviewer is told about you (built only from facts you entered; edit it).
2. **Schedule** — set your daily study budget and rest days, add university obligations and interview
   dates, then generate the 14-session interview sprint from a start date you choose. The ZWA
   CSS/JavaScript test on 11 Nov 2026 is pre-entered as a university obligation, so preparation stays
   light on the days before it and on the day itself.
3. **Dashboard** — "Start today's session" opens the most useful next item (scheduled task, due
   reviews, or a recommendation). "I'm unavailable today" moves today's unfinished tasks forward.
4. **Companies** — review the focus topics and weights for each target company and adjust them; track
   applications through Applied → Screening → Technical → Final → Offer/Rejected. No interview dates
   or stages are pre-filled — you enter what actually happens.
5. **My Engineering Experience** — the three projects are seeded with only the facts you provided and
   are marked "needs review". Fill in responsibility, decisions, results and STAR stories yourself.

Keyboard: `⌘K`/`Ctrl+K` opens the command palette, `g` then a letter jumps to a section (`g d`
dashboard, `g l` learn, `g p` practice, `g i` interviews, `g t` schedule, …). In the coding workspace:
`Ctrl/⌘+Enter` runs tests, `Ctrl/⌘+S` saves the draft, `Ctrl/⌘+Shift+Enter` submits an attempt.

## AI features (optional)

Without `ANTHROPIC_API_KEY` the app is fully usable; the mock interviewer and AI grading are shown as
disabled. With a key:

| Variable                          | Default           | Meaning                                                                                 |
| --------------------------------- | ----------------- | --------------------------------------------------------------------------------------- |
| `ANTHROPIC_API_KEY`               | (empty)           | Enables AI features. Read on the server only.                                           |
| `ANTHROPIC_MODEL`                 | `claude-opus-5-5` | Model for interviews and evaluations.                                                   |
| `ANTHROPIC_EFFORT_CHAT`           | `medium`          | Reasoning effort for interviewer replies.                                               |
| `ANTHROPIC_EFFORT_EVALUATION`     | `high`            | Reasoning effort for the final evaluation.                                              |
| `ANTHROPIC_MAX_TOKENS_CHAT`       | `8000`            | Output ceiling per interviewer reply (thinking counts).                                 |
| `ANTHROPIC_MAX_TOKENS_EVALUATION` | `16000`           | Output ceiling for the evaluation.                                                      |
| `ANTHROPIC_FALLBACKS`             | `default`         | `default` lets the API retry a declined request on a fallback model; `off` disables it. |

How it is wired:

- All calls go from the Next.js server to the API. The key is never sent to the browser.
- Each interview freezes its system prompt at creation; the conversation is replayed append-only on
  every turn (assistant turns with their original content blocks), which also keeps prompt caching
  effective.
- Replies stream to the browser as newline-delimited JSON from `/api/interviews/[id]/messages`.
- The evaluation uses a structured-output schema. Scores are clamped, unknown topic and problem slugs
  are dropped, and the evaluator is told the candidate's code was never executed.
- API errors are mapped to clear messages; a failed turn keeps your message and can be retried.

**Verification status:** the interviewer and evaluation flows are covered by an end-to-end test that
runs against a local mock of the Messages API (`e2e/mock-anthropic.mjs`). They have **not** been
exercised against the real API in this repository's test suite, so the first real interview is the
real check of model behaviour, latency and cost.

## How code is executed

User code never runs inside the Next.js server process.

| Language   | Where it runs                                                                                         | How results are shown                            |
| ---------- | ----------------------------------------------------------------------------------------------------- | ------------------------------------------------ |
| TypeScript | In your browser, in a Web Worker (4-second limit; the worker is terminated after)                     | "Executed in your browser" with per-test results |
| Java       | On your machine: **Run locally** generates `Main.java` with all tests; run `java Main.java` (JDK 17+) | Paste the output back; it is parsed into results |
| Python     | On your machine: **Run locally** generates `solution_test.py`; run `python3 solution_test.py`         | Paste the output back; it is parsed into results |

If a solution was not run, the app says **Not executed** and the attempt cannot count as an
independent implementation. Results become stale as soon as the code changes.

`npm run content:verify-harnesses` checks that every reference solution passes its tests in all three
languages through the same generated harnesses (requires `java` and `python3` on `PATH`).

## How progress is measured

Evidence is recorded per topic at four levels: **read** (lesson marked read), **recognize** (quiz ≥
70 % or correct reviews), **implement** (a linked problem solved without hints or the solution, with
executed tests, or a lab verified) and **explain** (an interview-mode explanation ≥ 70 % of its rubric,
or a mock interview covering the topic).

Topic status is derived from that evidence: Not started → Learning → Practicing → Needs review /
Interview ready. Reading alone never moves a topic past Learning. Company readiness is a labelled
estimate and shows "Not enough data" until at least 25 % of the company's focus topics (and at least
three) have evidence. Charts show "Not enough data" rather than extrapolating. No statistics are
invented; a fresh install shows empty states everywhere.

Details: [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

## Tests and checks

| Command                            | What it checks                                                                                                                |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                | TypeScript strict (`noUncheckedIndexedAccess`)                                                                                |
| `npm run lint`                     | ESLint (Next.js + TypeScript rules)                                                                                           |
| `npm run format:check`             | Prettier                                                                                                                      |
| `npm test`                         | Vitest: domain logic (SRS, mastery, scheduler, readiness), code runner, i18n parity, content integrity, React component tests |
| `npm run test:e2e`                 | Playwright: production build, fresh database, mock Anthropic API                                                              |
| `npm run content:verify-harnesses` | All reference solutions pass in Java, Python and TypeScript                                                                   |
| `npm run content:check-links`      | Every reading and problem link resolves                                                                                       |

### End-to-end tests

The suite needs its own database. It is **dropped and recreated on every run**, and the setup script
refuses to touch any database whose name does not end in `_test`:

```bash
sudo -u postgres psql -c "CREATE DATABASE interviewos_test OWNER interviewos;"
```

```bash
npm run test:e2e
```

Override the connection with `E2E_DATABASE_URL`. Set `E2E_DEV=1` to test against `next dev` instead of a
production build. Ports 3210 (app) and 4010 (mock API) must be free. Playwright uses its bundled
Chromium; install it once with `npx playwright install chromium` if it is missing.

Covered flows: honest empty dashboard → generate plan → mark today unavailable; lesson quiz graded on
the server + interview-mode explanation (and the topic does not become interview-ready from that
alone); TypeScript solution run in the browser and recorded with a complexity review; mock interview
with streaming, history replay (thinking blocks included) and a sanitised evaluation; switching the
interface to Russian and back.

## Content

| Area                       | Amount                                                                                                                                                                                                                           |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learning paths             | 8 (DSA, Java, Linux & Networking, Backend, TypeScript & React, System Design, AI Engineering, Communication)                                                                                                                     |
| Lessons                    | 104, each with objectives, prerequisites, explanation, readings, worked examples, misconceptions, exercises, interview questions, self-assessment, completion criteria, quiz, interview-mode explanation rubric and review cards |
| System design case studies | 7 (URL shortener, notifications, booking platform, rate limiter, feature flags, developer portal, LLM vulnerability triage)                                                                                                      |
| Coding problems            | 10, with tests, hints, reference solutions in Java/Python/TypeScript and complexity                                                                                                                                              |
| Labs                       | 5 (Linux networking, Java concurrency, PostgreSQL, fullstack, booking-system design), verified by pasted evidence and reflection, never by opening them                                                                          |
| Company tracks             | 7 (Microsoft DevDiv Core AI, CDN77, Second Foundation, Ataccama, Apify, Momence, Apple) — focus weights are inferred from the job descriptions and your notes, labelled as inferred in the app; edit them                        |

Lessons live in `content/lessons/<path>/<slug>.md` (YAML frontmatter + four Markdown sections) and are
validated by `src/lib/content/lesson-parser.ts`; `content/content.test.ts` checks that every
reference between lessons, problems, labs, companies and the plan template resolves.

**Link verification:** `npm run content:check-links` could not verify most links from the
environment this was built in — its network policy refused connections to documentation sites, which
the script reports as `UNVERIFIED` rather than broken. GitHub-hosted readings were confirmed to exist
via GitHub search. Run the command once on a normal connection; it exits non-zero only for links that
are genuinely broken.

## Data, privacy and backups

- Everything is stored in your local PostgreSQL database. The only external service is the Anthropic
  API, and only when you configure a key and use an AI feature (interview transcripts and explanations
  you submit for grading are sent to it).
- Code drafts are also cached in the browser's `localStorage` so an accidental reload loses nothing.
- **Export:** `GET /api/export` (also in Settings) downloads all your data as JSON.
- Backups: `pg_dump interviewos > backup.sql`.

## Known limitations

- Single user, no authentication (see the warning at the top).
- Java and Python are not executed by the app; you run the generated harness and paste the output.
- In-browser TypeScript execution is a convenience sandbox (Web Worker with a time limit), not a
  security boundary against hostile code — it runs code you wrote, in your own browser.
- AI features were tested against a mock API only (see above).
- The interface is translated into Russian; lesson content is English.
- External links in lessons were not verifiable from the build environment (see Content).

## Project structure

```
content/      lessons (Markdown), problems, labs, companies, plan template, seeded projects
drizzle/      SQL migrations
e2e/          Playwright specs, mock Anthropic API, test-database reset
scripts/      migrate, seed, verify-harnesses, check-links, copy-monaco
src/app/      routes, server actions (actions.ts), route handlers (api/)
src/components/  UI primitives (ui/) and feature components
src/lib/      pure domain logic (srs, mastery, scheduler, readiness, code-runner, ai, i18n, content)
src/server/   data access and services used by pages and actions
docs/         architecture and decisions
```
