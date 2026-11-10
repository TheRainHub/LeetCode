---
slug: sd-api-design
title: API and data model design in system design
path: system-design
module: sd-method
order: 3
minutes: 35
depth: concise
practice: conceptual
summary: Designing the API surface and data model from access patterns — choosing SQL vs NoSQL, keys and indexes, and communication styles (REST, gRPC, WebSockets, webhooks).
prerequisites: [sd-requirements, rest-api-design]
problems: []
objectives:
  - Derive APIs and the data model from the main use cases and access patterns
  - Choose between relational and NoSQL stores with justified trade-offs
  - Pick synchronous vs asynchronous and push vs pull communication styles
readings:
  - title: "Designing Data-Intensive Applications — Ch. 2 Data models (Kleppmann)"
    url: https://dataintensive.net/
    kind: book
  - title: "gRPC — Introduction"
    url: https://grpc.io/docs/what-is-grpc/introduction/
    kind: docs
  - title: "MDN — WebSockets API"
    url: https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API
    kind: docs
interview:
  - q: "SQL or NoSQL for this system?"
    a: "Start from access patterns and consistency needs. Relational (PostgreSQL) for relationships, transactions and ad-hoc queries — a strong default. Key-value/wide-column (DynamoDB, Cassandra) for massive scale with known key-based access and simple queries. Document stores for flexible nested documents. Justify with the workload, not fashion."
  - q: "How would clients get real-time updates?"
    a: "Short polling (simple, wasteful), long polling, Server-Sent Events (server → client, HTTP, auto-reconnect), or WebSockets (bidirectional). For mobile background notifications use push services. Choose by direction, frequency and infrastructure."
selfAssessment:
  - I can write an API and schema for a design prompt in 5 minutes
  - I can justify a storage choice from access patterns
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Partition key for a chat messages table queried by conversation and time:"
    options: ["message_id", "conversation_id (with time as clustering/sort key)", "user_id only", "timestamp"]
    answer: 1
    why: "Keeps a conversation's messages together and ordered."
  - q: "Server-Sent Events are suited for:"
    options: ["Bidirectional gaming traffic", "One-way server-to-client streams such as notifications or LLM token streaming", "File uploads", "Database replication"]
    answer: 1
    why: "Simple HTTP streaming with reconnection."
  - q: "Webhooks are:"
    options: ["Client polling", "Server-to-server HTTP callbacks when events happen — need signatures, retries and idempotency", "WebSockets", "A database feature"]
    answer: 1
    why: "Receivers must verify signatures and dedupe."
explain:
  prompt: "Given a prompt like 'design a class booking platform', explain how you'd derive its API and data model."
  rubric:
    - "List core use cases and access patterns first"
    - "Entities and relationships; constraints enforcing invariants"
    - "Endpoints mapping to use cases with pagination and idempotency"
    - "Storage choice justified (relational for transactions)"
  model: "I'd list the use cases — search classes by studio, time and location; view a class; book; cancel; list my bookings — and their access patterns: searches are read-heavy and filterable, bookings need transactions. That gives entities studios, classes with capacity and start time, users, and bookings with status, plus constraints: bookings unique per class and user, seat count never exceeding capacity. The API follows the use cases: GET /classes with filters and cursor pagination, GET /classes/{id}, POST /classes/{id}/bookings with an idempotency key, DELETE /bookings/{id}, GET /me/bookings. Because the core invariant is transactional and the data is relational, PostgreSQL is the natural store, with indexes on (studio_id, starts_at) and a search index later if needed."
cards:
  - q: "Design data model from"
    a: "Access patterns + invariants + consistency requirements."
  - q: "Real-time options"
    a: "Polling, long polling, SSE (one-way), WebSockets (two-way), push notifications."
---

## Explanation

### From use cases to API

For each core use case write the endpoint (method, path, request, response), pagination, auth and idempotency. Keep it to the critical 4–6 endpoints.

### Data model

- Entities, relationships, cardinalities; **invariants as constraints** (unique, check, foreign keys).
- Indexes from access patterns.
- For NoSQL: design keys from queries (partition key for distribution, sort key for ordering), denormalise for reads.

### Storage choice

| Need | Good fit |
|---|---|
| Transactions, joins, ad-hoc queries | PostgreSQL/MySQL |
| Huge key-based scale, predictable queries | DynamoDB / Cassandra |
| Caching, counters, ephemeral data | Redis |
| Full-text search | Elasticsearch/OpenSearch, Postgres FTS for small |
| Blobs (images, files) | object storage (S3) + CDN |
| Analytics | column store (ClickHouse, BigQuery) |

### Communication styles

REST/JSON for public APIs, gRPC for internal low-latency typed calls, async events/queues for decoupling, SSE/WebSockets for real-time, webhooks for third parties.

## Worked examples

```text
POST /classes/{id}/bookings   Idempotency-Key  → 201 {bookingId, status}
GET  /classes?studio=…&from=…&after=<cursor>   → {items, nextCursor}

bookings(id PK, class_id FK, user_id FK, status, created_at,
         UNIQUE(class_id, user_id))
classes(id PK, studio_id FK, starts_at, capacity, booked CHECK (booked <= capacity))
```

## Common misconceptions

- **"NoSQL scales, SQL doesn't."** — Postgres handles large workloads; scaling strategies exist for both.
- **"Design the schema first, then queries."** — Queries/access patterns drive the schema.

## Practical exercises

1. Write the API and schema for the URL shortener and notification system case studies.
2. Redesign the chat messages table for a key-value store.
