---
slug: redis
title: Redis
path: backend
module: be-caching-messaging
order: 2
minutes: 35
depth: concise
practice: conceptual
summary: Data structures and their use cases, expiry and eviction, persistence, single-threaded execution, atomic operations and distributed-lock caveats.
prerequisites: [caching]
problems: []
objectives:
  - Pick the right Redis data structure for common problems (counters, leaderboards, rate limits, sessions)
  - Explain persistence (RDB/AOF), replication and eviction policies
  - Use atomic commands, transactions and Lua scripts correctly; know the limits of Redis locks
readings:
  - title: "Redis docs — Data types"
    url: https://redis.io/docs/latest/develop/data-types/
    kind: docs
  - title: "Redis docs — Key eviction"
    url: https://redis.io/docs/latest/develop/reference/eviction/
    kind: docs
  - title: "Redis docs — Persistence"
    url: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
    kind: docs
interview:
  - q: "How would you implement a leaderboard?"
    a: "A sorted set: ZINCRBY to update scores, ZREVRANGE (or ZRANGE … REV) WITH SCORES for top N, ZREVRANK for a user's position — all O(log n)."
  - q: "Why is Redis fast despite being single-threaded for commands?"
    a: "In-memory data, efficient data structures, an event loop with non-blocking I/O, no lock contention. The flip side: one slow command (KEYS *, big LRANGE) blocks everyone."
selfAssessment:
  - I can map five problems to Redis data types
  - I can explain why KEYS * is dangerous in production
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "A per-user fixed-window rate limiter is most simply built with:"
    options: ["A sorted set per request", "INCR on a key with EXPIRE for the window", "Pub/Sub", "A list"]
    answer: 1
    why: "INCR is atomic; sliding windows can use sorted sets."
  - q: "Running KEYS * on a large production instance:"
    options: ["Is fine", "Blocks the server while it scans all keys — use SCAN", "Deletes keys", "Is faster than SCAN always"]
    answer: 1
    why: "Commands execute one at a time."
  - q: "With maxmemory-policy allkeys-lru, when memory is full Redis:"
    options: ["Crashes", "Evicts approximately least recently used keys", "Rejects all writes", "Writes to disk"]
    answer: 1
    why: "noeviction would reject writes instead."
explain:
  prompt: "Explain how you'd use Redis for sessions and rate limiting, and what happens if Redis restarts."
  rubric:
    - "Sessions as hashes/strings with TTL refreshed on use"
    - "Rate limit with atomic INCR+EXPIRE or Lua/sorted set"
    - "Persistence/replication choices and data loss window"
    - "Fallback behaviour when unavailable"
  model: "Sessions are stored as a hash keyed by session id with a TTL that's refreshed on activity, so expired sessions disappear automatically. For rate limiting I'd INCR a key like rl:{user}:{minute} and set EXPIRE on first increment, rejecting once the count exceeds the limit; a sliding window can use a sorted set of timestamps in a Lua script for atomicity. If Redis restarts, data since the last RDB snapshot or AOF fsync can be lost, so users might be logged out and counters reset; with replication and a failover the loss window shrinks. I'd decide fail-open or fail-closed per use: rate limiting usually fails open briefly, sessions might force re-login."
cards:
  - q: "Redis leaderboard"
    a: "Sorted set: ZINCRBY, ZRANGE … REV WITHSCORES, ZREVRANK."
  - q: "KEYS vs SCAN"
    a: "KEYS blocks for O(N); SCAN iterates incrementally with a cursor."
---

## Explanation

### Data types → use cases

| Type | Use |
|---|---|
| String | cache values, counters (`INCR`), flags |
| Hash | objects/sessions (`HSET user:1 name …`) |
| List | queues (`LPUSH`/`BRPOP`), recent items |
| Set | unique members, tags, membership tests |
| Sorted set | leaderboards, time-ordered indexes, sliding windows |
| Stream | append-only log with consumer groups |
| HyperLogLog / Bitmap | approximate unique counts / compact flags |

### Execution model

Commands run one at a time on the main thread → every command is atomic. `MULTI/EXEC` queues commands; `WATCH` gives optimistic check-and-set; **Lua scripts** run atomically for multi-step logic.

### Durability and availability

- **RDB** snapshots (compact, may lose minutes), **AOF** append log (`appendfsync everysec` loses ~1 s).
- Replication is asynchronous → acknowledged writes can be lost on failover.
- Sentinel or Redis Cluster for failover/sharding (16384 hash slots; multi-key ops need same slot — hash tags `{user1}`).

### Distributed locks

`SET lock:x <token> NX PX 30000`, release only if token matches (Lua). Caveat: with async replication and process pauses, a Redis lock is not a correctness guarantee — protect the resource with **fencing tokens** or DB constraints when correctness matters.

## Worked examples

```text
# Fixed-window rate limit: 100 req/min
MULTI
INCR rl:user42:202611101530
EXPIRE rl:user42:202611101530 60
EXEC   → if count > 100, reject (429)
```

## Common misconceptions

- **"Redis is just a cache."** — It's a data-structure server; but treat it as volatile unless configured for durability.
- **"Redis locks are safe for mutual exclusion."** — Only with fencing or when occasional double execution is acceptable.

## Practical exercises

1. Implement a sliding-window rate limiter with a sorted set (ZADD, ZREMRANGEBYSCORE, ZCARD) and explain atomicity.
2. Choose an eviction policy for a pure cache vs a session store and justify it.
