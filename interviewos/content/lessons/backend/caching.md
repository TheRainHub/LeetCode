---
slug: caching
title: Caching strategies
path: backend
module: be-caching-messaging
order: 1
minutes: 45
depth: full
practice: conceptual
summary: Cache-aside, write-through and write-behind, TTLs and invalidation, stampedes, hot keys and what to cache at each layer.
prerequisites: [sql-queries]
problems: [lru-cache]
objectives:
  - Choose a caching pattern (cache-aside, read/write-through, write-behind) and justify it
  - Design invalidation with TTLs, explicit deletes or versioned keys, and reason about staleness
  - Prevent cache stampedes and handle hot keys
  - Place caches at the right layer (client, CDN, application, database)
readings:
  - title: "AWS — Caching best practices"
    url: https://aws.amazon.com/caching/best-practices/
    kind: article
  - title: "Redis docs — Client-side caching"
    url: https://redis.io/docs/latest/develop/clients/client-side-caching/
    kind: docs
  - title: "Designing Data-Intensive Applications (Kleppmann)"
    url: https://dataintensive.net/
    kind: book
interview:
  - q: "How do you keep a cache consistent with the database?"
    a: "Typical: cache-aside with TTL, and on writes update the DB then delete the cache key (not set it) so the next read repopulates. Accept bounded staleness via TTL. For stronger guarantees use versioned keys or change-data-capture driven invalidation. Avoid updating cache before the DB commit."
  - q: "What is a cache stampede and how do you prevent it?"
    a: "When a hot key expires, many requests miss simultaneously and hammer the DB. Prevent with request coalescing/single-flight (one request recomputes, others wait), a lock with short TTL, probabilistic early refresh, stale-while-revalidate, and TTL jitter."
  - q: "What would you not cache?"
    a: "Data that must be strongly consistent (balances at payment time), highly personalised low-reuse data, data cheaper to compute than to fetch, and anything whose staleness would break correctness or security (permissions without short TTL)."
selfAssessment:
  - I can explain cache-aside and the delete-on-write pattern
  - I can describe three stampede mitigations
  - I can reason about hit ratio and what it saves
completion:
  - Score at least 70% on the quiz
  - Explain an invalidation strategy in interview mode
quiz:
  - q: "In cache-aside, on a read miss the application:"
    options: ["Returns an error", "Reads from the DB, then populates the cache", "Writes to the cache first", "Calls the CDN"]
    answer: 1
    why: "The application owns cache population."
  - q: "Why delete the cache key on write rather than set the new value?"
    options: ["It's faster", "Avoids races where an older value overwrites a newer one in the cache", "Redis requires it", "To save memory only"]
    answer: 1
    why: "Concurrent writers can set values out of order; deletion lets the next read fetch the latest committed value."
  - q: "Adding random jitter to TTLs helps by:"
    options: ["Making keys unique", "Spreading expirations so many keys don't expire at once", "Encrypting data", "Reducing memory"]
    answer: 1
    why: "Synchronized expiry causes load spikes."
  - q: "Write-behind (write-back) caching risks:"
    options: ["Slow writes", "Losing writes if the cache fails before flushing to the DB", "Stale reads only", "Nothing"]
    answer: 1
    why: "Durability depends on the cache until flushed."
explain:
  prompt: "Design caching for a product-details endpoint that gets 5,000 reads per second and is updated a few times a day."
  rubric:
    - "Cache-aside with Redis (and possibly CDN/HTTP caching) with TTL"
    - "Invalidation on update (delete key or versioned key), bounded staleness"
    - "Stampede protection and TTL jitter"
    - "Hit ratio estimate, memory sizing, fallback when the cache is down"
  model: "This is read-heavy and rarely changes, so caching gives a large win. I'd use cache-aside in Redis keyed by product id with a TTL of, say, ten minutes plus jitter; on product updates the service commits to the database and then deletes the key, so the next read loads fresh data. Since the response is the same for all users, I'd also send Cache-Control with a short max-age and stale-while-revalidate so a CDN absorbs most traffic. To avoid stampedes on popular products I'd use single-flight so only one request rebuilds a missing key. With a high hit ratio the database sees a small fraction of requests. If Redis is down I'd fall back to the database with a circuit breaker and rate limits so we degrade rather than collapse."
cards:
  - q: "Cache-aside write path"
    a: "Write DB, then delete cache key (next read repopulates)."
  - q: "Stampede mitigations"
    a: "Single-flight/locks, early probabilistic refresh, stale-while-revalidate, TTL jitter."
  - q: "Cache layers"
    a: "Browser → CDN → reverse proxy → app (in-process/Redis) → DB buffer cache."
---

## Explanation

### Patterns

| Pattern | Read | Write | Notes |
|---|---|---|---|
| **Cache-aside** | app checks cache, on miss loads DB and fills | app writes DB, deletes key | most common, cache failure is non-fatal |
| **Read-through** | cache library loads on miss | — | simpler app code |
| **Write-through** | — | write to cache and DB synchronously | fresh cache, slower writes |
| **Write-behind** | — | write to cache, flush to DB async | fast writes, risk of loss |

### Invalidation

"There are only two hard things…" Options: TTL (bounded staleness), explicit delete on write, **versioned keys** (`product:42:v17` — bump version on write), event-driven invalidation (CDC/outbox events). Choose based on how stale data may be.

### Failure modes

- **Stampede / thundering herd** on expiry → single-flight, locks, early refresh.
- **Hot keys** → replicate key across shards, local in-process cache, request coalescing.
- **Cache penetration** (lookups for non-existent keys) → cache negative results briefly, Bloom filters.
- **Cold start** → warm-up or gradual traffic shift.

### Eviction

LRU/LFU when memory is full (see the **LRU cache** problem). Size memory for the working set, not the whole dataset.

### Measuring

Hit ratio, latency at p50/p99, evictions, memory. A cache with low hit ratio adds latency and complexity.

## Worked examples

### Cache-aside in TypeScript with single-flight

```ts
const inflight = new Map<string, Promise<Product>>();
async function getProduct(id: string): Promise<Product> {
  const key = `product:${id}`;
  const hit = await redis.get(key);
  if (hit) return JSON.parse(hit);
  if (!inflight.has(key)) {
    inflight.set(key, (async () => {
      try {
        const p = await db.products.find(id);
        await redis.set(key, JSON.stringify(p), { EX: 600 + Math.floor(Math.random() * 60) });
        return p;
      } finally { inflight.delete(key); }
    })());
  }
  return inflight.get(key)!;
}
```

Single-flight here is per process; across many instances a short Redis lock (`SET key:lock 1 NX PX 5000`) achieves the same.

## Common misconceptions

- **"Caching fixes slow queries."** — It hides them until a miss storm; fix the query too.
- **"Set the cache after writing the DB is always safe."** — Racing writers can leave stale values; prefer delete.
- **"Caches are always faster."** — A network hop to Redis for cheap computations adds latency.

## Practical exercises

1. Implement the **LRU cache** problem and explain how Redis approximates LRU.
2. Sketch the timeline of the set-after-write race with two writers.
3. Pick an endpoint in a project and estimate hit ratio and DB load reduction.
