---
slug: cs-notification-system
title: "Case study: Notification system"
path: system-design
module: sd-case-studies
order: 2
minutes: 50
depth: full
practice: conceptual
summary: Multi-channel notifications (email, push, SMS, in-app) with preferences, templating, queues, retries, deduplication, rate limiting and provider failover.
prerequisites: [sd-requirements, sd-async-queues, idempotency]
problems: []
objectives:
  - Design an event-driven pipeline from triggering events to channel providers
  - Handle preferences, quiet hours, deduplication, retries and provider outages
  - Separate transactional from bulk/marketing traffic and prioritise
readings:
  - title: "AWS Builders' Library — Avoiding insurmountable queue backlogs"
    url: https://aws.amazon.com/builders-library/avoiding-insurmountable-queue-backlogs/
    kind: article
  - title: "Firebase Cloud Messaging — Architectural overview"
    url: https://firebase.google.com/docs/cloud-messaging/fcm-architecture
    kind: docs
interview:
  - q: "How do you avoid sending the same notification twice?"
    a: "Give each notification a deterministic id (event id + user + channel + template), store a send record with a unique constraint before/when sending, and make workers idempotent. Pass idempotency keys to providers that support them. Some duplicates may still happen at provider level — design content so a rare duplicate is harmless."
  - q: "How do you prevent a marketing campaign from delaying password-reset emails?"
    a: "Separate queues/priorities and worker pools for transactional vs bulk traffic, per-type rate limits, and capacity reserved for high priority."
selfAssessment:
  - I can draw the pipeline and explain each component
  - I can explain priority isolation and provider failover
completion:
  - Score at least 70% on the quiz
  - Do a system design mock on this prompt
quiz:
  - q: "User preferences (opt-outs, quiet hours) should be checked:"
    options: ["Only in the UI", "In the pipeline before sending, using a cached preference service", "Never", "By the provider"]
    answer: 1
    why: "Respect consent centrally; legal requirements apply."
  - q: "When the email provider returns 5xx for minutes, workers should:"
    options: ["Drop messages", "Retry with backoff and, if sustained, fail over to a secondary provider", "Retry instantly forever", "Send SMS instead"]
    answer: 1
    why: "Circuit breaker + secondary provider."
  - q: "Push notification tokens that the provider reports as invalid should be:"
    options: ["Retried", "Removed/deactivated", "Logged only", "Sent to email"]
    answer: 1
    why: "Keeps the device registry clean."
explain:
  prompt: "Design a notification service used by many internal services to send email, push and in-app notifications."
  rubric:
    - "API/event intake with validation and idempotency"
    - "Preference/consent check, templating, channel routing"
    - "Queues per channel/priority, workers, retries, DLQ, provider failover"
    - "Dedup, rate limiting/quiet hours, in-app store, observability"
  model: "Internal services call POST /notifications or publish an event with type, recipient, data and an idempotency key. The intake service validates against a registered template schema, stores the notification and enqueues it. A routing step loads the user's preferences and consent — opt-outs, quiet hours, channels — renders templates per locale, and fans out to channel queues, separated by priority so transactional messages never wait behind campaigns. Channel workers send via providers with timeouts, retry transient errors with backoff, fail over to a secondary provider when a circuit breaker opens, and move permanent failures to a DLQ. Each send has a deterministic id with a unique constraint to dedupe. In-app notifications are written to a per-user store and delivered via SSE or WebSocket when online. I'd monitor queue age per priority, delivery success per provider and send latency."
cards:
  - q: "Notification dedup key"
    a: "event id + user + channel + template, unique constraint on send records."
  - q: "Priority isolation"
    a: "Separate queues and worker pools for transactional vs bulk."
---

## Explanation

### Requirements

Channels: email, push (APNs/FCM), SMS, in-app. Triggered by internal events; per-user preferences/consent; templates & localisation; at-least-once with dedupe; transactional latency in seconds; bulk campaigns at millions/hour without hurting transactional.

### Architecture

```text
services → Notification API / events → intake (validate, persist, idempotency)
         → router (preferences, quiet hours, templates, channel selection)
         → queues: email-high, email-bulk, push, sms, inapp
         → channel workers → providers (primary/secondary)
         → status updates / webhooks (delivered, bounced) → status store
in-app store ← inapp worker → SSE/WebSocket gateway → clients
```

### Deep dives

- **Dedup**: deterministic notification id + unique constraint.
- **Rate limiting**: per user (don't spam), per provider (API limits), per tenant.
- **Retries/failover**: exponential backoff, circuit breaker, secondary provider, DLQ.
- **Scheduling**: send-at time, quiet hours via delayed queues.
- **Feedback loop**: bounces, unsubscribes, invalid tokens update the registry.
- **Data**: notification log for audit and user-visible history; retention limits.

## Worked examples

Estimates: 10 M notifications/day ≈ 115/s average; campaigns may push 1 M within an hour (≈ 280/s) — sized by bulk workers with a provider rate limit; transactional pool reserved.

## Common misconceptions

- **"One queue is enough."** — Mixed priorities cause head-of-line blocking.
- **"Exactly-once delivery is achievable."** — Aim for at-least-once + dedupe; providers may still duplicate.

## Practical exercises

1. Run a system design mock with this prompt and compare.
2. Design the database tables for notification log, preferences and device tokens.
