---
slug: cs-booking-platform
title: "Case study: Booking platform"
path: system-design
module: sd-case-studies
order: 3
minutes: 60
depth: full
practice: lab
summary: Classes or appointments with limited capacity — search, holds, payments and cancellations — with a deep dive on preventing double booking under contention.
prerequisites: [sd-requirements, transactions-isolation, locking-concurrency, idempotency]
problems: []
objectives:
  - Design the booking flow with holds, payments and cancellations
  - Prevent overbooking with database-enforced invariants and justify the concurrency strategy
  - Handle hot classes, payment failures and client retries
readings:
  - title: "PostgreSQL docs — Transaction isolation"
    url: https://www.postgresql.org/docs/current/transaction-iso.html
    kind: docs
  - title: "PostgreSQL docs — Exclusion constraints"
    url: https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-EXCLUSION
    kind: docs
  - title: "Stripe docs — Place a hold on a payment method"
    url: https://docs.stripe.com/payments/place-a-hold-on-a-payment-method
    kind: docs
interview:
  - q: "How do you prevent two users from booking the last seat?"
    a: "Make the check-and-decrement atomic in the database: UPDATE classes SET booked = booked + 1 WHERE id = $1 AND booked < capacity (check row count), or SELECT … FOR UPDATE on the class row before counting, or per-seat rows with a unique constraint, or SERIALIZABLE with retries. Plus unique (class_id, user_id) and idempotency keys for retries."
  - q: "A very popular class opens and 5,000 people try to book 20 seats in a second. What happens?"
    a: "All contend on one row; each transaction is short, so the DB serialises them quickly, but latency rises. Mitigations: keep the critical section minimal, reject early when sold out (cached sold-out flag), a virtual waiting room/queue for fairness, or pre-split seats into rows to reduce contention; never move the source of truth to a cache."
  - q: "How do you handle payments that fail after a seat is held?"
    a: "Use a hold with an expiry (status 'held', expires_at). Payment success confirms it; failure or expiry releases the seat via a sweeper or conditional update. Payment calls use idempotency keys and webhooks are deduped."
selfAssessment:
  - I can draw the booking flow including hold expiry
  - I can explain two concurrency strategies and pick one
  - I can discuss hot-partition mitigation
completion:
  - Score at least 70% on the quiz
  - Verify the booking system design lab
quiz:
  - q: "'SELECT count(*) … ; if count < capacity then INSERT' under Read Committed:"
    options: ["Is safe", "Races — two transactions can both see capacity available", "Deadlocks always", "Is serializable"]
    answer: 1
    why: "Time-of-check to time-of-use."
  - q: "For appointment slots with time ranges (no overlapping bookings for one practitioner), PostgreSQL offers:"
    options: ["CHECK constraints only", "Exclusion constraints with a GiST index on tstzrange (&& overlap operator)", "Triggers only", "Nothing"]
    answer: 1
    why: "EXCLUDE USING gist (practitioner_id WITH =, during WITH &&)."
  - q: "Storing seat counts only in Redis is risky because:"
    options: ["Redis is slow", "Redis becomes the source of truth without transactional durability guarantees", "It's not possible", "Redis has no counters"]
    answer: 1
    why: "Keep the DB authoritative; cache for reads."
explain:
  prompt: "Design a booking platform for fitness classes, focusing on correctness under concurrency."
  rubric:
    - "Requirements, estimates including peak contention on popular classes"
    - "Data model with constraints; API with idempotency"
    - "Concurrency strategy (atomic update / FOR UPDATE / serializable) justified"
    - "Holds with expiry and payment flow; cancellations and waitlist"
    - "Scaling reads (cache/replicas), notifications async, failure handling"
  model: "Studios publish classes with a capacity; customers search, book, pay and cancel. Search is read-heavy and can be slightly stale; booking must never oversell. Average load is modest, but a popular class opening creates thousands of attempts on one row, which drives the design. Tables: classes with capacity and booked count with a check constraint, and bookings with a unique constraint on class and user, a status of held, confirmed or cancelled, and an expiry. POST /classes/{id}/bookings requires an Idempotency-Key. In one short transaction I run UPDATE classes SET booked = booked + 1 WHERE id = $1 AND booked < capacity; if one row is updated I insert a held booking with a ten-minute expiry, otherwise I return 409 class full. Payment uses the booking id as idempotency key; the payment webhook confirms the booking, while failures or a sweeper release expired holds by decrementing booked in the same transaction as cancelling the booking. Search is served from replicas or a cache, and when a class sells out I cache a sold-out flag so most requests fail fast without touching the row. Confirmations and waitlist notifications go through an outbox and queue. For extreme launches I'd add a waiting room to admit users gradually."
cards:
  - q: "Double-booking prevention options"
    a: "Atomic conditional UPDATE, SELECT FOR UPDATE, per-seat unique rows, SERIALIZABLE + retry, exclusion constraints for time ranges."
  - q: "Hold pattern"
    a: "Reserve with status held + expires_at; confirm on payment; release on failure/expiry."
---

## Explanation

### Requirements

- Search classes (by studio, time, location), view details, book, pay, cancel, waitlist (optional).
- Strong consistency for capacity; idempotent booking; payments; notifications.
- Peak: a popular class opening (thousands of attempts/second on one class).

### Data model

```sql
CREATE TABLE classes (
  id bigserial PRIMARY KEY,
  studio_id bigint NOT NULL,
  starts_at timestamptz NOT NULL,
  capacity int NOT NULL CHECK (capacity > 0),
  booked int NOT NULL DEFAULT 0 CHECK (booked BETWEEN 0 AND capacity)
);
CREATE TABLE bookings (
  id bigserial PRIMARY KEY,
  class_id bigint NOT NULL REFERENCES classes,
  user_id bigint NOT NULL,
  status text NOT NULL CHECK (status IN ('held','confirmed','cancelled')),
  hold_expires_at timestamptz,
  idempotency_key text NOT NULL,
  UNIQUE (user_id, idempotency_key)
);
-- one active booking per user per class
CREATE UNIQUE INDEX one_active_booking ON bookings (class_id, user_id) WHERE status <> 'cancelled';
```

### Booking flow

1. `BEGIN; UPDATE classes SET booked = booked + 1 WHERE id = $1 AND booked < capacity;` → 0 rows ⇒ 409 full.
2. `INSERT INTO bookings (… 'held', now() + interval '10 min')`; `COMMIT`.
3. Create payment (idempotency key = booking id) → webhook → `UPDATE bookings SET status='confirmed' WHERE id=$1 AND status='held'`.
4. Sweeper: expired holds → cancel + `booked = booked - 1` in one transaction.

### Strategies compared

| Strategy | Pros | Cons |
|---|---|---|
| Atomic conditional UPDATE | simple, short lock | counter must be maintained carefully |
| `SELECT … FOR UPDATE` + count | flexible logic | longer lock if logic is slow |
| Per-seat rows + unique constraint | natural for assigned seats | more rows; seat selection UX |
| SERIALIZABLE + retry | general | retries under contention |

### Scale and failure

Reads via cache/replicas/search index; sold-out flag cached; notifications via outbox; payment provider outage → holds expire, clear errors; waiting room for launches.

## Worked examples

The **booking system design lab** walks through these steps with written deliverables; use this lesson as the reference answer after attempting it yourself.

## Common misconceptions

- **"Check availability in the app, then insert."** — Race condition.
- **"Use a distributed lock in Redis."** — The DB already provides the needed atomicity.
- **"Scale by sharding immediately."** — Contention is per class; sharding doesn't fix a hot row.

## Practical exercises

1. Complete the **booking system design lab**.
2. Prototype the schema and run 50 concurrent booking attempts against a class with capacity 10 (e.g. with `pgbench` or a script); verify exactly 10 succeed.
