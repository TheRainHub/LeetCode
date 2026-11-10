---
slug: sd-consistency
title: Consistency models and distributed trade-offs
path: system-design
module: sd-building-blocks
order: 5
minutes: 45
depth: full
practice: conceptual
summary: Strong vs eventual consistency, CAP and PACELC in practice, quorums, consensus for leader election, and choosing per-operation consistency.
prerequisites: [transactions-isolation, sd-data-caching]
problems: []
objectives:
  - Explain linearizability, read-your-writes, monotonic reads and eventual consistency
  - Apply CAP/PACELC correctly and avoid the common misreadings
  - Choose consistency per operation and implement it (single leader, quorums, consensus, constraints)
readings:
  - title: "Designing Data-Intensive Applications — Ch. 9 Consistency and consensus"
    url: https://dataintensive.net/
    kind: book
  - title: "Jepsen — Consistency models"
    url: https://jepsen.io/consistency
    kind: article
  - title: "Raft consensus algorithm"
    url: https://raft.github.io/
    kind: docs
interview:
  - q: "Explain CAP in practical terms."
    a: "When a network partition happens, a replicated system must choose between consistency (refuse or delay some requests so no one sees stale/conflicting data) and availability (keep serving, accepting possible inconsistency). Without partitions you trade latency vs consistency (PACELC). It's a per-operation choice, not a database label."
  - q: "Which operations in a booking system need strong consistency?"
    a: "Seat inventory/booking creation and payments — overbooking or double charging is unacceptable. Search results, class listings, recommendations and review counts can be eventually consistent."
  - q: "What is a quorum?"
    a: "In leaderless replication with N replicas, a write waits for W acks and a read queries R replicas; if W + R > N the read set overlaps the latest write set, so reads can see the latest value (with caveats like sloppy quorums and concurrent writes)."
selfAssessment:
  - I can explain CAP without saying 'pick two'
  - I can choose per-operation consistency in a design
completion:
  - Score at least 70% on the quiz
  - Discuss consistency choices for the booking lab
quiz:
  - q: "Linearizability guarantees:"
    options: ["Eventual convergence", "Every operation appears to take effect atomically at a single point between its start and end, respecting real time", "Serializable transactions", "No network partitions"]
    answer: 1
    why: "It's a single-object recency guarantee; serializability is about transactions."
  - q: "During a partition, a system that keeps accepting writes on both sides is choosing:"
    options: ["Consistency", "Availability (and must reconcile conflicts later)", "Neither", "Partition intolerance"]
    answer: 1
    why: "AP behaviour."
  - q: "Leader election and distributed locks that must be correct use:"
    options: ["Redis SETNX without fencing", "A consensus system (Raft/Paxos, e.g. etcd, ZooKeeper) plus fencing tokens", "Cron", "DNS"]
    answer: 1
    why: "Consensus tolerates failures while preserving safety."
explain:
  prompt: "Explain how you'd decide consistency requirements for different parts of a large booking platform."
  rubric:
    - "Enumerate operations and the cost of staleness for each"
    - "Strong for seats/payments via single-leader DB transactions/constraints"
    - "Eventual for search, listings, counters with bounded staleness"
    - "Mentions CAP/PACELC trade-offs and multi-region implications"
  model: "I'd list operations and ask what goes wrong if a user sees stale data. Creating a booking and charging must never double-sell or double-charge, so they go through a single-leader PostgreSQL database with transactions and constraints — strongly consistent, and during a partition we'd rather reject bookings than oversell. Search, class listings, ratings and popularity counts can lag by seconds or minutes, so they're served from caches, replicas or a search index updated asynchronously. A user's own bookings page should show their just-made booking, so I'd provide read-your-writes by reading from the primary right after booking. If we went multi-region, I'd keep each studio's inventory homed in one region to avoid cross-region consensus on every booking, accepting higher latency for distant users."
cards:
  - q: "CAP in one sentence"
    a: "During a partition choose consistency (reject/wait) or availability (serve, reconcile later)."
  - q: "PACELC"
    a: "If Partition: A vs C; Else: Latency vs Consistency."
  - q: "Quorum condition"
    a: "W + R > N for overlapping reads/writes."
---

## Explanation

### Consistency models (strongest → weaker)

- **Linearizable**: behaves like one copy; reads see the latest write.
- **Sequential / causal**: operations seen in an order consistent with causality.
- **Read-your-writes, monotonic reads**: session guarantees.
- **Eventual**: replicas converge if writes stop.

### CAP and PACELC

Partitions happen; the choice is what to do then. PACELC adds the everyday trade-off: lower latency vs stronger consistency even without partitions. Choose per operation.

### Mechanisms

- **Single leader** + transactions: simplest strong consistency for one region.
- **Quorums** (Dynamo-style): tunable W/R.
- **Consensus** (Raft/Paxos): replicated logs, leader election, config stores (etcd, ZooKeeper).
- **Conflict resolution** for AP systems: last-write-wins (loses data), version vectors, CRDTs.
- **Fencing tokens** to make locks safe.

## Worked examples

Shopping cart (AP-friendly): merge carts on conflict (union of items) — a duplicate item is better than an unavailable cart. Seat inventory (CP): single authoritative row per class; on partition from the DB, booking returns a clear error.

## Common misconceptions

- **"CAP means pick two of three."** — Partition tolerance isn't optional; it's C vs A during partitions.
- **"Eventual consistency means data is often wrong."** — Typically converges in milliseconds; the issue is guarantees.
- **"NoSQL = eventual, SQL = strong."** — Depends on configuration and usage.

## Practical exercises

1. For each operation in the **booking system design lab**, mark strong vs eventual and justify.
2. Explain why last-write-wins can lose a cart update with a concrete timeline.
