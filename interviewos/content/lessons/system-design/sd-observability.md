---
slug: sd-observability
title: Observability in system design
path: system-design
module: sd-building-blocks
order: 6
minutes: 25
depth: concise
practice: conceptual
summary: What to monitor in a design interview answer — SLIs per critical flow, key business and system metrics, tracing across async boundaries, and alerting.
prerequisites: [observability]
problems: []
objectives:
  - Propose SLIs/SLOs for the critical flows of a design
  - Name the key metrics for each component (API, queue, DB, cache)
  - Explain tracing across asynchronous boundaries
readings:
  - title: "Google SRE Book — The four golden signals"
    url: https://sre.google/sre-book/monitoring-distributed-systems/
    kind: book
  - title: "OpenTelemetry — Context propagation"
    url: https://opentelemetry.io/docs/concepts/context-propagation/
    kind: docs
interview:
  - q: "How would you monitor the system you just designed?"
    a: "SLOs on the critical user flows (e.g. booking success rate and latency), golden signals per service (latency, traffic, errors, saturation), component metrics (queue lag/age, DB connections and replication lag, cache hit ratio), business metrics (bookings/min), distributed tracing with ids propagated through queues, and burn-rate alerts."
  - q: "Why monitor business metrics such as bookings per minute in addition to technical ones?"
    a: "Some failures don't produce errors or latency — a broken button, a silently failing payment webhook, an empty search index. A sudden drop in bookings per minute compared with the usual pattern catches these user-visible failures."
selfAssessment:
  - I can add a monitoring section to any design in 2 minutes
  - I can name the key metric for each component type (API, queue, DB, cache)
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "The four golden signals are:"
    options: ["CPU, RAM, disk, network", "Latency, traffic, errors, saturation", "Logs, metrics, traces, events", "p50, p90, p99, max"]
    answer: 1
    why: "From the Google SRE book."
  - q: "For an async queue the most useful health metric is often:"
    options: ["Message size", "Age of the oldest unprocessed message / consumer lag", "Number of topics", "Producer CPU"]
    answer: 1
    why: "Lag directly reflects user-visible delay."
  - q: "To trace a request through a queue, you:"
    options: ["Can't", "Propagate trace context in message headers/metadata", "Use only logs", "Make it synchronous"]
    answer: 1
    why: "Span links connect producer and consumer spans."
explain:
  prompt: "Add an observability section to a notification system design."
  rubric:
    - "SLIs: delivery latency, success rate per channel"
    - "Queue lag/age, DLQ size, provider error rates"
    - "Tracing with context in messages; correlation ids"
    - "Alerts tied to SLO burn and provider outages"
  model: "The main SLIs are end-to-end delivery latency from event to provider acceptance, and delivery success rate per channel; I'd set SLOs such as 99% of transactional notifications accepted by the provider within 30 seconds. Per component I'd track queue lag and oldest-message age, DLQ size, worker throughput and provider error rates and latency, plus business counts per notification type. Trace context travels in message metadata so a trace links the triggering request to the worker's provider call. Alerts fire on SLO burn rate and on provider error spikes, which also drive automated failover to a backup provider."
cards:
  - q: "Golden signals"
    a: "Latency, traffic, errors, saturation."
  - q: "Key queue health metric"
    a: "Age of the oldest unprocessed message / consumer lag (plus DLQ size)."
---

## Explanation

In a design interview, spend one or two minutes on observability:

1. **SLIs/SLOs** for critical flows (availability, latency, freshness).
2. **Golden signals** per service; **USE** for resources.
3. **Component metrics**: queue lag/age and DLQ, DB replication lag/connections/slow queries, cache hit ratio/evictions, external provider error rates.
4. **Tracing** end-to-end, including async hops (context in message headers).
5. **Alerting**: burn-rate on SLOs; dashboards per flow; runbooks.
6. **Audit logs** for security-relevant actions.

## Worked examples

Booking platform: SLI "booking requests that succeed or fail with a correct business error (e.g. class full) within 1 s"; queue age for confirmation emails; replication lag for read replicas; hold-expiry sweeper lag; payment provider error rate.

## Common misconceptions

- **"Monitoring is an afterthought."** — Interviewers value designs that are operable.

## Practical exercises

1. Add an observability section to each case study you practise.
