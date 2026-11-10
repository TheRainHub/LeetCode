---
slug: message-queues
title: Message queues and asynchronous processing
path: backend
module: be-caching-messaging
order: 3
minutes: 50
depth: full
practice: conceptual
summary: Why and when to go async, delivery guarantees, acknowledgements, retries and dead-letter queues, ordering, backpressure and the transactional outbox.
prerequisites: [rest-api-design]
problems: []
objectives:
  - Decide when asynchronous processing is appropriate and what it costs
  - Explain at-most-once, at-least-once and effectively-once delivery, and why consumers must be idempotent
  - Design retries, dead-letter queues, ordering and backpressure
  - Publish events reliably with the transactional outbox pattern
readings:
  - title: "RabbitMQ — Consumer acknowledgements and publisher confirms"
    url: https://www.rabbitmq.com/docs/confirms
    kind: docs
  - title: "AWS — Amazon SQS dead-letter queues"
    url: https://docs.aws.amazon.com/AWSSimpleQueueService/latest/SQSDeveloperGuide/sqs-dead-letter-queues.html
    kind: docs
  - title: "microservices.io — Transactional outbox"
    url: https://microservices.io/patterns/data/transactional-outbox.html
    kind: article
interview:
  - q: "Why must consumers be idempotent?"
    a: "With at-least-once delivery, a message can be redelivered if the consumer crashes after doing the work but before acknowledging, or if the ack is lost. Idempotent handling (dedupe by message id, upserts, conditional updates) makes duplicates harmless."
  - q: "How do you publish an event when a DB row changes without losing or inventing events?"
    a: "Transactional outbox: in the same DB transaction as the business change, insert the event into an outbox table. A relay (poller or CDC like Debezium) publishes outbox rows to the broker and marks them sent. This avoids the dual-write problem; delivery is at-least-once so consumers dedupe."
  - q: "What do you do with messages that keep failing?"
    a: "Retry with exponential backoff and a max attempt count, then move to a dead-letter queue with the error context; alert on DLQ depth, fix, and replay. Distinguish transient errors (retry) from permanent ones (DLQ immediately)."
selfAssessment:
  - I can explain delivery guarantees and where duplicates come from
  - I can design a retry + DLQ policy
  - I can explain the outbox pattern and the dual-write problem
completion:
  - Score at least 70% on the quiz
  - Explain the outbox pattern in interview mode
quiz:
  - q: "A consumer processes a message and crashes before acking. With at-least-once delivery:"
    options: ["The message is lost", "The message is redelivered — possibly causing a duplicate effect", "The broker deletes it", "The producer is notified"]
    answer: 1
    why: "Hence idempotent consumers."
  - q: "The dual-write problem is:"
    options: ["Writing twice to the same table", "Updating the DB and publishing to a broker non-atomically, so one can succeed while the other fails", "Replication lag", "Two consumers"]
    answer: 1
    why: "The outbox pattern turns it into one local transaction."
  - q: "Backpressure means:"
    options: ["Retrying faster", "Slowing producers or bounding queues when consumers can't keep up", "Compressing messages", "Using more partitions only"]
    answer: 1
    why: "Unbounded queues hide overload until memory or latency explodes."
  - q: "Strict global ordering across many parallel consumers:"
    options: ["Is free", "Conflicts with parallelism — usually order only per key (partition/message group)", "Is guaranteed by every queue", "Requires UDP"]
    answer: 1
    why: "Per-entity ordering is usually what matters."
explain:
  prompt: "Design the asynchronous email-sending part of a sign-up flow, including failure handling."
  rubric:
    - "Sign-up commits user and outbox/enqueue reliably; request returns without waiting for email"
    - "Worker consumes with acks; retries with backoff; DLQ"
    - "Idempotency (dedupe key) so duplicates don't send twice"
    - "Monitoring: queue depth, age of oldest message, DLQ alerts"
  model: "When a user signs up I insert the user and a 'send welcome email' outbox row in one transaction, then return 201 immediately so sign-up latency doesn't depend on the email provider. A relay publishes outbox rows to a queue. Email workers consume messages, call the provider and ack only after success. Transient failures like timeouts or 5xx are retried with exponential backoff and jitter; after, say, eight attempts or on permanent errors like an invalid address the message goes to a dead-letter queue with the error. Because delivery is at-least-once, I store a send record keyed by the message id or user id plus template so a redelivered message doesn't send a second email. I'd alert on queue depth, the age of the oldest message and DLQ growth."
cards:
  - q: "Delivery guarantees"
    a: "At-most-once (may lose), at-least-once (may duplicate), effectively-once = at-least-once + idempotent processing."
  - q: "Transactional outbox"
    a: "Write event to outbox table in the same transaction; relay publishes it later."
  - q: "Dead-letter queue (DLQ)"
    a: "Where messages go after max retries/permanent failure; alert, inspect, replay."
---

## Explanation

### Why go async

- Decouple slow or unreliable work from the request path (emails, thumbnails, webhooks, LLM jobs).
- Smooth load spikes (queue as a buffer), scale consumers independently.
- Costs: eventual consistency, harder debugging and tracing, duplicate handling, operational overhead.

### Queues vs logs

- **Queue** (RabbitMQ, SQS): messages are consumed and removed; competing consumers.
- **Log** (Kafka): messages retained, consumers track offsets, replay possible (see Kafka lesson).

### Delivery semantics

Ack after processing → **at-least-once**. Ack before processing → **at-most-once**. **Exactly-once processing** is achieved end-to-end with idempotency or transactional sinks, not by the broker alone.

### Retries and DLQ

Visibility timeout / redelivery, exponential backoff with jitter, max attempts, DLQ. Poison messages must not block the queue forever.

### Ordering

Most systems order per partition/group key. Retrying a message out of band can reorder; design handlers to tolerate it (versions, timestamps) where possible.

### Backpressure

Bounded queues, consumer concurrency limits, producer rate limits, shedding non-critical work. Monitor **lag/age**, not just depth.

## Worked examples

### Outbox table

```sql
CREATE TABLE outbox (
  id bigserial PRIMARY KEY,
  aggregate_id text NOT NULL,
  type text NOT NULL,
  payload jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  published_at timestamptz
);
-- relay
SELECT * FROM outbox WHERE published_at IS NULL ORDER BY id FOR UPDATE SKIP LOCKED LIMIT 100;
```

### Idempotent consumer

```sql
INSERT INTO processed_messages(message_id) VALUES ($1) ON CONFLICT DO NOTHING RETURNING message_id;
-- if no row returned → already processed; skip. Do this in the same transaction as the side effect.
```

## Common misconceptions

- **"The broker guarantees exactly-once, so I don't need idempotency."** — End-to-end effects still duplicate.
- **"Queues make the system faster."** — They improve responsiveness and resilience, not total work.
- **"Retry immediately and forever."** — Use backoff, limits and DLQs.

## Practical exercises

1. Draw the failure timeline where an email is sent twice, then fix it with a dedupe table.
2. Design the outbox relay for the **booking platform** case study (booking confirmed → notification).
