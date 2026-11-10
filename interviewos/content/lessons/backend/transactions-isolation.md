---
slug: transactions-isolation
title: Transactions and isolation levels
path: backend
module: be-databases
order: 4
minutes: 55
depth: full
practice: lab
summary: ACID, MVCC, the anomalies each isolation level prevents in PostgreSQL, and how to keep invariants correct under concurrency.
prerequisites: [sql-queries]
problems: []
objectives:
  - Explain ACID and how PostgreSQL implements isolation with MVCC snapshots
  - Name the anomalies (dirty read, non-repeatable read, phantom, lost update, write skew) and which levels prevent them
  - Choose between Read Committed with explicit locking, Repeatable Read, and Serializable with retries
  - Keep transactions short and handle serialization failures correctly
readings:
  - title: "PostgreSQL docs — Transaction isolation"
    url: https://www.postgresql.org/docs/current/transaction-iso.html
    kind: docs
  - title: "PostgreSQL docs — MVCC introduction"
    url: https://www.postgresql.org/docs/current/mvcc-intro.html
    kind: docs
  - title: "Designing Data-Intensive Applications — Ch. 7 Transactions (Kleppmann)"
    url: https://dataintensive.net/
    kind: book
interview:
  - q: "What is PostgreSQL's default isolation level, and what can go wrong with it?"
    a: "Read Committed: each statement sees a fresh snapshot. Two transactions doing read-modify-write in application code can lose an update, and checks spanning statements can race (e.g. two bookings each see one seat left). Fix with atomic UPDATE … SET x = x - 1 WHERE x > 0, SELECT … FOR UPDATE, constraints, or Serializable with retries."
  - q: "What is write skew?"
    a: "Two transactions read overlapping data, make decisions based on it, and write different rows, together violating an invariant (classic: two on-call doctors both go off-call). Repeatable Read (snapshot isolation) does not prevent it; Serializable does, or explicit locks on the rows the decision depends on."
  - q: "How does MVCC let readers and writers not block each other?"
    a: "Updates create new row versions with transaction ids (xmin/xmax); readers use a snapshot to see the versions committed before they started, so they never wait for writers. Old versions are cleaned up by VACUUM."
selfAssessment:
  - I can name each anomaly with an example
  - I know which PostgreSQL level prevents which anomaly
  - I can fix a lost-update bug three different ways
completion:
  - Score at least 70% on the quiz
  - Reproduce a lost update and its fix in the PostgreSQL lab
  - Explain isolation choices for a booking system in interview mode
quiz:
  - q: "In PostgreSQL, Read Uncommitted behaves like:"
    options: ["Allows dirty reads", "Read Committed — dirty reads are never allowed", "Serializable", "No transactions"]
    answer: 1
    why: "PostgreSQL never shows uncommitted data."
  - q: "Under Serializable isolation, the application must:"
    options: ["Do nothing special", "Be ready to retry transactions that fail with serialization errors (SQLSTATE 40001)", "Use only SELECT", "Disable MVCC"]
    answer: 1
    why: "SSI aborts one of a conflicting pair rather than blocking."
  - q: "UPDATE seats SET left = left - 1 WHERE id = 1 AND left > 0 is safe against lost updates because:"
    options: ["It's fast", "The UPDATE is atomic and re-checks the condition on the latest row version after waiting for concurrent writers", "It uses Serializable", "It's in a view"]
    answer: 1
    why: "Row locks are taken by UPDATE; Read Committed re-evaluates the WHERE on the newest version."
  - q: "Long-running transactions are harmful mainly because they:"
    options: ["Use CPU", "Hold locks and prevent VACUUM from removing dead rows (bloat)", "Are slower to commit", "Can't read data"]
    answer: 1
    why: "Old snapshots keep dead tuples alive and locks block others."
explain:
  prompt: "Two users try to book the last seat in a class at the same time. Explain what can go wrong and how you'd guarantee correctness in PostgreSQL."
  rubric:
    - "Describes the race: both read one seat left, both insert a booking"
    - "Correct fix options: atomic conditional UPDATE, SELECT … FOR UPDATE, unique/check constraints, or Serializable + retry"
    - "Mentions idempotency of the booking request"
    - "Discusses trade-offs: contention, lock duration, retry logic"
  model: "Under Read Committed both transactions can read 'one seat left', both pass the check and both insert, overbooking the class. The simplest robust fix is to make the check and the decrement one atomic statement: UPDATE classes SET seats_left = seats_left - 1 WHERE id = $1 AND seats_left > 0 RETURNING seats_left. The second transaction waits for the first's row lock, re-evaluates the WHERE on the new version and updates zero rows, so I return 'class full'. Alternatively I'd lock the class row with SELECT … FOR UPDATE before counting bookings, or run at Serializable and retry on 40001. I'd add a unique constraint on (class_id, user_id) so the same user can't book twice and use an idempotency key so client retries don't create duplicates. Hot classes become a contention point, but the lock is held only for a short transaction."
cards:
  - q: "Anomalies prevented by PG Repeatable Read"
    a: "Dirty read, non-repeatable read, phantoms (snapshot). Not write skew."
  - q: "Fixes for lost update"
    a: "Atomic UPDATE expression, SELECT FOR UPDATE, optimistic version column, Serializable + retry."
  - q: "SQLSTATE 40001"
    a: "serialization_failure — retry the whole transaction."
---

## Explanation

### ACID

- **Atomicity**: all or nothing (rollback on failure).
- **Consistency**: constraints/invariants hold after commit — partly your job.
- **Isolation**: concurrent transactions don't see each other's partial work (to a degree set by the level).
- **Durability**: committed data survives crashes (WAL flushed on commit).

### MVCC in PostgreSQL

Each row version stores `xmin`/`xmax`. A **snapshot** decides which versions are visible. Readers don't block writers and vice versa; writers block writers on the same row. VACUUM removes versions no snapshot can see.

### Anomalies and levels (PostgreSQL)

| Anomaly | Read Committed | Repeatable Read | Serializable |
|---|---|---|---|
| Dirty read | prevented | prevented | prevented |
| Non-repeatable read | possible | prevented | prevented |
| Phantom read | possible | prevented (snapshot) | prevented |
| Lost update (read-modify-write in app) | possible | detected → error | prevented |
| Write skew | possible | possible | prevented |

- **Read Committed** (default): new snapshot per statement.
- **Repeatable Read**: one snapshot per transaction; concurrent update to a row you modify → `could not serialize access` error.
- **Serializable** (SSI): tracks read/write dependencies and aborts transactions that would produce a non-serializable outcome. Needs retries.

### Practical rules

- Prefer **atomic statements** and **constraints** (unique, check, exclusion) — the database enforces invariants for you.
- Keep transactions **short**; never wait on user input or slow HTTP calls inside a transaction.
- Use `SELECT … FOR UPDATE` when you must read then decide.
- At Serializable/Repeatable Read, wrap the transaction in a retry loop with backoff.

## Worked examples

### Lost update

```text
T1: SELECT balance FROM accounts WHERE id=1;   -- 100
T2: SELECT balance FROM accounts WHERE id=1;   -- 100
T1: UPDATE accounts SET balance = 150 WHERE id=1;  COMMIT;   -- +50
T2: UPDATE accounts SET balance = 70  WHERE id=1;  COMMIT;   -- -30, T1's +50 lost
```
Fix: `UPDATE accounts SET balance = balance - 30 WHERE id = 1 AND balance >= 30;`

### Write skew

Invariant: at least one doctor on call. Both doctors run `SELECT count(*) FROM oncall WHERE on_call` (=2), each sets themselves off-call. Under Repeatable Read both commit → zero on call. Serializable aborts one; or lock all on-call rows with `FOR UPDATE` first.

### Retry loop sketch (TypeScript)

```ts
for (let attempt = 1; ; attempt++) {
  try {
    return await db.transaction(fn, { isolationLevel: "serializable" });
  } catch (e) {
    if (code(e) !== "40001" || attempt === 5) throw e;
    await sleep(2 ** attempt * 10 + Math.random() * 10);
  }
}
```

## Common misconceptions

- **"Transactions make concurrent code correct automatically."** — Only at Serializable; lower levels allow anomalies.
- **"Repeatable Read means nothing changes."** — It means *your snapshot* doesn't change; write skew is still possible.
- **"Serializable is too slow to use."** — It's practical for many workloads if transactions are short and retried.
- **"Consistency in ACID is the same as in CAP."** — ACID consistency is about invariants; CAP is about replicas agreeing.

## Practical exercises

1. In two `psql` sessions, reproduce a lost update, then fix it with an atomic UPDATE and with `FOR UPDATE` (**PostgreSQL lab**).
2. Reproduce write skew under Repeatable Read, then observe the 40001 under Serializable.
3. Design the booking-table constraints for the **booking system design lab**.
