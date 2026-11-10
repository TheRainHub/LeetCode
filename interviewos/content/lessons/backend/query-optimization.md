---
slug: query-optimization
title: Query plans and optimization
path: backend
module: be-databases
order: 3
minutes: 50
depth: full
practice: lab
summary: Reading EXPLAIN (ANALYZE, BUFFERS), spotting bad estimates, join algorithms, and a repeatable process for fixing slow queries.
prerequisites: [postgres-indexes]
problems: []
objectives:
  - Read an EXPLAIN ANALYZE plan bottom-up and identify the expensive node
  - Recognise misestimates (estimated vs actual rows) and fix them with statistics or rewrites
  - Explain nested loop, hash and merge joins and when the planner picks each
  - Apply a systematic process — measure, hypothesise, change one thing, re-measure
readings:
  - title: "PostgreSQL docs — Using EXPLAIN"
    url: https://www.postgresql.org/docs/current/using-explain.html
    kind: docs
  - title: "PostgreSQL docs — Statistics used by the planner"
    url: https://www.postgresql.org/docs/current/planner-stats.html
    kind: docs
  - title: "PostgreSQL docs — pg_stat_statements"
    url: https://www.postgresql.org/docs/current/pgstatstatements.html
    kind: docs
interview:
  - q: "A query got slow in production. How do you investigate?"
    a: "Find it and its frequency (pg_stat_statements, slow-query logs), get the plan with EXPLAIN (ANALYZE, BUFFERS) on realistic data, find the node with the most time/buffers, compare estimated vs actual rows, then fix the cause — missing/wrong index, stale statistics, non-sargable predicate, N+1 from the app — and re-measure. Check locks too if time is spent waiting."
  - q: "What does it mean when estimated rows are 1 and actual rows are 50,000?"
    a: "The planner misestimated, so it likely picked the wrong plan (e.g. nested loop instead of hash join). Causes: stale stats (run ANALYZE), correlated columns (extended statistics), functions or casts hiding columns, parameterised generic plans. Fix the estimate and the plan usually follows."
  - q: "What's an N+1 query problem in an ORM?"
    a: "Loading N parent rows then lazily loading a relation for each one issues N extra queries. Fix with eager loading/join fetch, batching (WHERE id IN), or a single aggregated query."
selfAssessment:
  - I can read an EXPLAIN ANALYZE plan and point to the bottleneck
  - I can explain the three join algorithms
  - I can list five causes of slow queries
completion:
  - Score at least 70% on the quiz
  - Verify the PostgreSQL lab's EXPLAIN steps
  - Explain your investigation process in interview mode
quiz:
  - q: "EXPLAIN without ANALYZE:"
    options: ["Runs the query", "Shows the estimated plan without executing it", "Shows actual timings", "Locks the table"]
    answer: 1
    why: "ANALYZE executes the query — careful with writes (wrap in a transaction and roll back)."
  - q: "Best join algorithm for joining two large unsorted tables on equality:"
    options: ["Nested loop", "Hash join", "Cross join", "Index-only scan"]
    answer: 1
    why: "Build a hash table on the smaller input, probe with the larger. Nested loops shine when the outer side is small and the inner has an index."
  - q: "WHERE created_at::date = '2026-11-01' is slow because:"
    options: ["Dates are slow", "The cast prevents a plain index on created_at from being used", "Postgres caches it", "It's a full join"]
    answer: 1
    why: "Rewrite as a range: created_at >= '2026-11-01' AND created_at < '2026-11-02'."
  - q: "OFFSET 100000 LIMIT 20 is slow because:"
    options: ["LIMIT is broken", "The database must produce and discard 100000 rows", "Indexes don't work with LIMIT", "It always does a seq scan"]
    answer: 1
    why: "Use keyset pagination."
explain:
  prompt: "Walk through how you'd diagnose and fix a slow dashboard query on a large orders table."
  rubric:
    - "Measure first: pg_stat_statements / logs, frequency and latency"
    - "EXPLAIN (ANALYZE, BUFFERS) read bottom-up; find expensive node"
    - "Compare estimated vs actual rows; consider stale stats"
    - "Concrete fixes: index matching predicates and sort, sargable rewrites, keyset pagination, pre-aggregation"
    - "Re-measure and consider write cost / side effects"
  model: "First I'd confirm which query is slow and how often it runs using pg_stat_statements, so I optimise what actually matters. Then I'd run EXPLAIN (ANALYZE, BUFFERS) against production-like data and read the plan bottom-up, looking for the node with most time and buffers — typically a sequential scan filtering out most rows, a sort spilling to disk, or a nested loop running thousands of times. I'd compare estimated and actual rows; a big gap means stale or insufficient statistics, so ANALYZE or extended statistics may fix the plan. Then I'd fix the root cause: a composite index matching the WHERE and ORDER BY, rewriting non-sargable predicates like casts on columns into ranges, replacing OFFSET with keyset pagination, or pre-aggregating with a materialised view for heavy dashboard aggregates. Finally I'd re-run the plan to confirm improvement and consider the write cost of new indexes."
cards:
  - q: "How to read EXPLAIN ANALYZE"
    a: "Bottom-up/inside-out; per node: actual time, rows × loops, estimated vs actual rows, buffers."
  - q: "Nested loop vs hash vs merge join"
    a: "NL: small outer + indexed inner. Hash: large unsorted equality joins. Merge: both sides sorted on the key."
  - q: "Non-sargable predicate"
    a: "A predicate that hides the column (function, cast, leading wildcard) so an index can't be used."
---

## Explanation

### EXPLAIN anatomy

```text
Limit  (cost=0.43..12.10 rows=20 width=24) (actual time=0.031..0.090 rows=20 loops=1)
  ->  Index Scan Backward using orders_created_idx on orders  (actual time=0.030..0.085 rows=20 loops=1)
        Filter: (status = 'paid')
        Rows Removed by Filter: 7
        Buffers: shared hit=24
Planning Time: 0.12 ms   Execution Time: 0.11 ms
```

- `cost` = planner estimate (arbitrary units, startup..total); `actual time` in ms per loop.
- **rows × loops** gives total rows produced; inner nodes of nested loops run many times.
- **Buffers**: `shared hit` from cache, `read` from disk — I/O is often the real cost.
- `Rows Removed by Filter` large → predicate not supported by an index.

### Common bottlenecks

| Symptom in plan | Likely fix |
|---|---|
| Seq Scan with huge "Rows Removed by Filter" | index on the predicate |
| Sort + `external merge Disk` | index providing order, or more `work_mem` for that query |
| Nested Loop with high loops and misestimated rows | ANALYZE / extended stats / rewrite |
| Hash join with batches > 1 | memory pressure; reduce input or raise `work_mem` |
| Time spent but small plan | lock waits — check `pg_stat_activity`, `pg_locks` |

### Join algorithms

- **Nested loop**: for each outer row, look up inner (ideally via index). Great for small outer sets.
- **Hash join**: build hash table on smaller input, probe with larger. Equality only.
- **Merge join**: both inputs sorted on the key, walk them together.

### Application-level problems

N+1 queries, fetching unused columns (`SELECT *` preventing index-only scans), chatty transactions, missing pagination, or queries in loops. Often the biggest wins are here, not in SQL tuning.

### Process

1. Measure (pg_stat_statements: total time = calls × mean).
2. EXPLAIN (ANALYZE, BUFFERS) on realistic data.
3. One hypothesis, one change.
4. Re-measure; check write and storage cost.

## Worked examples

### Non-sargable to sargable

```sql
-- slow: function hides the column
SELECT * FROM orders WHERE date_trunc('day', created_at) = '2026-11-01';
-- fast: range predicate uses the index on created_at
SELECT * FROM orders WHERE created_at >= '2026-11-01' AND created_at < '2026-11-02';
```

### Misestimate from correlated columns

`WHERE city = 'Prague' AND country = 'CZ'`: the planner multiplies selectivities as if independent and underestimates rows. `CREATE STATISTICS … (dependencies) ON city, country FROM customers; ANALYZE customers;` lets it account for the correlation.

## Common misconceptions

- **"Cost is milliseconds."** — Cost is in abstract units; read `actual time`.
- **"EXPLAIN ANALYZE is safe for UPDATEs."** — It executes them; wrap in `BEGIN … ROLLBACK`.
- **"Adding RAM fixes slow queries."** — Bad plans stay bad; fix the plan.
- **"The ORM generates good SQL."** — Check the generated SQL and query counts.

## Practical exercises

1. In the **PostgreSQL lab**, capture before/after plans and compute the speedup.
2. Write the same query with OFFSET and keyset pagination; compare plans at deep pages.
3. Enable `pg_stat_statements` locally and find the top 3 queries by total time after using the app.
