---
slug: cs-feature-flags
title: "Case study: Feature flag and experimentation platform"
path: system-design
module: sd-case-studies
order: 5
minutes: 45
depth: full
practice: conceptual
summary: Designing a feature-flag service — rule evaluation in SDKs, deterministic bucketing by hashing, low-latency propagation, safe defaults, experiments and flag hygiene.
prerequisites: [ci-cd, sd-data-caching]
problems: []
objectives:
  - Design flag storage, rule evaluation and SDK distribution with low latency and high availability
  - Explain deterministic percentage rollouts via hashing and experiment assignment
  - Handle failures (flag service down), privacy of targeting attributes and stale-flag cleanup
readings:
  - title: "GrowthBook docs — SDKs and how feature evaluation works"
    url: https://docs.growthbook.io/lib/
    kind: docs
  - title: "Martin Fowler — Feature Toggles (Pete Hodgson)"
    url: https://martinfowler.com/articles/feature-toggles.html
    kind: article
  - title: "OpenFeature — Specification"
    url: https://openfeature.dev/specification/
    kind: docs
interview:
  - q: "How does a percentage rollout stay consistent for a user across requests and servers?"
    a: "Deterministic bucketing: hash(flagKey/seed + userId) → number in [0, 1); the user gets the feature if it's below the rollout percentage. Same inputs → same bucket everywhere, without storing assignments; increasing the percentage only adds users."
  - q: "Should flags be evaluated on the server, in the SDK, or remotely per request?"
    a: "Usually locally in the SDK from a cached ruleset (downloaded and kept fresh via streaming/polling) — no network call per evaluation, works if the flag service is down. Client-side (browser) SDKs may receive pre-evaluated values or a ruleset with attributes hashed to protect sensitive targeting data."
  - q: "What happens if the flag service is unavailable?"
    a: "SDKs keep using the last cached ruleset; if none (cold start), they use code defaults that represent the safe behaviour. The service is off the critical path."
selfAssessment:
  - I can explain hashing-based bucketing
  - I can design SDK caching and update propagation
  - I can describe safe defaults and flag lifecycle
completion:
  - Score at least 70% on the quiz
  - Do a system design mock on this prompt
quiz:
  - q: "Using hash(userId) without a per-flag seed for all flags causes:"
    options: ["Nothing", "Correlated assignments — the same users get every 10% rollout", "Random assignments", "Slower evaluation"]
    answer: 1
    why: "Include the flag key/experiment seed in the hash."
  - q: "Hashing a user identifier before sending it to a third-party flag service:"
    options: ["Makes it anonymous", "Reduces exposure of raw identifiers but isn't anonymisation (small ID spaces can be brute-forced)", "Is pointless", "Breaks bucketing"]
    answer: 1
    why: "Hashing ≠ anonymisation; consider salts and data minimisation."
  - q: "A flag whose rollout reached 100% months ago should be:"
    options: ["Kept forever", "Removed from code along with the dead branch", "Set to 99%", "Moved to config"]
    answer: 1
    why: "Stale flags are technical debt and test burden."
explain:
  prompt: "Design a feature flag service used by backend services and web clients."
  rubric:
    - "Data model: flags, environments, rules, rollouts, experiments; audit log"
    - "SDK local evaluation from cached rulesets; streaming/polling updates; CDN distribution"
    - "Deterministic bucketing with hashing; consistent experiment assignment and exposure logging"
    - "Failure modes and safe defaults; privacy of attributes; flag lifecycle/cleanup"
  model: "Admins define flags per environment with rules — targeting by attributes, percentage rollouts and experiments — stored in a database with an audit log of every change. A publisher compiles each environment's ruleset into a JSON document served via CDN, and pushes change notifications through SSE so SDKs refresh within seconds. Server SDKs evaluate locally from the cached ruleset, so evaluations take microseconds and don't depend on the service being up; on a cold start without cache they use defaults in code that represent the safe behaviour. Percentage rollouts hash the flag's seed plus the user id into a bucket, so assignment is stable across servers and growing the percentage only adds users. Experiments log an exposure event when a user is evaluated into a variant, which feeds the analysis pipeline. For browsers I'd avoid shipping sensitive targeting rules — either evaluate server-side or hash attributes — and treat hashed identifiers as still personal data. Finally, flags have owners and expiry dates, and CI reports stale flags for removal."
cards:
  - q: "Deterministic bucketing"
    a: "bucket = hash(seed + userId) mod 100 → stable assignment without storage."
  - q: "Flag service outage behaviour"
    a: "SDKs use last cached ruleset, else safe code defaults."
---

## Explanation

### Components

```text
admin UI → flag API → DB (flags, rules, environments, audit log)
                      └→ ruleset publisher → CDN (JSON per env) + SSE stream
service SDK (cache, local eval) ← CDN/SSE
browser SDK ← server-evaluated values or filtered ruleset
exposure events → analytics pipeline → experiment results
```

### Evaluation

1. Environment & kill switch → 2. Targeting rules (attributes) → 3. Rollout/experiment bucket via hash → 4. Default value. Deterministic and side-effect free (except exposure logging).

### Reliability

Local evaluation, cached rulesets on disk/memory, CDN distribution, safe defaults, versioned rulesets for rollback.

### Privacy

Minimise attributes sent to clients/third parties, hash identifiers (knowing hashing isn't anonymisation), respect consent for experiments.

### Lifecycle

Owners, creation dates, expiry reminders, code references scanning, removing dead branches; testing both flag states in CI.

## Worked examples

This case study relates to the GrowthBook integration listed in your **My Engineering Experience** section. Use it to prepare the system-level context around your project, but describe only what you actually did — keep the specifics of Make's setup out unless you know them first-hand.

## Common misconceptions

- **"Flags must be fetched per request."** — Local evaluation is the norm.
- **"Random assignment per request is fine."** — Users would flip between variants.

## Practical exercises

1. Implement `bucket(seed, userId)` with a stable hash (e.g. FNV-1a or MurmurHash) and verify distribution over 100,000 ids.
2. Run a system design mock with this prompt and connect it to your own feature-flag experience.
