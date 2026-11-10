---
slug: observability
title: Observability — logs, metrics, traces
path: backend
module: be-reliability
order: 3
minutes: 45
depth: full
practice: conceptual
summary: Structured logs, RED/USE metrics, distributed tracing with OpenTelemetry, SLIs/SLOs and alerting on symptoms — and how to debug a production incident with them.
prerequisites: []
problems: []
objectives:
  - Explain the role of logs, metrics and traces and when each answers a question best
  - Define SLIs and SLOs and alert on user-facing symptoms with error budgets
  - Instrument a service with structured logs, RED metrics and trace context propagation
readings:
  - title: "OpenTelemetry — Concepts"
    url: https://opentelemetry.io/docs/concepts/
    kind: docs
  - title: "Google SRE Book — Monitoring distributed systems"
    url: https://sre.google/sre-book/monitoring-distributed-systems/
    kind: book
  - title: "Google SRE Workbook — Implementing SLOs"
    url: https://sre.google/workbook/implementing-slos/
    kind: book
  - title: "Prometheus — Metric types"
    url: https://prometheus.io/docs/concepts/metric_types/
    kind: docs
interview:
  - q: "What's the difference between logs, metrics and traces?"
    a: "Metrics: cheap aggregated numbers over time (rates, latencies, saturation) for dashboards and alerts. Logs: detailed discrete events for debugging specifics. Traces: the path and timing of one request across services, showing where latency or errors occur. Correlate them via trace ids."
  - q: "What would you alert on?"
    a: "Symptoms users feel, tied to SLOs: error rate and latency (e.g. burn-rate alerts on the error budget), not every CPU spike. Causes like disk filling go to tickets or lower-urgency alerts unless they will imminently cause user impact."
  - q: "Why use percentiles instead of averages for latency?"
    a: "Averages hide the tail; p99 shows what the slowest 1% experience, and with many calls per page most users hit the tail somewhere. Percentiles can't be averaged across instances — use histograms."
selfAssessment:
  - I can define an SLO and compute an error budget
  - I can explain trace context propagation
  - I can describe how I'd debug a latency spike using these signals
completion:
  - Score at least 70% on the quiz
  - Explain an incident investigation in interview mode
quiz:
  - q: "An SLO of 99.9% successful requests per 30 days allows an error budget of:"
    options: ["0.9%", "0.1% of requests (≈43 minutes of total outage)", "1%", "None"]
    answer: 1
    why: "0.1% × 30 days ≈ 43.2 minutes."
  - q: "RED metrics for a service are:"
    options: ["Read, Execute, Delete", "Rate, Errors, Duration", "Redis, Elastic, Datadog", "Requests, Events, Disk"]
    answer: 1
    why: "USE (Utilization, Saturation, Errors) is for resources."
  - q: "High-cardinality labels (e.g. user id) on Prometheus metrics:"
    options: ["Are recommended", "Explode the number of time series — put them in logs/traces instead", "Improve accuracy", "Are required for SLOs"]
    answer: 1
    why: "Each unique label combination is a separate series."
explain:
  prompt: "p99 latency of your API doubled after a deploy. Walk through how you'd investigate using observability tools."
  rubric:
    - "Confirm via metrics: which endpoints, since when, correlation with deploy"
    - "Use traces to find which span/dependency got slower"
    - "Use logs (correlated by trace id) for specifics; check saturation (USE)"
    - "Mitigate first (rollback/flag off), then root cause and follow-up"
  model: "First I'd confirm the scope from metrics: which endpoints, which instances, and whether the change lines up with the deploy time. If user impact is significant I'd mitigate immediately — roll back or turn off the feature flag — and investigate after. Then I'd look at traces for slow requests to see which span grew: a new database query, an external call, or time spent in our own code. Logs filtered by those trace ids give details like query parameters or errors. I'd also check resource saturation — CPU, connection pool waits, GC — since a deploy can change memory behaviour. Finally I'd write up the root cause and add a regression check, such as a latency SLO alert or a performance test."
cards:
  - q: "SLI vs SLO vs SLA"
    a: "SLI = measurement; SLO = target for it; SLA = contract with consequences."
  - q: "RED vs USE"
    a: "RED (rate, errors, duration) for services; USE (utilization, saturation, errors) for resources."
  - q: "Trace context propagation"
    a: "Pass trace/span ids in headers (W3C traceparent) so spans join one trace."
---

## Explanation

### Three signals

| Signal | Good for | Cost |
|---|---|---|
| **Metrics** | trends, alerting, dashboards | cheap, low cardinality |
| **Logs** | specifics of one event | volume-heavy |
| **Traces** | where time goes across services | sampling needed |

Connect them: put `trace_id` in every log line; exemplars link metrics to traces.

### Structured logs

JSON with consistent fields (`level`, `msg`, `trace_id`, `user_id` hashed if sensitive, `route`, `duration_ms`). Never log secrets or raw personal data.

### Metrics

- **Counters** (requests, errors), **gauges** (queue depth), **histograms** (latency → percentiles).
- RED per endpoint, USE per resource; business metrics (bookings/min).

### Tracing

OpenTelemetry SDKs create spans; context propagates via `traceparent`. Sample (head- or tail-based) to control cost.

### SLOs and alerting

Pick SLIs users care about (availability, latency, freshness), set SLOs, and alert on **error-budget burn rate** (fast burn → page, slow burn → ticket). Every page should be actionable.

## Worked examples

### Error budget

SLO 99.9% over 30 days with 10 M requests → budget 10,000 failed requests. If 2,000 failed in the last hour, you're burning budget fast → page.

### A log line

```json
{"level":"warn","msg":"payment provider slow","route":"POST /bookings","duration_ms":2380,"provider":"x","trace_id":"4bf92f3577b34da6a3ce929d0e0e4736"}
```

## Common misconceptions

- **"More dashboards = more observability."** — The ability to answer new questions matters, not chart count.
- **"Alert on everything abnormal."** — Alert fatigue hides real incidents.
- **"Averages are fine for latency."** — Use percentiles from histograms.

## Practical exercises

1. Define two SLIs and SLOs for the booking platform and the burn-rate alert thresholds.
2. Add structured logging with a request id to an endpoint in one of your projects.
