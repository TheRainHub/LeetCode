---
slug: sd-data-caching
title: Data storage, replication, partitioning and caching
path: system-design
module: sd-building-blocks
order: 1
minutes: 50
depth: full
practice: conceptual
summary: Scaling the data tier — read replicas and replication lag, sharding strategies and hot partitions, caching layers, and object storage + CDN for blobs.
prerequisites: [sd-api-design, caching]
problems: []
objectives:
  - Explain leader-follower replication, replication lag and read-your-writes
  - Choose a partitioning strategy (range, hash, consistent hashing) and handle hot keys
  - Place caches and CDNs in a design and reason about consistency
readings:
  - title: "Designing Data-Intensive Applications — Ch. 5 Replication, Ch. 6 Partitioning"
    url: https://dataintensive.net/
    kind: book
  - title: "PostgreSQL docs — High availability, load balancing, and replication"
    url: https://www.postgresql.org/docs/current/high-availability.html
    kind: docs
  - title: "Amazon DynamoDB paper (2022) — USENIX ATC"
    url: https://www.usenix.org/conference/atc22/presentation/elhemali
    kind: paper
interview:
  - q: "A user updates their profile and immediately sees the old version. Why, and how do you fix it?"
    a: "Reads went to an asynchronous replica that hadn't applied the write yet (replication lag). Fixes: read-your-writes — route the user's reads to the leader for a short window after a write, or read from a replica only if its replayed position ≥ the write's LSN, or use sticky sessions."
  - q: "How do you shard a users table, and what problems does sharding introduce?"
    a: "Hash of user id (even distribution) or a directory/range scheme. Problems: cross-shard queries and transactions, rebalancing when adding shards (consistent hashing or many virtual shards helps), hot shards for celebrity keys, and operational complexity. Shard only when vertical scaling, replicas and caching aren't enough."
selfAssessment:
  - I can explain replication lag and its fixes
  - I can compare range and hash partitioning
  - I know when sharding is premature
completion:
  - Score at least 70% on the quiz
  - Explain scaling a database in interview mode
quiz:
  - q: "Read replicas primarily scale:"
    options: ["Writes", "Reads (and provide failover candidates)", "Storage per row", "Transactions"]
    answer: 1
    why: "All writes still go to the leader."
  - q: "Consistent hashing helps by:"
    options: ["Encrypting keys", "Moving only ~1/N of keys when a node is added or removed", "Guaranteeing order", "Removing replication"]
    answer: 1
    why: "Naive hash mod N remaps almost everything."
  - q: "Range partitioning by timestamp risks:"
    options: ["Uneven random distribution", "A hot partition receiving all current writes", "No range queries", "Data loss"]
    answer: 1
    why: "Recent time ranges get all the traffic."
  - q: "User-uploaded images should usually be stored in:"
    options: ["The relational DB as BLOBs", "Object storage, served via CDN, with metadata in the DB", "Redis", "Kafka"]
    answer: 1
    why: "Cheap, durable and cacheable at the edge."
explain:
  prompt: "Your single PostgreSQL instance is reaching its limits. Explain, in order, what you would do to scale the data tier."
  rubric:
    - "Measure first: what's saturated, which queries"
    - "Optimise queries/indexes, connection pooling, vertical scaling"
    - "Caching and read replicas (handle lag); move blobs/analytics elsewhere"
    - "Partition tables; finally shard with a justified key, accepting the costs"
  model: "First I'd find out what's saturated — CPU, I/O, connections or locks — and which queries dominate, because often a few missing indexes or N+1 patterns are the problem. Then cheap wins: connection pooling with PgBouncer, query and index fixes, and a bigger instance. For read-heavy load I'd add a cache for hot data and read replicas, routing read-your-writes-sensitive reads to the primary because replicas lag. I'd move things that don't belong — images to object storage, analytics to a warehouse, large logs elsewhere — and use table partitioning for huge time-series tables. Only if write throughput or data size still exceed one primary would I shard, choosing a key that keeps most queries on one shard, such as tenant or user id, and accepting cross-shard query and rebalancing complexity."
cards:
  - q: "Read-your-writes options"
    a: "Read from leader after writes, LSN-aware replica reads, sticky sessions."
  - q: "Partitioning strategies"
    a: "Range (good for scans, hot spots), hash (even, no range scans), directory/consistent hashing (rebalancing)."
  - q: "Scale DB order"
    a: "Optimise → pool → vertical → cache/replicas → offload → partition → shard."
---

## Explanation

### Replication

- **Leader-follower**: writes to leader, async replicas serve reads → **replication lag**; sync replicas trade write latency for durability.
- **Multi-leader / leaderless** (Dynamo-style quorums: W + R > N) for multi-region writes, with conflict resolution.
- Failover: promote a replica; risk of losing un-replicated writes with async replication.

### Partitioning (sharding)

- **Hash** on key → even spread, no efficient range queries.
- **Range** → efficient scans, hot ranges.
- **Consistent hashing / many virtual shards** → easier rebalancing.
- Choose a key that keeps related data and common queries on one shard (tenant id for SaaS).
- **Hot keys**: split the key (suffixes), cache, or special-case celebrities.

### Caching layers

Client → CDN (static assets, cacheable API responses) → app cache (Redis) → DB buffer cache. Decide staleness per data type (see the Caching lesson).

### Blob storage

Object storage (S3/GCS) with pre-signed upload URLs; CDN in front; DB holds metadata only.

## Worked examples

**News feed reads**: 50k QPS reads on mostly-static data → CDN for public content + Redis for per-user feeds + replicas for misses; writes go to the leader. Users' own posts read from the leader for 30 s after posting to avoid "my post disappeared".

## Common misconceptions

- **"Shard early to be safe."** — Sharding is costly; exhaust simpler options first.
- **"Replicas are backups."** — Replicas replicate mistakes (DROP TABLE); keep real backups with point-in-time recovery.
- **"Caching solves write scaling."** — It mostly helps reads.

## Practical exercises

1. Choose shard keys for: a multi-tenant SaaS, a chat app, an analytics events table.
2. Design read-your-writes for a profile page with read replicas.
