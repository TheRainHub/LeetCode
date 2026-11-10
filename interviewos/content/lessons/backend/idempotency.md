---
slug: idempotency
title: Idempotency
path: backend
module: be-reliability
order: 1
minutes: 40
depth: full
practice: conceptual
summary: Why retries create duplicates, idempotent HTTP methods, idempotency keys for POST, deduplication in consumers, and the storage design behind them.
prerequisites: [rest-api-design, transactions-isolation]
problems: []
objectives:
  - Explain which HTTP methods are idempotent and why that matters for retries
  - Implement idempotency keys for non-idempotent operations (payments, bookings)
  - Make message consumers and background jobs safe to run twice
readings:
  - title: "Stripe API — Idempotent requests"
    url: https://docs.stripe.com/api/idempotent_requests
    kind: docs
  - title: "Stripe engineering — Designing robust and predictable APIs with idempotency"
    url: https://stripe.com/blog/idempotency
    kind: article
  - title: "IETF draft — The Idempotency-Key HTTP header field"
    url: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
    kind: rfc
interview:
  - q: "Explain idempotency and why it matters in distributed systems."
    a: "An operation is idempotent if doing it multiple times has the same effect as once. Networks fail ambiguously — a timeout doesn't tell the client whether the server did the work — so clients and queues retry, and without idempotency retries create duplicate charges, bookings or emails."
  - q: "How would you implement an Idempotency-Key for POST /payments?"
    a: "Client generates a unique key per logical operation. The server, in a transaction, inserts (key, user, request hash, status=in_progress) with a unique constraint; if it already exists, return the stored response (or 409 if still in progress, 422 if the payload differs). After processing, store the response. Keys expire after e.g. 24 h."
  - q: "Is DELETE idempotent if the second call returns 404?"
    a: "Yes — idempotency is about the server state effect, not the response code. After the first call the resource is gone; further calls don't change state."
selfAssessment:
  - I can design the idempotency-key table and flow
  - I can make a consumer idempotent with a dedupe table or upsert
completion:
  - Score at least 70% on the quiz
  - Explain idempotency keys in interview mode
quiz:
  - q: "Which methods are idempotent by HTTP semantics?"
    options: ["POST and PATCH", "GET, PUT, DELETE (and HEAD, OPTIONS)", "Only GET", "All methods"]
    answer: 1
    why: "PATCH may or may not be, depending on the patch format."
  - q: "The same Idempotency-Key arrives with a different request body. Best response:"
    options: ["Process it as new", "Reject it (e.g. 422) because the key is being reused for a different operation", "Return 200 with the old response silently", "Delete the old record"]
    answer: 1
    why: "Store a request fingerprint and compare."
  - q: "A safe way to make 'add 10 credits' idempotent is:"
    options: ["UPDATE balance = balance + 10", "Record the operation id in a ledger table with a unique constraint and derive the balance from it", "Retry less", "Use a cache"]
    answer: 1
    why: "Duplicate operation ids are rejected by the constraint."
explain:
  prompt: "A mobile client times out while booking a class and retries. Explain how you ensure the user is booked exactly once."
  rubric:
    - "Explains ambiguous failure: server may have succeeded"
    - "Idempotency key generated per booking attempt, stored with unique constraint and response"
    - "Handles concurrent duplicates (in-progress state) and payload mismatch"
    - "Natural uniqueness constraint (class_id, user_id) as a second safeguard"
  model: "A timeout is ambiguous: the server may have created the booking and only the response was lost. So the client generates an idempotency key when the user taps 'book' and reuses it for every retry. On the server, I insert the key with the user id and a hash of the request in the same transaction as the booking; a unique constraint means a retry either finds a completed record and gets the original 201 response back, or finds it in progress and gets a 409 telling it to retry shortly. If the same key comes with a different payload I reject it. As a second line of defence the bookings table has a unique constraint on class and user, which encodes the business rule that a user can't book the same class twice. Keys expire after a day."
cards:
  - q: "Idempotent operation"
    a: "Repeating it has the same effect on server state as doing it once."
  - q: "Idempotency key storage"
    a: "(key, user) unique, request hash, status, stored response, expiry."
---

## Explanation

### Why it matters

Timeouts and dropped connections are **ambiguous**: did the server process the request? Clients, load balancers, SDKs and queues retry. Safe retries require idempotent operations.

### HTTP semantics

- **Safe**: GET, HEAD, OPTIONS (no state change).
- **Idempotent**: safe methods + PUT, DELETE.
- **Not idempotent**: POST (creates), often PATCH (`increment` patches).

### Idempotency keys

```text
POST /payments
Idempotency-Key: 6f1c…   (client-generated UUID per logical operation)
```

Server flow:
1. `INSERT INTO idempotency_keys (user_id, key, request_hash, status) VALUES (…,'in_progress')` — unique `(user_id, key)`.
2. Conflict → if `completed` return stored status+body; if `in_progress` return 409 / retry-after; if hash differs → 422.
3. Do the work (in the same DB transaction when possible); store the response; mark completed.
4. Expire old keys.

When the work calls an external system (payment provider), pass the key along — most providers support their own idempotency keys.

### Natural idempotency

Often you can design operations to be idempotent: `PUT /users/42/avatar`, `UPSERT`, "set status to shipped" rather than "advance status", ledger entries with unique operation ids.

### Consumers and jobs

Dedupe table keyed by message id (in the same transaction as the effect), conditional updates (`WHERE status = 'pending'`), or upserts.

## Worked examples

```sql
CREATE TABLE idempotency_keys (
  user_id bigint NOT NULL,
  key text NOT NULL,
  request_hash text NOT NULL,
  status text NOT NULL CHECK (status IN ('in_progress','completed')),
  response_status int,
  response_body jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, key)
);
```

## Common misconceptions

- **"Retries are safe if the server is reliable."** — Networks fail even if the server doesn't.
- **"Idempotency = same response every time."** — It's about the effect; responses may differ.
- **"A unique request id in logs is enough."** — It must be enforced by storage.

## Practical exercises

1. Implement idempotency-key middleware for a POST endpoint and test two concurrent identical requests.
2. Identify which operations in the booking case study need idempotency keys.
