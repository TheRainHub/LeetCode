---
slug: retries-backoff
title: Timeouts, retries, backoff and circuit breakers
path: backend
module: be-reliability
order: 2
minutes: 40
depth: full
practice: conceptual
summary: Making calls to unreliable dependencies safe — timeouts and deadlines, exponential backoff with jitter, retry budgets, circuit breakers and bulkheads.
prerequisites: [idempotency]
problems: []
objectives:
  - Set timeouts and propagate deadlines through a call chain
  - Implement exponential backoff with jitter and decide what is retryable
  - Prevent retry storms with budgets, circuit breakers and load shedding
readings:
  - title: "AWS Builders' Library — Timeouts, retries, and backoff with jitter"
    url: https://aws.amazon.com/builders-library/timeouts-retries-and-backoff-with-jitter/
    kind: article
  - title: "Google SRE Book — Handling overload"
    url: https://sre.google/sre-book/handling-overload/
    kind: book
  - title: "Martin Fowler — Circuit Breaker"
    url: https://martinfowler.com/bliki/CircuitBreaker.html
    kind: article
interview:
  - q: "Why add jitter to exponential backoff?"
    a: "Without jitter, clients that failed together retry together, producing synchronized waves that keep the dependency overloaded. Randomising the delay (e.g. full jitter: random between 0 and base·2^attempt) spreads retries out."
  - q: "What errors should you retry?"
    a: "Transient ones: timeouts, connection resets, 503, 429 (respecting Retry-After), 502/504 — and only for idempotent operations or with idempotency keys. Don't retry 4xx validation/auth errors or non-idempotent requests without keys."
  - q: "What does a circuit breaker do?"
    a: "Tracks failures to a dependency; after a threshold it opens and fails fast without calling it, giving it time to recover and freeing your threads. After a cool-down it half-opens to let trial requests through, closing again on success."
selfAssessment:
  - I can write a retry loop with capped exponential backoff and jitter
  - I can explain how retries amplify load in a multi-layer system
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Three service layers each retry 3 times. A failing bottom dependency can see up to:"
    options: ["3 attempts", "9 attempts", "27 attempts per user request", "1 attempt"]
    answer: 2
    why: "Retries multiply across layers — retry at one layer, use budgets."
  - q: "A request with no timeout to a hung dependency:"
    options: ["Fails quickly", "Can tie up threads/connections indefinitely and cascade the failure", "Is retried automatically", "Is cheaper"]
    answer: 1
    why: "Always set timeouts; prefer deadlines propagated end to end."
  - q: "On 429 with Retry-After: 30, the client should:"
    options: ["Retry immediately", "Wait at least 30 seconds before retrying", "Switch to POST", "Give up forever"]
    answer: 1
    why: "Respect server-provided backoff."
explain:
  prompt: "Your service calls a flaky third-party API. Describe how you'd make those calls resilient without making outages worse."
  rubric:
    - "Timeouts and deadlines"
    - "Retry only transient errors with capped exponential backoff + jitter and a small max"
    - "Idempotency keys for writes"
    - "Circuit breaker / bulkhead / fallback; retry budget; metrics and alerts"
  model: "Every call gets a timeout derived from our own latency budget, so a hung provider can't hold our threads. I'd retry only transient failures — timeouts, connection errors, 502/503/504 and 429 honoring Retry-After — with capped exponential backoff and full jitter, at most two or three times and only for idempotent requests or with idempotency keys. I'd retry at one layer only, to avoid multiplying attempts. A circuit breaker opens when the error rate crosses a threshold so we fail fast and return a fallback or a clear error, and a bulkhead — a separate connection pool — keeps the flaky API from starving other work. I'd track latency, error rate, retries and breaker state, and alert on them."
cards:
  - q: "Full jitter backoff"
    a: "sleep = random(0, min(cap, base · 2^attempt))."
  - q: "Circuit breaker states"
    a: "Closed → Open (fail fast) → Half-open (trial) → Closed."
  - q: "Bulkhead"
    a: "Isolate resources (pools/threads) per dependency so one can't exhaust all."
---

## Explanation

### Timeouts and deadlines

Every network call needs a timeout. Better: propagate a **deadline** (gRPC does this) so downstream calls don't keep working after the caller has given up.

### Retry policy

- Retry **transient** failures only; respect `Retry-After`.
- **Exponential backoff** with **jitter**, a **cap**, and a small **max attempts**.
- Only for idempotent operations (or with idempotency keys).
- **Retry budgets**: e.g. retries ≤ 10% of requests; stop retrying when the dependency is clearly down.
- Retry at one layer — usually the outermost or the client library — not at every hop.

### Circuit breakers, bulkheads, shedding

- **Circuit breaker**: fail fast while a dependency is unhealthy.
- **Bulkhead**: separate pools per dependency.
- **Load shedding**: reject excess work early (429/503) to protect latency for the rest.
- **Fallbacks**: cached/stale data, degraded features — but be explicit about degraded results.

## Worked examples

```ts
async function withRetry<T>(fn: () => Promise<T>, isRetryable: (e: unknown) => boolean, max = 3): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await fn();
    } catch (e) {
      if (attempt >= max || !isRetryable(e)) throw e;
      const cap = 5_000, base = 100;
      await new Promise((r) => setTimeout(r, Math.random() * Math.min(cap, base * 2 ** attempt)));
    }
  }
}
```

## Common misconceptions

- **"More retries = more reliability."** — Beyond a few, retries mainly amplify overload.
- **"Default timeouts are fine."** — Many clients default to none or minutes.
- **"Circuit breakers fix the dependency."** — They protect you; the dependency still needs fixing.

## Practical exercises

1. Add timeouts and a retry helper to an external call in one of your projects.
2. Compute worst-case attempts for a 3-layer call chain with retries at each layer; redesign it.
