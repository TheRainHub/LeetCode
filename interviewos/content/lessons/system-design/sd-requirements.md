---
slug: sd-requirements
title: Requirements clarification and the interview framework
path: system-design
module: sd-method
order: 1
minutes: 40
depth: full
practice: conceptual
summary: How to run a 45-minute system design interview — clarify scope, functional and non-functional requirements, then high-level design, deep dives and trade-offs.
prerequisites: []
problems: []
objectives:
  - Ask clarifying questions that change the design (scale, consistency, latency, users, scope)
  - Separate functional from non-functional requirements and make assumptions explicit
  - Structure a design interview into time-boxed phases and drive it proactively
readings:
  - title: "System Design Primer (donnemartin)"
    url: https://github.com/donnemartin/system-design-primer
    kind: docs
  - title: "Designing Data-Intensive Applications (Kleppmann)"
    url: https://dataintensive.net/
    kind: book
  - title: "Google SRE Book — Service level objectives"
    url: https://sre.google/sre-book/service-level-objectives/
    kind: book
interview:
  - q: "What do you do in the first five minutes of a system design interview?"
    a: "Clarify: who are the users and what are the core use cases (pick 2–3), what's out of scope, scale (users, requests, data size, growth), non-functional priorities (latency, availability vs consistency, durability, security), and constraints. Then summarise the requirements back and state assumptions."
  - q: "Why are non-functional requirements so important?"
    a: "They drive the architecture. A booking system needs strong consistency on seats; a feed tolerates staleness but needs low read latency; a payment system needs durability and idempotency. Without them every design looks equally valid."
selfAssessment:
  - I have a list of clarifying questions memorised by category
  - I can time-box a 45-minute design interview
completion:
  - Score at least 70% on the quiz
  - Do one system design mock interview using the framework
quiz:
  - q: "The best first step when asked to 'design Twitter' is:"
    options: ["Draw microservices", "Clarify core features, scale and non-functional requirements and agree on scope", "Choose a database", "Discuss Kafka"]
    answer: 1
    why: "Scope first, then design."
  - q: "Which is a non-functional requirement?"
    options: ["Users can post messages", "p99 read latency under 200 ms", "Users can follow others", "Admins can delete posts"]
    answer: 1
    why: "Latency, availability, consistency, durability, security, cost are non-functional."
  - q: "When the interviewer says 'it's up to you', you should:"
    options: ["Pick silently", "State a reasonable assumption out loud and move on", "Ask again", "Skip the topic"]
    answer: 1
    why: "Explicit assumptions show judgement and keep momentum."
explain:
  prompt: "Explain the framework you use to run a system design interview and how you'd allocate 45 minutes."
  rubric:
    - "Requirements (functional + non-functional) and scope ~5–8 min"
    - "Estimates where they affect design"
    - "API and data model, then high-level architecture"
    - "Deep dives into 1–2 hard parts; trade-offs; failure modes; wrap-up"
  model: "I spend the first five to eight minutes on requirements: core use cases, what's out of scope, scale, and the non-functional priorities such as consistency, latency and availability, and I state my assumptions. Then a quick estimate if numbers affect the design — storage, QPS, read/write ratio. Next I define the main API and data model, and draw a high-level architecture covering the main request paths, around ten minutes. The remaining twenty minutes go to deep dives on the hardest parts — for a booking system, preventing double booking and handling hot classes — discussing alternatives and trade-offs, failure modes and monitoring. I finish by summarising the design and what I'd improve with more time. Throughout I think aloud and check in with the interviewer about where to go deeper."
cards:
  - q: "Design interview phases"
    a: "Requirements → estimates → API/data model → high-level design → deep dives → trade-offs/failures → summary."
  - q: "Clarifying question categories"
    a: "Users/use cases, scope, scale, consistency/latency/availability, data, security, constraints."
---

## Explanation

### Framework (45 minutes)

| Phase | Time | Output |
|---|---|---|
| Requirements & scope | 5–8 min | 3 core features, out-of-scope list, NFRs |
| Estimates | 3–5 min | QPS, storage, bandwidth if they matter |
| API + data model | 5–8 min | endpoints, entities, key access patterns |
| High-level design | 8–10 min | boxes and arrows for main flows |
| Deep dives | 15 min | 1–2 hard problems, alternatives, trade-offs |
| Wrap-up | 2–3 min | bottlenecks, failure modes, next steps |

### Clarifying questions

- **Users & use cases**: who, what are the top 3 actions, read vs write heavy?
- **Scale**: DAU, peak QPS, data volume and growth, geographic distribution.
- **Consistency**: what must never be wrong (money, seats)? What can be stale and for how long?
- **Latency/availability**: targets (p99, SLO), what happens when degraded.
- **Constraints**: existing stack, team, budget, compliance (GDPR), mobile clients.

### Driving the interview

State assumptions, summarise before moving on, prefer simple designs first then evolve, quantify trade-offs, and invite the interviewer to steer deep dives.

## Worked examples

**Prompt**: "Design a notification system."
Clarify: channels (email, push, SMS?), triggered by which events, per-user preferences, delivery guarantees (at-least-once OK? dedupe?), volume (e.g. 10 M notifications/day, peaks during campaigns), latency (transactional within seconds vs marketing within hours), retries and provider failover, rate limits/quiet hours. Out of scope: building our own SMS gateway.

## Common misconceptions

- **"Start with the database choice."** — Access patterns and NFRs come first.
- **"More components = better design."** — Simple and justified beats complex.
- **"There's one right answer."** — Interviewers evaluate reasoning and trade-offs.

## Practical exercises

1. Write clarifying questions for: URL shortener, booking platform, chat app.
2. Run a timed mock design interview in InterviewOS (system design type) and review the phase timings.
