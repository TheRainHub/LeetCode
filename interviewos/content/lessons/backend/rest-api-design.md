---
slug: rest-api-design
title: REST API design
path: backend
module: be-apis
order: 1
minutes: 50
depth: full
practice: conceptual
summary: Resource modelling, methods and status codes, pagination, versioning, errors, idempotency and the API decisions interviewers probe.
prerequisites: [http-versions]
problems: []
objectives:
  - Model resources and relationships with consistent URLs and methods
  - Design pagination, filtering, error formats and versioning that age well
  - Make writes safe to retry and APIs safe to evolve (compatibility rules)
readings:
  - title: "RFC 9110 — HTTP Semantics (methods and status codes)"
    url: https://www.rfc-editor.org/rfc/rfc9110
    kind: rfc
  - title: "Microsoft REST API Guidelines"
    url: https://github.com/microsoft/api-guidelines
    kind: docs
  - title: "Google API Improvement Proposals (AIP)"
    url: https://google.aip.dev/
    kind: docs
  - title: "RFC 9457 — Problem Details for HTTP APIs"
    url: https://www.rfc-editor.org/rfc/rfc9457
    kind: rfc
interview:
  - q: "Offset vs cursor pagination?"
    a: "Offset (?page=10&size=20) is simple and allows jumping to pages but gets slow on large offsets (the DB scans skipped rows) and shifts when items are inserted. Cursor/keyset pagination (?after=<opaque id/sort key>) is stable and efficient with an index, but only supports next/previous."
  - q: "How do you evolve an API without breaking clients?"
    a: "Only make additive, backwards-compatible changes (new optional fields, new endpoints), never repurpose fields, make clients tolerant readers, deprecate with notice and telemetry on usage, and introduce a new version (URL or header) only for breaking changes."
  - q: "How do you design a 'create payment' endpoint that clients can safely retry?"
    a: "POST /payments with an Idempotency-Key header; the server stores the key with the request fingerprint and the resulting response, returning the same response for retries and 409/422 if the same key arrives with a different payload."
selfAssessment:
  - I can design endpoints for a small domain in 10 minutes
  - I can explain cursor pagination and why it's stable
  - I can list backwards-compatible vs breaking changes
completion:
  - Score at least 70% on the quiz
  - Explain pagination and versioning choices in interview mode
quiz:
  - q: "Which URL design is most conventional for a user's orders?"
    options: ["GET /getOrdersForUser?id=5", "GET /users/5/orders", "POST /orders/list", "GET /orders/user5"]
    answer: 1
    why: "Nouns for resources, hierarchy for ownership, methods for actions."
  - q: "Adding a new required field to a request body is:"
    options: ["Backwards compatible", "A breaking change for existing clients", "Fine if documented", "Only breaking for GET"]
    answer: 1
    why: "Old clients don't send it; make it optional with a default instead."
  - q: "A long-running export request should usually return:"
    options: ["200 after 5 minutes", "202 Accepted with a status resource to poll (or a webhook)", "500", "204"]
    answer: 1
    why: "Avoids proxy timeouts and blocked threads."
  - q: "Cursor pagination's cursor should be:"
    options: ["A page number", "Opaque to clients (e.g. encoded last sort key + id)", "The SQL query", "A timestamp only"]
    answer: 1
    why: "Opaque cursors let the server change implementation; include a tiebreaker for uniqueness."
explain:
  prompt: "Design the REST API for a simple booking service (resources, endpoints, pagination, errors, idempotency) and justify your choices."
  rubric:
    - "Resources and URLs (e.g. /classes, /classes/{id}/bookings, /bookings/{id}) with correct methods"
    - "Status codes: 201 + Location, 404, 409 for conflicts (e.g. full class), 422 validation"
    - "Pagination (cursor) and filtering"
    - "Idempotency-Key for POST /bookings"
    - "Consistent error format (problem details) and versioning/compatibility strategy"
  model: "Resources are classes and bookings. GET /classes?from=…&studio=… lists classes with cursor pagination — limit plus an opaque next cursor — because it stays stable as new classes are added. GET /classes/{id} for details. POST /classes/{id}/bookings creates a booking and returns 201 with a Location header pointing to /bookings/{id}; GET and DELETE on /bookings/{id} read and cancel. A full class returns 409 Conflict, invalid input 422, unknown ids 404, and errors use one format such as RFC 9457 problem details with a machine-readable type. Because clients retry on timeouts, POST requires an Idempotency-Key and the server returns the stored response for repeats. For evolution I'd make only additive changes, keep fields' meaning stable, and version only for breaking changes, with deprecation notices."
cards:
  - q: "Create response"
    a: "201 Created + Location header (+ body)."
  - q: "Offset vs cursor pagination"
    a: "Offset: simple, slow for deep pages, unstable. Cursor/keyset: stable, index-friendly."
  - q: "Non-breaking change examples"
    a: "New optional request fields, new response fields, new endpoints, new enum values only if clients tolerate unknowns."
---

## Explanation

### Resources and methods

- Nouns in URLs, plural collections: `/orders`, `/orders/{id}`, `/users/{id}/orders`.
- Methods carry the verb: `GET` read, `POST` create/process, `PUT` replace, `PATCH` partial update, `DELETE` remove.
- Actions that aren't CRUD: sub-resources (`POST /orders/{id}/cancellation`) or a clearly named action endpoint — be consistent.

### Status codes and errors

`200`, `201` + `Location`, `202` for async, `204` no body; `400` malformed, `401`/`403`, `404`, `409` conflict (state/uniqueness), `412` failed precondition (ETag mismatch), `422` validation, `429` rate limited; `5xx` server side. Use a single error format (e.g. RFC 9457 `application/problem+json` with `type`, `title`, `status`, `detail`, plus field errors).

### Collections

- **Pagination**: cursor/keyset for feeds and large tables (`?limit=50&after=eyJpZCI6…`), offset for small admin lists.
- **Filtering and sorting**: `?status=paid&sort=-createdAt`; whitelist fields to avoid arbitrary queries.
- **Sparse fields / expansion**: `?fields=id,name` or `?expand=customer` to control payloads.

### Concurrency and retries

- **Optimistic concurrency**: `ETag` on GET, `If-Match` on PUT/PATCH → `412` when stale (prevents lost updates).
- **Idempotency keys** for POST (payments, bookings) — see the Idempotency lesson.

### Evolution

Tolerant readers (ignore unknown fields), additive changes, deprecation headers and timelines, version only for breaking changes (`/v2/...` or a media type/header). Keep contract tests or an OpenAPI spec as the source of truth.

### Security basics

AuthN via OAuth2/OIDC bearer tokens or session cookies; AuthZ checks on every resource access (object-level authorization — the top API vulnerability); input validation; rate limiting; no secrets in URLs.

## Worked examples

### Keyset pagination query

```sql
SELECT id, created_at, total FROM orders
WHERE (created_at, id) < ($1, $2)          -- cursor from the last row of the previous page
ORDER BY created_at DESC, id DESC
LIMIT 50;
```
With an index on `(created_at DESC, id DESC)`, each page is an index range scan regardless of depth. The `id` tiebreaker guarantees a total order.

### Problem-details error

```json
{
  "type": "https://api.example.com/errors/class-full",
  "title": "Class is full",
  "status": 409,
  "detail": "Class 812 has no remaining seats.",
  "classId": 812
}
```

## Common misconceptions

- **"REST means CRUD over tables."** — Model the domain's resources and invariants, not the schema.
- **"Use 200 with an error flag."** — Status codes drive client, proxy and monitoring behaviour.
- **"Version every change."** — Version only for breaking changes; most evolution is additive.
- **"Authorization at the gateway is enough."** — Object-level checks must happen where data is accessed.

## Practical exercises

1. Design endpoints for the booking platform (see the System Design lab) and write the OpenAPI paths.
2. Implement keyset pagination on a table in the PostgreSQL lab and compare with OFFSET 100000.
3. List five changes to an API and classify each as breaking or non-breaking.
