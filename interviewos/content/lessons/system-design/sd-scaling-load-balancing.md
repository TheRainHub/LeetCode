---
slug: sd-scaling-load-balancing
title: Scaling services and load balancing
path: system-design
module: sd-building-blocks
order: 2
minutes: 40
depth: concise
practice: conceptual
summary: Stateless services, horizontal vs vertical scaling, L4 vs L7 load balancers, algorithms, health checks, autoscaling, and rate limiting at the edge.
prerequisites: [sd-requirements]
problems: []
objectives:
  - Design stateless services that scale horizontally
  - Explain L4 vs L7 load balancing, algorithms and health checks
  - Plan autoscaling and protect services with rate limiting and admission control
readings:
  - title: "NGINX — HTTP load balancing"
    url: https://docs.nginx.com/nginx/admin-guide/load-balancer/http-load-balancer/
    kind: docs
  - title: "Kubernetes docs — Horizontal Pod Autoscaling"
    url: https://kubernetes.io/docs/tasks/run-application/horizontal-pod-autoscale/
    kind: docs
  - title: "Google SRE Book — Load balancing in the datacenter"
    url: https://sre.google/sre-book/load-balancing-datacenter/
    kind: book
interview:
  - q: "Why should application servers be stateless?"
    a: "Any instance can serve any request, so you can add/remove instances freely, balance load evenly and survive instance failures. Keep session state in a shared store (Redis/DB) or signed tokens, and files in object storage."
  - q: "L4 vs L7 load balancer?"
    a: "L4 balances TCP/UDP connections by IP/port — fast, protocol-agnostic. L7 understands HTTP — route by path/host/header, TLS termination, retries, sticky sessions, per-request balancing (important for HTTP/2/gRPC multiplexed connections)."
selfAssessment:
  - I can explain how to make a service stateless
  - I can choose a load balancing algorithm
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Least-connections balancing beats round-robin when:"
    options: ["Requests are uniform", "Request durations vary widely", "There is one server", "Using UDP"]
    answer: 1
    why: "It accounts for in-flight work."
  - q: "Autoscaling on CPU for an I/O-bound service waiting on a database:"
    options: ["Works perfectly", "May not scale when it should (CPU stays low) — or add instances that overload the DB", "Is required", "Reduces latency always"]
    answer: 1
    why: "Pick metrics that reflect saturation (concurrency, queue depth, latency) and protect downstreams."
  - q: "Health checks should:"
    options: ["Always return 200", "Reflect whether the instance can serve traffic, without cascading on shared dependencies", "Run once at startup", "Check every downstream deeply"]
    answer: 1
    why: "Deep checks of shared deps can mark every instance unhealthy at once."
explain:
  prompt: "Explain how you'd scale a stateless API from 1 to 50 instances and keep it healthy under traffic spikes."
  rubric:
    - "Stateless design; shared session/state stores"
    - "L7 load balancer with health checks; algorithm choice"
    - "Autoscaling on meaningful metrics with limits; warm-up"
    - "Protect downstreams: rate limiting, connection pools, load shedding"
  model: "First the API must be stateless: sessions in signed tokens or Redis, uploads in object storage, no local caches that must be consistent. A layer-7 load balancer distributes requests using least-requests, terminates TLS and uses readiness checks so unhealthy or warming instances get no traffic. Autoscaling follows a metric that reflects saturation — CPU for CPU-bound work, otherwise concurrency or latency — with minimum replicas for baseline and a maximum that protects the database. As instances grow, database connections multiply, so I'd add a pooler and per-instance pool limits. For spikes, rate limiting at the edge per client and load shedding with 429s keep latency acceptable for admitted requests."
cards:
  - q: "Stateless service"
    a: "No per-instance user state; state in shared stores → free horizontal scaling."
  - q: "L4 vs L7"
    a: "L4: connections (TCP/UDP). L7: HTTP-aware routing, TLS, per-request balancing."
---

## Explanation

- **Vertical scaling**: bigger machine — simple, limited, single point of failure.
- **Horizontal scaling**: more instances behind a load balancer — requires statelessness.
- **Load balancers**: DNS-based (coarse), L4 (connections), L7 (requests). Algorithms: round-robin, least connections/requests, weighted, consistent hashing (cache affinity).
- **Health checks**: readiness (route traffic?) vs liveness (restart?); passive outlier detection.
- **Autoscaling**: reactive on metrics (CPU, RPS, queue depth), scheduled for known peaks; mind cold starts and downstream capacity.
- **Edge protection**: rate limiting (see rate limiter case study), WAF, connection limits, load shedding.
- **Multi-region**: GeoDNS/anycast, data locality and replication trade-offs.

## Worked examples

A Node API at 70% CPU per pod during peaks: HPA targeting 60% CPU, min 3 / max 30 replicas; PgBouncer in transaction mode keeps DB connections at ~100 regardless of pod count; Ingress-level rate limit 50 req/s per API key.

## Common misconceptions

- **"More instances always help."** — The bottleneck may be the database or a lock.
- **"Sticky sessions are fine."** — They hinder balancing and failover; prefer shared state.

## Practical exercises

1. Identify state that prevents one of your services from scaling horizontally.
2. Compute DB connections at max replicas with your pool size; fix it if it exceeds `max_connections`.
