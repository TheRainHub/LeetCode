---
slug: sd-async-queues
title: Asynchronous architectures and event-driven design
path: system-design
module: sd-building-blocks
order: 3
minutes: 35
depth: concise
practice: conceptual
summary: When to use queues, pub/sub and event streams in a design; sagas for multi-step workflows; fan-out; and keeping eventual consistency understandable.
prerequisites: [message-queues]
problems: []
objectives:
  - Decide which parts of a design should be asynchronous and why
  - Use pub/sub and event streams for fan-out and decoupling
  - Coordinate multi-service workflows with sagas and compensating actions
readings:
  - title: "microservices.io — Saga pattern"
    url: https://microservices.io/patterns/data/saga.html
    kind: article
  - title: "Martin Fowler — What do you mean by 'Event-Driven'?"
    url: https://martinfowler.com/articles/201701-event-driven.html
    kind: article
interview:
  - q: "How do you handle a workflow across services (book seat → charge card → send confirmation) without distributed transactions?"
    a: "A saga: a sequence of local transactions, each publishing an event or driven by an orchestrator; if a step fails, run compensating actions (release the seat hold, refund). Combine with idempotent steps and timeouts (holds expire)."
  - q: "Events vs commands?"
    a: "A command asks a specific service to do something (may be rejected); an event states a fact that happened (BookingConfirmed) and any number of subscribers may react. Events decouple producers from consumers."
selfAssessment:
  - I can design a saga with compensations
  - I can explain when async adds unnecessary complexity
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Fan-out of one event to email, analytics and search indexing is best done with:"
    options: ["One queue with competing consumers", "Pub/sub or a log with one subscription/consumer group per downstream", "Synchronous HTTP calls", "Cron"]
    answer: 1
    why: "Each downstream gets every event independently."
  - q: "A compensating action is:"
    options: ["A rollback of a DB transaction", "A new action that semantically undoes a completed step (e.g. refund)", "A retry", "A lock"]
    answer: 1
    why: "Completed local transactions can't be rolled back."
  - q: "Choreography vs orchestration — orchestration means:"
    options: ["Services react to each other's events without a coordinator", "A central coordinator directs the saga steps", "No failures", "Using Kubernetes"]
    answer: 1
    why: "Orchestration makes flows explicit; choreography reduces coupling but scatters logic."
explain:
  prompt: "Explain how you'd implement 'checkout' (reserve inventory, charge payment, create shipment) across services."
  rubric:
    - "Saga with ordered local steps"
    - "Compensations for each step"
    - "Idempotency and outbox for reliable events"
    - "Timeouts/state machine and visibility of workflow state"
  model: "I'd implement checkout as an orchestrated saga with an explicit state machine: create an order in pending state, reserve inventory with a hold that expires, charge the payment with an idempotency key, then create the shipment and mark the order confirmed. Each step is a local transaction that emits an event through an outbox. If payment fails, the orchestrator runs compensations — release the inventory hold and mark the order failed; if shipment creation fails after payment, it retries and eventually refunds. Steps are idempotent because messages may be redelivered, and timeouts move stuck orders forward or compensate. The order's state is visible to the user and support, which keeps eventual consistency understandable."
cards:
  - q: "Saga pattern"
    a: "Sequence of local transactions with compensating actions instead of a distributed transaction."
  - q: "Event vs command"
    a: "Event = fact that happened (many listeners); command = request to one handler."
---

## Explanation

- **Make async**: slow, unreliable, or non-user-blocking work (emails, media processing, indexing, LLM batch jobs, webhooks).
- **Keep sync**: what the user needs immediately and what must be consistent (seat reservation).
- **Patterns**: work queues (competing consumers), pub/sub fan-out, event streaming with replay, outbox for reliable publishing, CQRS read models built from events.
- **Sagas**: orchestration (central coordinator, explicit) vs choreography (events, decoupled, harder to follow).
- **Operability**: correlation ids across messages, DLQs, idempotent consumers, monitoring lag.

## Worked examples

Booking flow: `POST /bookings` synchronously holds a seat (DB transaction) and returns `pending_payment`; payment webhook confirms → `BookingConfirmed` event → notification service (email/push), analytics, and calendar sync consume it independently. A sweeper releases expired holds.

## Common misconceptions

- **"Event-driven is always more scalable."** — It adds complexity; use it where decoupling pays off.
- **"Sagas give ACID."** — They give eventual consistency with explicit compensation; intermediate states are visible.

## Practical exercises

1. Draw the saga for the booking platform with payment failures and hold expiry.
2. List which steps in one of your projects could be async and the consistency impact.
