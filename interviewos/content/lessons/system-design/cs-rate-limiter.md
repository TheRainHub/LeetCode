---
slug: cs-rate-limiter
title: "Case study: Rate limiter"
path: system-design
module: sd-case-studies
order: 4
minutes: 45
depth: full
practice: conceptual
summary: Token bucket, leaky bucket, fixed and sliding windows; distributed rate limiting with Redis; where to enforce limits and how to communicate them to clients.
prerequisites: [redis, sd-scaling-load-balancing]
problems: []
objectives:
  - Compare rate-limiting algorithms and their burst behaviour
  - Implement a distributed limiter with atomic Redis operations
  - Decide placement (gateway vs service), keys, failure mode and client communication
readings:
  - title: "Cloudflare blog — How we built rate limiting capable of scaling to millions of domains"
    url: https://blog.cloudflare.com/counting-things-a-lot-of-different-things/
    kind: article
  - title: "Stripe engineering — Scaling your API with rate limiters"
    url: https://stripe.com/blog/rate-limiters
    kind: article
  - title: "RFC 6585 — 429 Too Many Requests"
    url: https://www.rfc-editor.org/rfc/rfc6585#section-4
    kind: rfc
interview:
  - q: "Token bucket vs fixed window?"
    a: "Token bucket refills at a steady rate up to a capacity, allowing controlled bursts and smooth average rate. Fixed window counts requests per calendar window — simple but allows up to 2× the limit around window boundaries. Sliding window log/counter fixes the boundary problem at more cost."
  - q: "What happens if the Redis used by the rate limiter is down?"
    a: "Choose fail-open (allow traffic, protect availability, maybe with a local in-memory fallback limit) or fail-closed (reject, protect backends) based on what the limiter protects. Most API limiters fail open with local limits and alerts."
selfAssessment:
  - I can implement a token bucket
  - I can design a distributed limiter and its failure mode
completion:
  - Score at least 70% on the quiz
  - Do a system design mock on this prompt
quiz:
  - q: "Fixed window limit 100/min: a client sends 100 at 00:59 and 100 at 01:00. Result:"
    options: ["100 allowed", "200 allowed within ~1 second", "Blocked", "50 allowed"]
    answer: 1
    why: "Boundary burst — sliding windows or token buckets smooth it."
  - q: "To avoid race conditions in a Redis-based limiter, use:"
    options: ["GET then SET from the app", "Atomic operations (INCR) or a Lua script", "Two Redis instances", "Client-side counting"]
    answer: 1
    why: "Read-modify-write from the app races."
  - q: "A limited client should receive:"
    options: ["500", "429 with Retry-After (and optionally rate limit headers)", "200 with empty body", "403"]
    answer: 1
    why: "Lets well-behaved clients back off."
explain:
  prompt: "Design a rate limiter for a public API: 100 requests per minute per API key, across 20 API servers."
  rubric:
    - "Algorithm choice (token bucket or sliding window) with justification"
    - "Shared state in Redis with atomic Lua script; key design"
    - "Placement at gateway/middleware; headers and 429 Retry-After"
    - "Failure mode, latency overhead, hot keys, multi-region"
  model: "Because 20 servers share the limit, state must be central, so I'd keep it in Redis. I'd use a token bucket per API key — capacity 100, refill about 1.67 tokens per second — which permits short bursts but enforces the average. A Lua script atomically reads the bucket's tokens and last-refill timestamp, refills based on elapsed time, decrements if possible and returns allowed plus remaining, with a TTL so idle keys disappear. Enforcement sits in the API gateway or a shared middleware before business logic, and responses include RateLimit headers and 429 with Retry-After. Redis adds one round trip, under a millisecond in the same region; if it's unavailable I'd fail open with a conservative local in-memory limit per server and alert. Very hot keys could use local pre-aggregation with periodic sync, and multi-region deployments would either shard limits per region or accept approximate global limits."
cards:
  - q: "Token bucket"
    a: "Tokens refill at rate r up to capacity b; each request consumes one → bursts ≤ b, average ≤ r."
  - q: "Fixed window weakness"
    a: "Up to 2× limit across a window boundary."
---

## Explanation

### Algorithms

| Algorithm | Behaviour | Cost |
|---|---|---|
| Fixed window counter | simple; boundary bursts | 1 counter |
| Sliding window log | exact; stores timestamps | O(requests) memory |
| Sliding window counter | weighted current + previous window | 2 counters |
| Token bucket | bursts up to capacity, steady refill | 2 values |
| Leaky bucket | smooth output rate (queue) | queue |

### Distributed design

- Key: `rl:{apiKey}` (or user, IP, route).
- Atomicity: Redis Lua script; TTL for cleanup.
- Placement: edge/gateway for coarse limits; service-level for expensive operations (e.g. LLM calls per user).
- Response: `429`, `Retry-After`, `RateLimit-*` headers.
- Failure: fail-open with local fallback vs fail-closed.

## Worked examples

```lua
-- KEYS[1]=bucket key; ARGV: capacity, refill_per_sec, now_ms
local b = redis.call('HMGET', KEYS[1], 'tokens', 'ts')
local cap, rate, now = tonumber(ARGV[1]), tonumber(ARGV[2]), tonumber(ARGV[3])
local tokens = tonumber(b[1]) or cap
local ts = tonumber(b[2]) or now
tokens = math.min(cap, tokens + (now - ts) / 1000 * rate)
local allowed = tokens >= 1
if allowed then tokens = tokens - 1 end
redis.call('HSET', KEYS[1], 'tokens', tokens, 'ts', now)
redis.call('PEXPIRE', KEYS[1], math.ceil(cap / rate * 1000))
return { allowed and 1 or 0, math.floor(tokens) }
```

## Common misconceptions

- **"Per-server limits are fine."** — With N servers the effective limit becomes N× unless sticky routing.
- **"Rate limiting = DDoS protection."** — Volumetric attacks need edge/network protection.

## Practical exercises

1. Implement an in-memory token bucket in TypeScript with unit tests using fake timers.
2. Run a system design mock with this prompt.
