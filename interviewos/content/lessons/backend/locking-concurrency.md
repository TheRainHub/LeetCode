---
slug: locking-concurrency
title: Locking, deadlocks and optimistic concurrency
path: backend
module: be-databases
order: 5
minutes: 45
depth: full
practice: lab
summary: Row and table locks, SELECT FOR UPDATE / SKIP LOCKED, deadlocks, advisory locks and optimistic version checks — with migration-safety tips.
prerequisites: [transactions-isolation]
problems: []
objectives:
  - Explain row-level vs table-level locks and which statements take them
  - Use SELECT … FOR UPDATE, NOWAIT and SKIP LOCKED (job queues) correctly
  - Prevent and diagnose deadlocks (consistent lock ordering, pg_locks)
  - Choose between pessimistic locking and optimistic concurrency (version columns)
readings:
  - title: "PostgreSQL docs — Explicit locking"
    url: https://www.postgresql.org/docs/current/explicit-locking.html
    kind: docs
  - title: "PostgreSQL docs — SELECT (locking clause)"
    url: https://www.postgresql.org/docs/current/sql-select.html
    kind: docs
interview:
  - q: "How would you build a job queue on PostgreSQL that multiple workers consume safely?"
    a: "SELECT id FROM jobs WHERE status = 'ready' ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 10 inside a transaction, mark them running (or process and delete), commit. SKIP LOCKED makes workers skip rows another worker holds, so they don't block or double-process."
  - q: "What causes a deadlock and how do you prevent it?"
    a: "Two transactions each hold a lock the other needs (T1 locks A then B, T2 locks B then A). Postgres detects it and aborts one. Prevent with consistent lock ordering (e.g. by id), shorter transactions, and fewer locks; retry the aborted transaction."
  - q: "Optimistic vs pessimistic concurrency?"
    a: "Pessimistic: lock first (FOR UPDATE) — good with high contention, costs waiting. Optimistic: read a version, then UPDATE … WHERE id = ? AND version = ?; if 0 rows, someone changed it — reload/retry or return 409. Good for low contention and long user-think time (forms)."
selfAssessment:
  - I can implement a SKIP LOCKED queue
  - I can explain how to avoid deadlocks
  - I know which migrations take heavy locks
completion:
  - Score at least 70% on the quiz
  - Complete the PostgreSQL lab locking step
quiz:
  - q: "A web form edited for 5 minutes should use:"
    options: ["SELECT FOR UPDATE held during editing", "Optimistic concurrency with a version/ETag", "Table locks", "No checks"]
    answer: 1
    why: "Never hold DB locks across user think time."
  - q: "FOR UPDATE NOWAIT:"
    options: ["Waits forever", "Errors immediately if the row is locked", "Skips locked rows", "Locks the table"]
    answer: 1
    why: "SKIP LOCKED skips; NOWAIT fails fast."
  - q: "ALTER TABLE … ADD COLUMN with a volatile default on a huge table in older setups / or SET NOT NULL can:"
    options: ["Never lock", "Take an ACCESS EXCLUSIVE lock and rewrite or scan the table, blocking traffic", "Only lock one row", "Run concurrently by default"]
    answer: 1
    why: "Use lock_timeout, add constraints as NOT VALID then VALIDATE, and CREATE INDEX CONCURRENTLY."
explain:
  prompt: "Explain how you'd implement a reliable background job queue in PostgreSQL with several workers."
  rubric:
    - "Jobs table with status, attempts, run_at"
    - "FOR UPDATE SKIP LOCKED to claim jobs without double processing"
    - "Short transactions; visibility timeout / lease for crashed workers"
    - "Retries with backoff, max attempts, dead-letter state; idempotent handlers"
  model: "I'd have a jobs table with id, payload, status, attempts, run_at and locked_until. A worker claims work with UPDATE jobs SET status = 'running', locked_until = now() + interval '5 minutes', attempts = attempts + 1 WHERE id IN (SELECT id FROM jobs WHERE status = 'ready' AND run_at <= now() ORDER BY run_at FOR UPDATE SKIP LOCKED LIMIT 10) RETURNING *. SKIP LOCKED means concurrent workers grab different rows instead of blocking. The claim transaction is short; the work happens outside it, then the job is marked done. If a worker crashes, a sweeper resets jobs whose lease expired. Failures reschedule with exponential backoff until max attempts, then go to a dead state for inspection. Because a job can run twice after a crash, handlers must be idempotent."
cards:
  - q: "SKIP LOCKED use case"
    a: "Queue consumers claiming different rows without blocking each other."
  - q: "Deadlock prevention"
    a: "Acquire locks in a consistent order; keep transactions short; retry the victim."
  - q: "Optimistic locking update"
    a: "UPDATE t SET …, version = version + 1 WHERE id = ? AND version = ? → 0 rows = conflict."
---

## Explanation

### Row-level locks

| Clause | Purpose |
|---|---|
| `FOR UPDATE` | will update/delete; blocks other FOR UPDATE and writers |
| `FOR NO KEY UPDATE` | taken by normal UPDATEs not touching keys |
| `FOR SHARE` | prevent changes while reading |
| `NOWAIT` / `SKIP LOCKED` | fail fast / skip rows already locked |

UPDATE and DELETE lock the rows they modify until commit.

### Table-level locks

Most DML takes weak table locks that don't conflict. DDL like `ALTER TABLE` often takes **ACCESS EXCLUSIVE**, blocking everything — and it waits behind long transactions while blocking new queries behind it (a lock queue pile-up). Use `SET lock_timeout = '2s'` for migrations, `CREATE INDEX CONCURRENTLY`, and `ADD CONSTRAINT … NOT VALID` + `VALIDATE CONSTRAINT`.

### Deadlocks

Detected after `deadlock_timeout` (1s default); one transaction is aborted with `40P01`. Prevent by ordering lock acquisition (e.g. sort ids before updating), and keep transactions small.

### Advisory locks

Application-defined locks: `pg_advisory_xact_lock(key)` — e.g. "only one scheduler instance runs this job". Released at transaction end (xact variant).

### Optimistic concurrency

Version column or `updated_at` comparison; in HTTP, map to `ETag`/`If-Match` → `412 Precondition Failed`.

## Worked examples

### Transfer without deadlocks

```sql
BEGIN;
-- lock both accounts in id order regardless of transfer direction
SELECT id FROM accounts WHERE id IN (7, 3) ORDER BY id FOR UPDATE;
UPDATE accounts SET balance = balance - 50 WHERE id = 7;
UPDATE accounts SET balance = balance + 50 WHERE id = 3;
COMMIT;
```

### Finding blockers

```sql
SELECT pid, pg_blocking_pids(pid) AS blocked_by, state, wait_event_type, query
FROM pg_stat_activity WHERE cardinality(pg_blocking_pids(pid)) > 0;
```

## Common misconceptions

- **"SELECT never blocks."** — Plain SELECT doesn't, but it waits behind ACCESS EXCLUSIVE locks from DDL.
- **"Deadlocks mean a bug in Postgres."** — They're an application lock-ordering issue; retry and fix ordering.
- **"Optimistic locking avoids all conflicts."** — It detects them; you still must handle them.

## Practical exercises

1. In the **PostgreSQL lab**, open two sessions and observe blocking with `FOR UPDATE`, then use `pg_blocking_pids`.
2. Build a tiny SKIP LOCKED queue and run two consumers in parallel.
3. Write a safe migration plan to add a NOT NULL column to a large table.
