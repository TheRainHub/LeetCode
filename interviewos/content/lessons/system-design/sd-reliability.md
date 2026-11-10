---
slug: sd-reliability
title: Reliability and availability
path: system-design
module: sd-building-blocks
order: 4
minutes: 40
depth: concise
practice: conceptual
summary: Availability math, redundancy and failover, graceful degradation, blast-radius reduction, backups and disaster recovery (RPO/RTO).
prerequisites: [retries-backoff]
problems: []
objectives:
  - Compute availability of serial and redundant components and relate it to SLOs
  - Remove single points of failure with redundancy and failover
  - Plan degradation, blast-radius limits and disaster recovery (RPO/RTO)
readings:
  - title: "Google SRE Book — Embracing risk"
    url: https://sre.google/sre-book/embracing-risk/
    kind: book
  - title: "AWS Well-Architected — Reliability pillar"
    url: https://docs.aws.amazon.com/wellarchitected/latest/reliability-pillar/welcome.html
    kind: docs
  - title: "AWS Builders' Library — Static stability using Availability Zones"
    url: https://aws.amazon.com/builders-library/static-stability-using-availability-zones/
    kind: article
interview:
  - q: "Two services each with 99.9% availability are called in series. What's the combined availability?"
    a: "0.999 × 0.999 ≈ 99.8% — dependencies in series reduce availability. Two redundant replicas in parallel (either works) give 1 − 0.001² = 99.9999% if failures are independent."
  - q: "What are RPO and RTO?"
    a: "Recovery Point Objective: how much data loss is acceptable (time since the last recoverable point). Recovery Time Objective: how long restoration may take. They drive backup frequency, replication mode and failover automation."
selfAssessment:
  - I can compute availability for serial/parallel dependencies
  - I can describe graceful degradation for a design
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "99.99% availability allows about how much downtime per year?"
    options: ["8.8 hours", "~52 minutes", "~5 minutes", "~3.6 days"]
    answer: 1
    why: "99.9% ≈ 8.8 h, 99.99% ≈ 52.6 min, 99.999% ≈ 5.3 min."
  - q: "Graceful degradation means:"
    options: ["Failing everything", "Keeping core functionality working with reduced features when a dependency fails", "Restarting servers", "Lower quality images only"]
    answer: 1
    why: "E.g. show bookings without recommendations if the recommender is down."
  - q: "Cell-based architecture primarily reduces:"
    options: ["Cost", "Blast radius — a failure affects only one cell's customers", "Latency", "Code size"]
    answer: 1
    why: "Independent stacks per customer subset."
explain:
  prompt: "Explain how you'd make the booking platform highly available, including what happens when dependencies fail."
  rubric:
    - "Redundancy across zones for stateless services and DB (replica + automated failover)"
    - "Identify critical path vs optional dependencies; degrade gracefully"
    - "Timeouts, circuit breakers, queues to absorb provider outages"
    - "Backups, RPO/RTO, tested restores; monitoring and runbooks"
  model: "Stateless API instances run in at least two availability zones behind a load balancer. PostgreSQL has a synchronous or low-lag standby in another zone with automated failover, plus point-in-time backups with tested restores to meet the RPO and RTO we agree on. I'd separate the critical path — viewing classes and booking — from optional features like recommendations and emails, which are called with timeouts and circuit breakers or moved to queues, so their failure doesn't block bookings. If the payment provider is down, bookings could be held pending payment briefly and confirmed later, or we show a clear error. SLO-based alerts, runbooks and regular failover drills make sure this actually works."
cards:
  - q: "Availability downtime per year"
    a: "99.9% ≈ 8.8 h; 99.99% ≈ 53 min; 99.999% ≈ 5 min."
  - q: "RPO vs RTO"
    a: "RPO = acceptable data loss window; RTO = acceptable recovery time."
---

## Explanation

- **Availability math**: serial dependencies multiply (lower); redundant ones (independent) increase availability.
- **Redundancy**: N+1 instances, multi-AZ, replicas with automated failover; avoid single points of failure (one DB, one NAT, one region, one person).
- **Degradation**: classify dependencies as critical vs optional; fallbacks, cached data, feature flags as kill switches.
- **Blast radius**: cells/shards, gradual rollouts, per-tenant limits, bulkheads.
- **Static stability**: keep working without needing to make changes during a failure (pre-provisioned capacity).
- **DR**: backups (tested restores!), cross-region replication, RPO/RTO targets, runbooks, game days.

## Worked examples

API → auth service (99.95%) → DB (99.95%) in series ≈ 99.9%. Caching auth tokens locally (verify JWT signatures without calling the auth service) removes a serial dependency from the hot path.

## Common misconceptions

- **"Replication = backup."** — Logical errors replicate instantly.
- **"Five nines everywhere."** — Each nine costs a lot; match SLOs to user needs.
- **"Failover is automatic, so it works."** — Untested failover often fails.

## Practical exercises

1. Compute end-to-end availability for one of your projects' request paths.
2. Write RPO/RTO targets and a backup plan for the booking platform.
