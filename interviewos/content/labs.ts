import type { LabDef } from "@/lib/content/defs";

export const LABS: LabDef[] = [
  {
    slug: "linux-networking-lab",
    title: "Linux networking: from listening socket to failure diagnosis",
    area: "linux-networking",
    order: 1,
    summary:
      "Start a local HTTP server, find its listening socket and process, inspect responses with curl, then diagnose a simulated connection failure.",
    estimatedMinutes: 60,
    difficulty: "easy",
    topics: ["linux-net-tools", "sockets", "tcp-ip", "processes-threads", "troubleshooting"],
    objectives: [
      "Map a listening TCP port to the process that owns it",
      "Read an HTTP exchange with curl -v and explain each part",
      "Distinguish 'connection refused' from a timeout and explain what each means at the TCP level",
    ],
    prerequisites: ["Linux or macOS terminal (WSL works on Windows)", "Python 3 installed", "Lesson: TCP/IP (recommended)"],
    tools: ["python3", "ss (Linux) or lsof (macOS)", "ps", "curl", "kill"],
    deliverables: [
      "Pasted output of the listening socket and owning process",
      "Pasted curl -v output with your annotation of request and response lines",
      "Pasted failure output and a one-paragraph diagnosis",
    ],
    steps: [
      {
        id: "server",
        title: "Start a local HTTP server",
        instructions: `Create a scratch directory and serve it on port **8080**:

\`\`\`bash
mkdir -p ~/interviewos-lab && cd ~/interviewos-lab
echo "hello from the lab" > index.html
python3 -m http.server 8080 --bind 127.0.0.1
\`\`\`

Leave it running and open a **second terminal** for the next steps.`,
        expectedOutput: "`Serving HTTP on 127.0.0.1 port 8080 (http://127.0.0.1:8080/) ...`",
        verification: {
          kind: "paste",
          prompt: "Paste the line the server printed when it started.",
          pattern: "Serving HTTP on .*8080",
          patternHint: "Expected something like 'Serving HTTP on 127.0.0.1 port 8080'.",
        },
      },
      {
        id: "listening",
        title: "Identify the listening port and its process",
        instructions: `On Linux:

\`\`\`bash
ss -ltnp | grep 8080
\`\`\`

\`-l\` listening sockets, \`-t\` TCP, \`-n\` numeric (no DNS/service lookups), \`-p\` owning process (may need \`sudo\`).

On macOS: \`lsof -nP -iTCP:8080 -sTCP:LISTEN\`.

Then inspect the process:

\`\`\`bash
ps -o pid,ppid,user,etime,cmd -p <PID>
\`\`\``,
        expectedOutput:
          "A line in state `LISTEN` with local address `127.0.0.1:8080` and the python3 process/PID; `ps` shows the full command line.",
        verification: {
          kind: "paste",
          prompt: "Paste the ss/lsof line and the ps output.",
          pattern: "(LISTEN|\\(LISTEN\\))[\\s\\S]*8080|8080[\\s\\S]*(LISTEN|\\(LISTEN\\))",
          patternHint: "The output should show a LISTEN socket on port 8080.",
        },
      },
      {
        id: "curl",
        title: "Inspect the HTTP exchange",
        instructions: `\`\`\`bash
curl -v http://127.0.0.1:8080/
\`\`\`

Annotate (in your own words, below the pasted output):
- lines starting with \`*\` — connection setup by curl,
- \`>\` — request line and headers sent,
- \`<\` — status line and response headers received.

Then compare with \`curl -sI http://127.0.0.1:8080/\` (HEAD request). What changed and why?`,
        expectedOutput: "`< HTTP/1.0 200 OK` (Python's simple server speaks HTTP/1.0), `Content-Type: text/html`, and the body.",
        verification: {
          kind: "paste",
          prompt: "Paste the curl -v output plus your annotations.",
          pattern: "HTTP/1\\.[01] 200",
          patternHint: "Expected a '200' status line such as 'HTTP/1.0 200 OK'.",
          minLength: 200,
        },
      },
      {
        id: "refused",
        title: "Simulate a failure: nothing listening",
        instructions: `Stop the server (Ctrl+C in the first terminal, or \`kill <PID>\`) and repeat:

\`\`\`bash
curl -v http://127.0.0.1:8080/
\`\`\`

Then try a port behind a firewall-like black hole to see a **timeout** instead (10.255.255.1 is a non-routable address on most networks):

\`\`\`bash
curl -v --connect-timeout 3 http://10.255.255.1:8080/
\`\`\`

Explain the difference: a **refused** connection means the host answered the SYN with a RST (nothing listening on that port); a **timeout** means no answer at all (packet dropped, filtered or host unreachable).`,
        expectedOutput: "`Connection refused` for the first command; `Connection timed out` / `Timeout was reached` for the second.",
        verification: {
          kind: "paste",
          prompt: "Paste both outputs and your explanation of refused vs timeout.",
          pattern: "(?i)refused[\\s\\S]*(timed out|timeout)|(timed out|timeout)[\\s\\S]*refused",
          patternHint: "Include both the 'refused' and the 'timed out' output.",
          minLength: 200,
        },
      },
      {
        id: "port-conflict",
        title: "Bonus failure: address already in use",
        instructions: `Start the server again, then start a **second** server on the same port in another terminal. Observe \`OSError: [Errno 98] Address already in use\` (macOS: Errno 48). Use \`ss\`/\`lsof\` to find which process holds the port.`,
        verification: { kind: "checkbox", prompt: "I reproduced 'Address already in use' and identified the owning process." },
      },
    ],
    failureScenarios: [
      { symptom: "ss shows no process name", cause: "Listing other users' sockets needs privileges", fix: "Run `sudo ss -ltnp`." },
      { symptom: "curl hangs instead of refusing", cause: "A firewall drops packets, or you're hitting a different host", fix: "Use 127.0.0.1 explicitly and add `--connect-timeout 3`." },
      { symptom: "Address already in use", cause: "Another process (or the previous server) still owns the port", fix: "Find it with `ss -ltnp` / `lsof -i :8080` and stop it, or pick another port." },
      { symptom: "curl to localhost works but 0.0.0.0 vs 127.0.0.1 confusion", cause: "The server binds only to the loopback interface", fix: "Explain the difference between binding 127.0.0.1 and 0.0.0.0." },
    ],
    reflectionQuestions: [
      "At the TCP level, what does the client receive when the connection is refused, and what does it receive in the timeout case?",
      "Why would binding to 0.0.0.0 instead of 127.0.0.1 change who can reach your server?",
      "How would you find which process is using 90% CPU and which ports it has open?",
    ],
  },
  {
    slug: "java-concurrency-lab",
    title: "Java concurrency: reproduce and fix a race condition",
    area: "java",
    order: 2,
    summary:
      "Build an unsafe shared counter, reproduce lost updates, fix it with synchronized and with AtomicInteger, and compare behaviour and cost.",
    estimatedMinutes: 60,
    difficulty: "medium",
    topics: ["java-concurrency", "synchronization", "executors"],
    objectives: [
      "Reproduce a lost-update race and explain the read-modify-write interleaving",
      "Fix the race with intrinsic locks and with atomics, and explain the happens-before guarantees",
      "Compare correctness and rough performance of the three versions",
    ],
    prerequisites: ["JDK 17+ (`java -version`)", "Lesson: Threads and the Java Memory Model"],
    tools: ["java (single-file source launcher)"],
    deliverables: ["Program output for all three counters", "A written explanation of why the unsafe version loses updates"],
    steps: [
      {
        id: "program",
        title: "Write the experiment",
        instructions: `Save as \`Counters.java\`:

\`\`\`java
import java.util.concurrent.*;
import java.util.concurrent.atomic.AtomicInteger;

public class Counters {
    static int unsafeCount = 0;
    static int lockedCount = 0;
    static final Object lock = new Object();
    static final AtomicInteger atomicCount = new AtomicInteger();

    static long run(int threads, int perThread, Runnable increment) throws Exception {
        ExecutorService pool = Executors.newFixedThreadPool(threads);
        CountDownLatch start = new CountDownLatch(1);
        long t0 = System.nanoTime();
        for (int t = 0; t < threads; t++) {
            pool.submit(() -> {
                start.await();
                for (int i = 0; i < perThread; i++) increment.run();
                return null;
            });
        }
        start.countDown();
        pool.shutdown();
        pool.awaitTermination(1, TimeUnit.MINUTES);
        return (System.nanoTime() - t0) / 1_000_000;
    }

    public static void main(String[] args) throws Exception {
        int threads = 4, perThread = 500_000, expected = threads * perThread;
        long ms1 = run(threads, perThread, () -> unsafeCount++);
        System.out.println("unsafe=" + unsafeCount + " expected=" + expected + " ms=" + ms1);
        long ms2 = run(threads, perThread, () -> { synchronized (lock) { lockedCount++; } });
        System.out.println("synchronized=" + lockedCount + " expected=" + expected + " ms=" + ms2);
        long ms3 = run(threads, perThread, atomicCount::incrementAndGet);
        System.out.println("atomic=" + atomicCount.get() + " expected=" + expected + " ms=" + ms3);
    }
}
\`\`\`

Run it **three times**: \`java Counters.java\`.`,
        expectedOutput:
          "`unsafe=` is usually **below** 2000000 and differs between runs; `synchronized=2000000` and `atomic=2000000` every time. Timings vary by machine.",
        verification: {
          kind: "paste",
          prompt: "Paste the output of three runs.",
          pattern: "unsafe=\\d+[\\s\\S]*synchronized=2000000[\\s\\S]*atomic=2000000",
          patternHint: "Expected lines 'unsafe=…', 'synchronized=2000000', 'atomic=2000000'.",
        },
      },
      {
        id: "explain-race",
        title: "Explain the lost update",
        instructions: `\`unsafeCount++\` is three steps: **read** the field, **add 1**, **write** it back. Write a concrete interleaving of two threads that loses one increment (e.g. both read 41, both write 42).

Also explain why, even on a single-core machine, the unsafe version is incorrect under the Java Memory Model (no happens-before edge between the writes and later reads).`,
        verification: {
          kind: "paste",
          prompt: "Write your interleaving and explanation (at least a few sentences).",
          minLength: 250,
        },
      },
      {
        id: "volatile-trap",
        title: "Try the volatile trap",
        instructions: `Change \`static int unsafeCount\` to \`static volatile int unsafeCount\` and run again. Observe that updates are **still** lost. Explain: \`volatile\` provides visibility and ordering, not atomicity of read-modify-write.`,
        verification: {
          kind: "paste",
          prompt: "Paste the output with volatile and one sentence explaining it.",
          pattern: "unsafe=\\d+",
          minLength: 80,
        },
      },
      {
        id: "compare",
        title: "Compare the fixes",
        instructions: `In a short paragraph compare \`synchronized\` and \`AtomicInteger\`: mechanism (monitor lock vs CAS loop), what happens under high contention, when you'd prefer \`LongAdder\`, and what each guarantees about visibility.`,
        verification: { kind: "paste", prompt: "Your comparison.", minLength: 250 },
      },
    ],
    failureScenarios: [
      { symptom: "unsafe count is always correct", cause: "Too little contention (small loop or one effective CPU)", fix: "Increase perThread to 5_000_000 or threads to 8; run several times." },
      { symptom: "Program never finishes", cause: "An exception inside a task is swallowed by submit(), or awaitTermination is waiting", fix: "Check for exceptions with future.get(); keep the latch logic as given." },
      { symptom: "'java Counters.java' fails to compile", cause: "JDK older than 11 or a typo", fix: "Check `java -version`; the single-file launcher requires JDK 11+." },
    ],
    reflectionQuestions: [
      "Why does making the field volatile not fix the race?",
      "What is the happens-before relationship established by exiting and entering a synchronized block on the same monitor?",
      "Under very high contention, why can LongAdder outperform AtomicInteger?",
    ],
  },
  {
    slug: "postgresql-lab",
    title: "PostgreSQL: indexes, query plans and concurrent updates",
    area: "backend",
    order: 3,
    summary:
      "Create tables and indexes, run joins and aggregations, read EXPLAIN ANALYZE before and after indexing, and simulate concurrent updates with row locks.",
    estimatedMinutes: 75,
    difficulty: "medium",
    topics: ["sql-queries", "postgres-indexes", "query-optimization", "transactions-isolation", "locking-concurrency"],
    objectives: [
      "Read a query plan and identify sequential scans, index scans and join strategies",
      "Show the effect of an index with measured execution time",
      "Reproduce a lost update and prevent it with SELECT … FOR UPDATE or an atomic UPDATE",
    ],
    prerequisites: ["PostgreSQL 14+ and psql (the database you created for InterviewOS works)", "Lesson: PostgreSQL indexes"],
    tools: ["psql"],
    deliverables: ["EXPLAIN ANALYZE output before and after an index", "Transcript of two concurrent sessions"],
    steps: [
      {
        id: "schema",
        title: "Create a dataset",
        instructions: `Create a scratch database (\`createdb labdb\`) and run:

\`\`\`sql
CREATE TABLE customers (id bigserial PRIMARY KEY, country text NOT NULL, created_at timestamptz NOT NULL);
CREATE TABLE orders (
  id bigserial PRIMARY KEY,
  customer_id bigint NOT NULL REFERENCES customers(id),
  amount_cents int NOT NULL,
  status text NOT NULL,
  created_at timestamptz NOT NULL
);
INSERT INTO customers (country, created_at)
SELECT (ARRAY['CZ','DE','US','PL','SK'])[1 + (g % 5)], now() - (g || ' minutes')::interval
FROM generate_series(1, 50000) g;
INSERT INTO orders (customer_id, amount_cents, status, created_at)
SELECT 1 + (random() * 49999)::int, (random() * 10000)::int,
       (ARRAY['paid','pending','refunded'])[1 + (g % 3)], now() - (g || ' seconds')::interval
FROM generate_series(1, 500000) g;
ANALYZE;
\`\`\``,
        verification: { kind: "checkbox", prompt: "Tables created and populated (500,000 orders)." },
      },
      {
        id: "before",
        title: "Plan without an index",
        instructions: `\`\`\`sql
EXPLAIN (ANALYZE, BUFFERS)
SELECT c.country, count(*), sum(o.amount_cents)
FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.customer_id = 4242
GROUP BY c.country;
\`\`\`

Identify: the scan type on \`orders\`, rows estimated vs actual, and total execution time.`,
        expectedOutput: "A `Seq Scan on orders` (or Parallel Seq Scan) filtering ~500k rows; execution time in tens of milliseconds.",
        verification: {
          kind: "paste",
          prompt: "Paste the plan.",
          pattern: "(?i)seq scan[\\s\\S]*execution time",
          patternHint: "Expected a Seq Scan and an 'Execution Time' line.",
        },
      },
      {
        id: "after",
        title: "Add an index and compare",
        instructions: `\`\`\`sql
CREATE INDEX orders_customer_id_idx ON orders (customer_id);
ANALYZE orders;
\`\`\`

Re-run the same EXPLAIN. Note the new scan type (Index Scan or Bitmap Index/Heap Scan) and the execution time. Then try \`WHERE o.status = 'paid'\` — why does an index on \`status\` probably **not** help (selectivity)?`,
        verification: {
          kind: "paste",
          prompt: "Paste the new plan and your comparison.",
          pattern: "(?i)(index scan|bitmap index scan|index only scan)[\\s\\S]*execution time",
          patternHint: "Expected an Index Scan / Bitmap Index Scan.",
          minLength: 150,
        },
      },
      {
        id: "lost-update",
        title: "Reproduce a lost update",
        instructions: `\`\`\`sql
CREATE TABLE accounts (id int PRIMARY KEY, balance int NOT NULL);
INSERT INTO accounts VALUES (1, 100);
\`\`\`

Open **two** psql sessions (A and B) and interleave:

| Step | Session A | Session B |
|---|---|---|
| 1 | \`BEGIN; SELECT balance FROM accounts WHERE id = 1;\` → 100 | |
| 2 | | \`BEGIN; SELECT balance FROM accounts WHERE id = 1;\` → 100 |
| 3 | \`UPDATE accounts SET balance = 90 WHERE id = 1; COMMIT;\` (app computed 100 − 10) | |
| 4 | | \`UPDATE accounts SET balance = 80 WHERE id = 1; COMMIT;\` (app computed 100 − 20) |

Final balance is 80 — the −10 withdrawal was lost.`,
        verification: {
          kind: "paste",
          prompt: "Paste both sessions' transcripts and the final SELECT.",
          pattern: "(?i)commit[\\s\\S]*80",
          minLength: 150,
        },
      },
      {
        id: "fix",
        title: "Fix it two ways",
        instructions: `1. **Pessimistic lock:** repeat with \`SELECT balance FROM accounts WHERE id = 1 FOR UPDATE;\` in both sessions. Session B **blocks** until A commits, then sees 90.
2. **Atomic update:** \`UPDATE accounts SET balance = balance - 10 WHERE id = 1;\` — no read-modify-write in the application at all.

Optional: run B in \`BEGIN ISOLATION LEVEL REPEATABLE READ\` and observe \`ERROR: could not serialize access due to concurrent update\`.`,
        verification: {
          kind: "paste",
          prompt: "Paste the FOR UPDATE transcript showing B waiting and the correct final balance (70).",
          pattern: "(?i)for update[\\s\\S]*70",
          minLength: 150,
        },
      },
    ],
    failureScenarios: [
      { symptom: "Plan still shows Seq Scan after creating the index", cause: "Stale statistics or low selectivity", fix: "Run ANALYZE; check that the predicate matches few rows." },
      { symptom: "Session B does not block with FOR UPDATE", cause: "Autocommit: the transaction ended immediately", fix: "Start with BEGIN and keep A's transaction open." },
      { symptom: "permission denied to create database", cause: "Role lacks CREATEDB", fix: "Use the interviewos database or ask a superuser to run createdb." },
    ],
    reflectionQuestions: [
      "Why does the planner sometimes prefer a sequential scan even when an index exists?",
      "Compare SELECT … FOR UPDATE, an atomic UPDATE, and optimistic locking with a version column. When would you use each?",
      "What anomaly does REPEATABLE READ prevent that READ COMMITTED allows?",
    ],
  },
  {
    slug: "fullstack-lab",
    title: "Fullstack: typed API, async UI states and tests",
    area: "ts-react",
    order: 4,
    summary:
      "Build a small React app that consumes a typed API, handles loading/error/success states correctly, and is covered by unit and integration tests.",
    estimatedMinutes: 120,
    difficulty: "medium",
    topics: ["react-hooks", "promises-async", "frontend-testing", "ts-type-system", "rest-api-design"],
    objectives: [
      "Model API responses with TypeScript types and runtime validation",
      "Implement loading, error, empty and success states without race conditions",
      "Write unit and integration tests that exercise failure paths",
    ],
    prerequisites: ["Node.js 20+", "Lessons: Promises and async/await, React hooks"],
    tools: ["npm", "Vite (React + TypeScript template)", "Vitest", "React Testing Library", "Zod"],
    deliverables: ["A running app", "Test output with at least one error-path test", "A short write-up of how you prevent stale responses"],
    steps: [
      {
        id: "scaffold",
        title: "Scaffold the project",
        instructions: `\`\`\`bash
npm create vite@latest todo-lab -- --template react-ts
cd todo-lab && npm install
npm install zod
npm install -D vitest @testing-library/react @testing-library/jest-dom jsdom
\`\`\`

Use the public JSONPlaceholder API (\`https://jsonplaceholder.typicode.com/todos?userId=1\`) or a tiny local Express server.`,
        verification: { kind: "checkbox", prompt: "Project created and `npm run dev` shows the starter page." },
      },
      {
        id: "client",
        title: "Typed API client",
        instructions: `Write \`api.ts\` exporting \`fetchTodos(userId: number, signal?: AbortSignal): Promise<Todo[]>\`:
- validate the JSON with a Zod schema (types alone don't validate runtime data);
- throw a typed error for non-2xx responses (include the status);
- accept an \`AbortSignal\`.`,
        verification: { kind: "paste", prompt: "Paste your api.ts.", pattern: "(?i)z\\.object[\\s\\S]*fetch", minLength: 200 },
      },
      {
        id: "states",
        title: "Loading / error / success without races",
        instructions: `Build a component with a user selector (1–3) that loads todos. Requirements:
- states: idle → loading → success | error, plus an empty state;
- switching users quickly must never show the previous user's todos (abort the previous request in the effect cleanup);
- a Retry button on error.`,
        verification: { kind: "paste", prompt: "Paste the component and explain how stale responses are prevented.", pattern: "(?i)abort", minLength: 300 },
      },
      {
        id: "tests",
        title: "Tests",
        instructions: `Write tests with mocked \`fetch\`:
1. unit test for \`fetchTodos\` rejecting invalid JSON shapes;
2. integration test: renders loading, then the list;
3. integration test: server returns 500 → error message and Retry works.

Run \`npx vitest run\`.`,
        verification: {
          kind: "paste",
          prompt: "Paste the test run output.",
          pattern: "(?i)(\\d+ passed|tests\\s+\\d+ passed|✓)",
          patternHint: "Expected Vitest output with passing tests.",
        },
      },
    ],
    failureScenarios: [
      { symptom: "Old user's todos flash after switching", cause: "No cancellation of in-flight requests", fix: "Abort in the effect cleanup or ignore responses with an `ignore` flag." },
      { symptom: "Tests hang", cause: "Unresolved fetch mock or missing await on findBy*", fix: "Return resolved promises from mocks; use `await screen.findByText`." },
      { symptom: "'document is not defined' in tests", cause: "Vitest environment is node", fix: "Set `environment: 'jsdom'` in vitest config." },
    ],
    reflectionQuestions: [
      "Why is a TypeScript type not enough to trust data from an API?",
      "Which failure modes does your UI handle, and which would you add for production (timeouts, offline)?",
      "What is the difference between a unit and an integration test in your setup, and what does each protect against?",
    ],
  },
  {
    slug: "booking-system-design-lab",
    title: "System design: a booking platform without double bookings",
    area: "system-design",
    order: 5,
    summary:
      "Design a booking system end to end, identify race conditions, choose transaction semantics, and discuss scaling and availability.",
    estimatedMinutes: 75,
    difficulty: "medium",
    topics: ["cs-booking-platform", "transactions-isolation", "locking-concurrency", "sd-requirements", "sd-consistency"],
    objectives: [
      "Clarify requirements and estimate load before designing",
      "Prevent double booking with an explicit concurrency strategy and justify it",
      "Discuss scaling, availability and failure handling with concrete trade-offs",
    ],
    prerequisites: ["Lessons: Requirements clarification, Transactions and isolation", "Case study: Booking platform (recommended)"],
    tools: ["Paper or a diagram tool", "Optional: PostgreSQL to prototype constraints"],
    deliverables: ["Written requirements and estimates", "Data model and booking flow", "Concurrency strategy with justification", "Scaling & failure discussion"],
    steps: [
      {
        id: "requirements",
        title: "Requirements and estimates",
        instructions: `Scenario: a platform where studios offer time slots (yoga classes, 1–30 seats) and customers book and pay.

Write down: functional requirements (search, hold, book, cancel, waitlist?), non-functional requirements (consistency for seats, latency, availability), and back-of-the-envelope numbers (e.g. 5,000 studios × 20 classes/day, peak booking QPS when a popular class opens).`,
        verification: { kind: "paste", prompt: "Paste your requirements and estimates.", minLength: 400 },
      },
      {
        id: "model",
        title: "Data model and API",
        instructions: `Define tables (e.g. \`classes(id, capacity, starts_at)\`, \`bookings(id, class_id, user_id, status, idempotency_key)\`) and the main endpoints (\`POST /classes/{id}/bookings\` with an Idempotency-Key header). Include the constraints that enforce invariants in the database.`,
        verification: { kind: "paste", prompt: "Paste your schema and API.", minLength: 300, pattern: "(?i)(unique|constraint|primary key|idempotency)" },
      },
      {
        id: "races",
        title: "Race conditions and transaction semantics",
        instructions: `Two customers book the last seat at the same moment. Describe at least **two** strategies and pick one:
- \`SELECT … FOR UPDATE\` on the class row, then count and insert;
- a conditional atomic update: \`UPDATE classes SET booked = booked + 1 WHERE id = $1 AND booked < capacity\` and check the row count;
- SERIALIZABLE isolation with retries;
- per-seat rows with a unique constraint.

Also handle: payment failures after a seat is held (hold with expiry), and client retries (idempotency keys).`,
        verification: { kind: "paste", prompt: "Paste your analysis and decision.", minLength: 500, pattern: "(?i)(for update|serializable|atomic|unique|row count)" },
      },
      {
        id: "scale",
        title: "Scaling and availability",
        instructions: `Discuss: read scaling for search (cache, read replicas), what must stay strongly consistent (seat counts), hot partitions (a popular class), queueing for notifications/emails, and what happens when the payment provider is down.`,
        verification: { kind: "paste", prompt: "Paste your scaling and failure discussion.", minLength: 400 },
      },
    ],
    failureScenarios: [
      { symptom: "Design relies on 'check then insert' in application code", cause: "Time-of-check to time-of-use race", fix: "Move the invariant into one atomic statement, a lock, or a constraint." },
      { symptom: "Seat count cached and decremented in Redis only", cause: "Cache becomes the source of truth without durability", fix: "Keep the database authoritative; use the cache for reads." },
      { symptom: "Retries create duplicate bookings", cause: "Non-idempotent POST", fix: "Idempotency key with a unique constraint and stored response." },
    ],
    reflectionQuestions: [
      "Which part of your design must be strongly consistent and which can be eventually consistent? Why?",
      "What is the throughput limit of your concurrency strategy for one very popular class, and how would you raise it?",
      "How does your design behave if the process crashes after charging the card but before confirming the booking?",
    ],
  },
];
