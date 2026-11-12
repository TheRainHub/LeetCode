# InterviewOS

A personal, local-first platform for preparing for software engineering interviews: structured
learning paths, a coding workspace, spaced repetition, practical labs, company-specific tracks, an
AI mock interviewer, a capacity-aware study scheduler and honest progress analytics.

It is built for one person on one machine. Nothing is shared; there is no login.

> **Set `APP_PASSWORD` before exposing it to a network.** Apart from that single password (HTTP Basic
> Auth) there is no authentication: anyone with the password can read and change all data and spend
> your Anthropic API credits. On Vercel the app refuses to start without it — see
> [Deploying to Vercel](#deploying-to-vercel).

---

## Contents

- [Requirements](#requirements)
- [Setup](#setup)
- [First steps in the app](#first-steps-in-the-app)
- [AI features (optional)](#ai-features-optional)
- [How code is executed](#how-code-is-executed)
- [How progress is measured](#how-progress-is-measured)
- [Problem bank (optional)](#problem-bank-optional)
- [System design practice](#system-design-practice)
- [Tests and checks](#tests-and-checks)
- [Content](#content)
- [Deploying to Vercel](#deploying-to-vercel)
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

macOS with Homebrew — install and start the server first (`psql` alone is only the client):

```bash
brew install postgresql@16
```

```bash
brew services start postgresql@16
```

`postgresql@16` is not linked into your `PATH`; add it (Apple Silicon path shown; on Intel Macs use
`/usr/local/opt/postgresql@16/bin`), open a new terminal, and check that the server answers:

```bash
echo 'export PATH="/opt/homebrew/opt/postgresql@16/bin:$PATH"' >> ~/.zshrc
```

```bash
pg_isready
```

Then create the role and the database (Homebrew's superuser is your macOS user):

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

### 5. (Optional) Import the problem bank

```bash
npm run bank:import
```

Downloads two public datasets into `.data-sources/` and imports LeetCode problem metadata, per-company
frequencies and coding patterns. See [Problem bank](#problem-bank-optional). The app works without it.

### 6. Start the app

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

## Roadmap

**Roadmap** (`g r`) draws the curriculum as a tree built from the lessons' prerequisites. "All paths"
shows which paths build on which (for example Linux & Networking → Backend → System Design); each path
tab shows its lessons. Cards are coloured by your topic status, arrows turn blue once a prerequisite is
practised, and "Next up" marks topics that are not started yet but whose prerequisites are all at least
practised. Only direct dependencies are drawn (an arrow implied by a longer chain is omitted), and
prerequisites from other paths are listed under the tree. The layout is computed on the server
(`src/lib/roadmap/layout.ts`: longest-path layering, crossing reduction, long arrows routed between
cards), so the page needs no client-side JavaScript.

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

## Problem bank (optional)

**Practice → Problem bank** lists LeetCode problems from two public GitHub repositories, with filters
for company, period, difficulty, pattern, LeetCode topic tag, InterviewOS lesson and your own status,
plus title search and sorting. **Practice → Patterns** groups problems into 16 interview patterns.

| Source                                                                                                                                                                  | What is imported                                                                                                                                                      |
| ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [liquidslr/leetcode-company-wise-problems](https://github.com/liquidslr/leetcode-company-wise-problems)                                                                 | For each company and period (last 30 days, 3 months, 6 months, more than 6 months, all time): problem title, link, difficulty, LeetCode tags and a relative frequency |
| [Chanda-Abdul/Several-Coding-Patterns-…](https://github.com/Chanda-Abdul/Several-Coding-Patterns-for-Solving-Data-Structures-and-Algorithms-Problems-during-Interviews) | Which LeetCode problems belong to each of the 16 patterns; each pattern links back to its notes                                                                       |
| [algorithm-visualizer/algorithms](https://github.com/algorithm-visualizer/algorithms)                                                                                   | Nothing is imported: 39 curated links to [algorithm-visualizer.org](https://algorithm-visualizer.org/) animations, shown on lessons and patterns                      |

How to read it:

- **Frequency** is relative within one company's list for the selected period: 100 is the problem
  that company's list reports most often. It is not a probability and cannot be compared across
  companies. Without a company filter the list is ordered by how many companies include a problem.
- The dataset's "Acceptance Rate" column is **ignored**: its values (about 0.002–0.009) are not
  acceptance percentages, and their meaning is not documented.
- 47 of the 470 company folders contain only empty lists, so 423 companies have data.
- Problems that appear only in the pattern notes have **unknown** difficulty and no tags rather than
  guessed values.
- Statuses (planned, attempted, solved, solved with help) are **self-reported** — you solve these on
  LeetCode. They show on the bank, pattern, lesson and company pages and are included in the export,
  but they never count as verified practice for topic readiness. The 10 problems InterviewOS can run
  itself are marked "Solve in InterviewOS"; attempts there are verified as usual.
- Company tracks link to dataset lists through `COMPANY_DATASET_NAMES` in `content/problem-bank.ts`.
  Microsoft, Apple and Barclays are mapped; CDN77, Second Foundation, Ataccama, Apify and Momence have no list in
  the dataset, and their pages say so. LeetCode tags and patterns map to lessons in the same file.

Importing:

```bash
npm run bank:import
```

- The first run clones the repositories (about 20 MB) into `.data-sources/`, which git ignores. Later
  runs pull updates. `--no-fetch` uses the existing copies; `--sources <dir>` reads clones from
  elsewhere.
- Re-running is safe and takes a few seconds: problems are upserted by slug, company frequencies and
  pattern links are replaced by the new snapshot, and **your statuses are never modified**. The bank
  page shows which commit of each source was imported.
- Only metadata is stored — never problem statements. The datasets are not committed to this
  repository: neither source repository declares a license, and the pattern notes are based on a paid
  course, so InterviewOS uses only the problem lists and links back to the notes instead of copying them.

`npm run bank:verify-visualizations` checks every visualizer link against the algorithms repository
(all 39 exist). Whether algorithm-visualizer.org itself is online could not be checked from the build
environment.

## System design practice

**Practice → System design** is a catalogue of 31 system design interview questions grouped by area
(core infrastructure, social & content, search, messaging, storage & collaboration, media, location &
marketplaces, commerce & payments, developer platforms), with filters by difficulty, your status and
the public list a question appears in.

- **Sources.** Question titles follow public lists — [NeetCode's system design practice](https://neetcode.io/practice/practice/systemDesign)
  and the LeetCode Discuss post [Most asked system design questions](https://leetcode.com/discuss/post/5806013/most-asked-system-design-questions-by-09-2zyv/).
  A question shows an "appears in" badge only where search results confirmed it is on that list;
  neither page could be opened from the build environment, so per-company tags are not included.
  Every brief — requirements, estimates, components, deep dives, pitfalls, follow-ups and rubric — is
  original InterviewOS content in `content/system-design.ts`. Difficulty is an InterviewOS estimate.
- **Workspace.** Each question has a 45-minute timer with a suggested pace, and an answer split into
  the interview phases (requirements, estimates, API, data model, high-level design, deep dives,
  trade-offs). The answer autosaves to the database, with a local backup for edits made just before
  closing the tab. The guide stays hidden until you ask for it.
- **Grading.** Self-assess against the question's rubric plus three process items, or — with an
  Anthropic API key — ask for a strict AI review against the same rubric. **Start mock interview**
  opens a 45-minute AI system design interview on that exact question.
- **Status.** Drafted = a written answer or a whiteboard diagram with at least three components;
  Practised = a graded attempt or a completed mock interview; Strong = a graded attempt
  covering at least 80% of the rubric, or a mock interview scoring at least 70. A long draft alone
  never counts as practised. The fundamentals panel links the lessons most questions rely on, with
  your topic status. Seven questions link to a full worked case study lesson.

### Whiteboard

**System design → Whiteboard** is a free board, and every question has its own board (**Open
whiteboard** on the question page). It is built on [React Flow](https://reactflow.dev) (`@xyflow/react`,
MIT).

- **Draw.** Drag components from the palette (client, DNS, CDN, load balancer, API gateway, service,
  WebSocket gateway, worker, cache, SQL, NoSQL, search index, object storage, message queue, external
  API) or click to add one; connect them by dragging from a dot onto another component. Arrows point
  in the direction requests travel; an arrow can carry all requests, reads only or writes only.
  Sticky notes, undo/redo (Ctrl+Z / Ctrl+Shift+Z), three starter templates, autosave with a local
  backup.
- **Test.** A live load test sends the peak traffic you set (requests per second, share of reads)
  through the graph and shows per-component utilisation, requests served, mean latency, the traffic
  at which the busiest component saturates, and queue backlogs. **What if one fails?** fails each
  self-run component in turn — one instance if it has several, all of it otherwise — and labels it a
  single point of failure, short of headroom, backlog-only or safe. You can inject a failure yourself
  (lose one instance, or down) from the inspector. **Design checks** flag common mistakes: a client
  talking to a database, a queue without a consumer, a cache with no source of truth, loops,
  unreachable components, synchronous third-party calls, stale reads from replicas.
- **The model is deliberately simple and nothing is executed.** Balancers split requests evenly over
  healthy targets; services call every dependency they point to; a cache next to a database absorbs
  its hit rate of reads (cache-aside), and a dead cache sends every read to the database; SQL has one
  primary per shard for writes and spreads reads over replicas; queues and change-data-capture arrows
  are asynchronous. Utilisation is demand ÷ capacity and latency grows as 1 ÷ (1 − utilisation).
  Default capacities are rough rules of thumb (for example 1,000 req/s per service instance, 5,000
  queries/s per SQL instance) — edit them to match your own estimates. The full rules are under
  **How the test works** on the board and in `src/lib/whiteboard/simulate.ts`.
- **On a question board**, a hidden checklist compares your components with the building blocks a
  typical answer contains, and the diagram is included as text in the AI design review.

### Visual guides (optional)

**System design → Visual guides** shows the 400 illustrated guides from ByteByteGo's
[System Design 101](https://github.com/ByteByteGoHq/system-design-101), searchable and filterable by
category, with a "read" mark. Related guides also appear on 31 design questions and on the matching
lessons (caching, Kafka, DNS, TLS, load balancing, consistency, payments …), mapped in `content/guides.ts`.

```bash
npm run guides:import
```

- The repository is licensed **CC BY-NC-ND 4.0** (attribution, non-commercial, no derivatives). It is
  therefore not committed here: the import clones it into `.data-sources/`, and InterviewOS shows each
  guide unchanged, with the author, the license and a link to the original. The only conversion is
  rendering an HTML `<img>` tag as a Markdown image. Keep it to personal, non-commercial study.
- Diagrams are loaded from ByteByteGo's servers when you open a guide (they were not visible from the
  build environment, whose network blocks that host).
- "Read" marks are self-reported and never count as practice evidence. `--no-fetch` and `--sources`
  work as for the problem bank; `GUIDES_IMPORT_ON_BUILD=false` skips it in the Vercel build.

## Tests and checks

| Command                              | What it checks                                                                                                                |
| ------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------- |
| `npm run typecheck`                  | TypeScript strict (`noUncheckedIndexedAccess`)                                                                                |
| `npm run lint`                       | ESLint (Next.js + TypeScript rules)                                                                                           |
| `npm run format:check`               | Prettier                                                                                                                      |
| `npm test`                           | Vitest: domain logic (SRS, mastery, scheduler, readiness), code runner, i18n parity, content integrity, React component tests |
| `npm run test:e2e`                   | Playwright: production build, fresh database, mock Anthropic API                                                              |
| `npm run content:verify-harnesses`   | All reference solutions pass in Java, Python and TypeScript                                                                   |
| `npm run content:check-links`        | Every reading and problem link resolves                                                                                       |
| `npm run bank:verify-visualizations` | Every algorithm-visualizer link exists in the algorithms repository                                                           |

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
interface to Russian and back; the roadmap tree; problem bank filters (company, period, tag, pattern), a self-reported
status, and the matching problems on company and lesson pages; system design filters, an autosaved
answer, self-assessment, AI review and a mock interview on the chosen question; visual guides
(filters, verbatim reading with attribution, read marks, related guides on questions and lessons). The problem bank is imported from small
synthetic fixtures in `e2e/fixtures/problem-bank/` — their frequencies are made up.

## Content

| Area                       | Amount                                                                                                                                                                                                                                                                                                               |
| -------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Learning paths             | 8 (DSA, Java, Linux & Networking, Backend, TypeScript & React, System Design, AI Engineering, Communication)                                                                                                                                                                                                         |
| Lessons                    | 104, each with objectives, prerequisites, explanation, readings, worked examples, misconceptions, exercises, interview questions, self-assessment, completion criteria, quiz, interview-mode explanation rubric and review cards                                                                                     |
| System design case studies | 7 (URL shortener, notifications, booking platform, rate limiter, feature flags, developer portal, LLM vulnerability triage)                                                                                                                                                                                          |
| Coding problems            | 10, with tests, hints, reference solutions in Java/Python/TypeScript and complexity                                                                                                                                                                                                                                  |
| Labs                       | 5 (Linux networking, Java concurrency, PostgreSQL, fullstack, booking-system design), verified by pasted evidence and reflection, never by opening them                                                                                                                                                              |
| Company tracks             | 8 (Microsoft DevDiv Core AI, CDN77, Second Foundation, Ataccama, Apify, Momence, Apple, Barclays 2027 Technology Developer Graduate Programme Prague) — focus weights are inferred from the job descriptions, your notes and (for Barclays) public candidate reports, with the source shown on each track; edit them |

Lessons live in `content/lessons/<path>/<slug>.md` (YAML frontmatter + four Markdown sections) and are
validated by `src/lib/content/lesson-parser.ts`; `content/content.test.ts` checks that every
reference between lessons, problems, labs, companies and the plan template resolves.

**Link verification:** `npm run content:check-links` could not verify most links from the
environment this was built in — its network policy refused connections to documentation sites, which
the script reports as `UNVERIFIED` rather than broken. GitHub-hosted readings were confirmed to exist
via GitHub search. Run the command once on a normal connection; it exits non-zero only for links that
are genuinely broken.

## Deploying to Vercel

The repository is ready for Vercel: `vercel.json` sets the build command to `scripts/vercel-build.sh`,
which runs the migrations, the idempotent seed and the problem-bank import before `next build`, so the
hosted database is prepared on every deploy. You need a Vercel account and a hosted PostgreSQL
database (Neon's free tier through the Vercel Marketplace works).

1. **Choose the branch.** Vercel deploys from GitHub. InterviewOS lives on the branch
   `claude/interviewos-platform-design-j0yq3o` (PR #1). Either merge it into `main`, or after
   importing set **Settings → Git → Production Branch** to that branch. Until then every push still
   gets a preview deployment.
2. **Import the project.** On vercel.com: **Add New → Project → Import** `TheRainHub/LeetCode`, and set
   **Root Directory** to `interviewos`. The framework (Next.js) and the build command are picked up
   automatically.
3. **Environment variables** (before the first deploy):

   | Variable               | Value                                                                                           |
   | ---------------------- | ----------------------------------------------------------------------------------------------- |
   | `APP_PASSWORD`         | **Required.** A long random password; the browser asks for it (any user name).                  |
   | `APP_TIMEZONE`         | `Europe/Prague`                                                                                 |
   | `ANTHROPIC_API_KEY`    | Optional — enables the AI interviewer and AI grading. Other `ANTHROPIC_*` as in `.env.example`. |
   | `BANK_IMPORT_ON_BUILD` | Optional — `false` skips refreshing the problem bank on each deploy.                            |

4. **Database.** In the project: **Storage → Create Database → Neon** (or connect an existing
   PostgreSQL) for all environments. The integration is expected to add `DATABASE_URL` (pooled) and
   `DATABASE_URL_UNPOOLED` (direct); if your provider uses other names, set `DATABASE_URL` yourself —
   `POSTGRES_URL` and `POSTGRES_URL_NON_POOLING` are also recognised. Pooled connections are detected
   (`-pooler` hosts, port 6543, or `DATABASE_POOLED=true`) and prepared statements are switched off for
   them; migrations and the seed use the direct URL when one is set.
5. **Deploy** (or **Redeploy** if the first build ran before the database existed). Open the URL and
   enter the password.

Notes:

- Your local database and the hosted one are separate; the hosted app starts with no progress. To
  carry your local progress over, replace the hosted database with a full copy of the local one (run
  it after at least one deploy, from the same version of the code; it overwrites everything in the
  hosted database). Use the direct (unpooled) connection string from the Vercel project's
  environment variables:

  ```bash
  pg_dump --clean --if-exists --no-owner --no-privileges postgres://interviewos:interviewos@localhost:5432/interviewos | psql "<DATABASE_URL_UNPOOLED>"
  ```

- The interview and AI-grading routes allow up to 300 seconds (`maxDuration`). If your Vercel plan or
  function settings allow less, the deployment reports it; enable Fluid compute in the project's
  function settings or lower the value in `src/app/api/interviews/[id]/messages/route.ts`,
  `src/app/api/interviews/[id]/evaluate/route.ts`, `src/app/learn/lesson/[slug]/page.tsx` and
  `src/app/experience/page.tsx`.
- Code execution does not change: TypeScript runs in your browser; Java and Python harnesses run on
  your own machine.
- These steps were verified locally (the build script against a fresh database, the password gate on
  a production build with `VERCEL=1`). A real Vercel deployment could not be run from the environment
  this was built in.

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
- The whiteboard load test is an analytical model of the diagram, not a benchmark of real software.
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
