---
slug: kafka
title: Kafka and event streaming
path: backend
module: be-caching-messaging
order: 4
minutes: 40
depth: concise
practice: conceptual
summary: Topics, partitions, offsets and consumer groups — how Kafka scales, orders and retains events, and when it's the wrong tool.
prerequisites: [message-queues]
problems: []
objectives:
  - Explain topics, partitions, keys, offsets, replication and consumer groups
  - Reason about ordering, parallelism and rebalancing
  - Compare Kafka with a traditional queue and choose appropriately
readings:
  - title: "Apache Kafka — Documentation (Introduction and design)"
    url: https://kafka.apache.org/documentation/
    kind: docs
  - title: "Confluent — Kafka message delivery semantics"
    url: https://docs.confluent.io/kafka/design/delivery-semantics.html
    kind: docs
interview:
  - q: "How does Kafka guarantee ordering?"
    a: "Only within a partition. Messages with the same key go to the same partition, so per-key order holds. Parallelism is bounded by partition count; one partition is consumed by at most one consumer in a group."
  - q: "Kafka vs RabbitMQ/SQS?"
    a: "Kafka is a durable, replayable, partitioned log with high throughput — good for event streams, multiple independent consumers, reprocessing and CDC. Classic queues are better for task distribution with per-message acks, priorities, delays and simple routing, with less operational weight."
selfAssessment:
  - I can explain consumer groups and partition assignment
  - I know what acks=all and min.insync.replicas do
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "A topic has 6 partitions and a consumer group has 10 consumers. How many are active?"
    options: ["10", "6 — extra consumers sit idle", "1", "60"]
    answer: 1
    why: "A partition is assigned to one consumer per group."
  - q: "Consumers track progress by:"
    options: ["Deleting messages", "Committing offsets per partition", "Acking each message to the producer", "Timestamps only"]
    answer: 1
    why: "Messages stay until retention expires; offsets mark progress."
  - q: "To avoid losing acknowledged writes when a broker fails, producers use:"
    options: ["acks=0", "acks=all with min.insync.replicas ≥ 2 and replication factor 3", "One partition", "Compression"]
    answer: 1
    why: "The write is acknowledged only after in-sync replicas have it."
explain:
  prompt: "Explain how Kafka scales consumption while preserving order for each customer's events."
  rubric:
    - "Partitioning by key (customer id) → per-customer ordering"
    - "Consumer group assigns partitions to consumers; parallelism ≤ partitions"
    - "Offsets committed after processing → at-least-once; idempotent consumer"
    - "Rebalancing and hot partitions"
  model: "Events are produced with the customer id as the key, so all of one customer's events land in the same partition, where Kafka preserves order. A consumer group spreads the partitions across consumers, so throughput scales with the number of partitions while each partition — and therefore each customer — is processed by one consumer at a time in order. Consumers commit offsets after processing, which is at-least-once, so processing must be idempotent. Adding consumers triggers a rebalance that pauses processing briefly. Skewed keys can create hot partitions; then I'd consider finer keys if strict per-customer ordering isn't required."
cards:
  - q: "Kafka ordering"
    a: "Per partition only; same key → same partition."
  - q: "Max consumer parallelism in a group"
    a: "Number of partitions."
---

## Explanation

- **Topic** split into **partitions** (append-only logs). Records have key, value, offset.
- **Producer** chooses partition by key hash; `acks=all` + idempotent producer for durability without duplicates from retries.
- **Replication**: leader + followers; ISR (in-sync replicas); `min.insync.replicas`.
- **Consumer groups**: each partition assigned to one consumer in the group; different groups read independently (fan-out).
- **Retention** by time/size, or **log compaction** keeps the latest value per key (good for state/changelogs).
- **Rebalancing** when consumers join/leave; cooperative rebalancing reduces pauses.

### Typical uses

Event-driven microservices, CDC pipelines (Debezium), activity tracking, stream processing (Kafka Streams/Flink), audit logs with replay.

### When not to use it

Simple background jobs, low volume, need for per-message delays/priorities, small team without ops capacity — a queue or Postgres-based jobs table is simpler.

## Worked examples

```text
topic: booking-events (12 partitions, RF=3)
key = bookingId  → all events for one booking in order (created → paid → cancelled)
consumer groups: notifications, analytics, search-indexer — each gets every event independently
```

## Common misconceptions

- **"Kafka gives global ordering."** — Only per partition.
- **"More consumers always means more throughput."** — Capped by partitions.
- **"Kafka deletes messages when consumed."** — Retention is independent of consumption.

## Practical exercises

1. Choose partition keys for: order events, page views, chat messages. Explain the ordering you get.
2. Explain what happens to in-flight messages during a consumer crash and offset commit timing.
