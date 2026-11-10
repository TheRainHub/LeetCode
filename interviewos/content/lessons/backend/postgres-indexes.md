---
slug: postgres-indexes
title: PostgreSQL indexes
path: backend
module: be-databases
order: 2
minutes: 55
depth: full
practice: lab
summary: B-trees and how the planner uses them — composite column order, covering and partial indexes, selectivity, and the write cost of every index.
prerequisites: [sql-queries]
problems: []
objectives:
  - Explain how a B-tree index speeds up equality, range and ORDER BY queries
  - Design composite indexes with the right column order (equality first, then range/sort)
  - Use partial, expression and covering (INCLUDE) indexes and know when GIN/BRIN fit
  - Explain why the planner may ignore an index (selectivity, statistics, functions on columns)
readings:
  - title: "PostgreSQL docs — Indexes"
    url: https://www.postgresql.org/docs/current/indexes.html
    kind: docs
  - title: "PostgreSQL docs — Multicolumn indexes"
    url: https://www.postgresql.org/docs/current/indexes-multicolumn.html
    kind: docs
  - title: "Use The Index, Luke — SQL indexing and tuning"
    url: https://use-the-index-luke.com/
    kind: book
interview:
  - q: "You have an index on (customer_id, created_at). Which queries can use it efficiently?"
    a: "WHERE customer_id = ? (with or without ORDER BY created_at), WHERE customer_id = ? AND created_at > ?. Not efficiently: WHERE created_at > ? alone, because the leading column isn't constrained (it would need a full index scan)."
  - q: "Why might PostgreSQL choose a sequential scan even though an index exists?"
    a: "The predicate matches a large fraction of rows (low selectivity), the table is small, statistics are stale, or the query wraps the column in a function/cast that doesn't match the index. Random index I/O is more expensive than sequential reads past a certain fraction."
  - q: "What's the cost of adding indexes?"
    a: "Every insert/update/delete must maintain each index (write amplification, WAL volume), they use disk and memory, and HOT updates are prevented when an indexed column changes. Index for real query patterns and drop unused indexes (pg_stat_user_indexes)."
selfAssessment:
  - I can choose column order for a composite index from a query
  - I can explain covering and partial indexes with examples
  - I can tell from EXPLAIN whether an index was used
completion:
  - Score at least 70% on the quiz
  - Verify the PostgreSQL lab
  - Explain composite index design in interview mode
quiz:
  - q: "WHERE lower(email) = 'a@b.com' can use:"
    options: ["An index on email", "An expression index on lower(email)", "Any index", "No index ever"]
    answer: 1
    why: "Functions on columns need a matching expression index (or citext)."
  - q: "For WHERE status = 'pending' ORDER BY created_at LIMIT 20, the best index is:"
    options: ["(created_at, status)", "(status, created_at)", "(status) only", "(created_at) only"]
    answer: 1
    why: "Equality column first, then the sort column → an ordered range read with early stop."
  - q: "A partial index like CREATE INDEX … WHERE status = 'pending' helps when:"
    options: ["Most rows are pending", "Queries target a small, frequently queried subset", "Never", "Only for primary keys"]
    answer: 1
    why: "Smaller index, cheaper maintenance, used when the query's predicate implies the index predicate."
  - q: "An index-only scan requires:"
    options: ["All needed columns in the index and mostly all-visible pages", "A primary key", "A GIN index", "No WHERE clause"]
    answer: 0
    why: "Covering indexes (INCLUDE) plus a well-vacuumed visibility map avoid heap fetches."
explain:
  prompt: "Given a slow query 'SELECT id, total FROM orders WHERE customer_id = $1 AND status = $2 ORDER BY created_at DESC LIMIT 20', design the index and explain how PostgreSQL will use it."
  rubric:
    - "Proposes (customer_id, status, created_at DESC) with equality columns first then sort column"
    - "Explains ordered index range scan with early stop at LIMIT (no sort node)"
    - "Optionally INCLUDE (total) or explains heap fetches"
    - "Validates with EXPLAIN (ANALYZE, BUFFERS) and considers selectivity and write cost"
  model: "Both customer_id and status are equality predicates and created_at is the sort key, so I'd create an index on (customer_id, status, created_at DESC). PostgreSQL can then jump to the entries for that customer and status, which are already ordered by created_at descending, read the first 20 and stop — no separate sort node and no scanning of older orders. If I want to avoid visiting the table I can add INCLUDE (total, id) for an index-only scan, which works well when the table is regularly vacuumed. I'd confirm with EXPLAIN (ANALYZE, BUFFERS) that the plan uses an Index Scan with a small number of rows and buffers, and weigh it against the extra write cost on a busy orders table."
cards:
  - q: "Composite index column order"
    a: "Equality predicates first, then range/sort columns."
  - q: "Why an index is ignored"
    a: "Low selectivity, small table, stale stats, functions/casts on the column, type mismatch."
  - q: "Index types beyond B-tree"
    a: "GIN (jsonb, arrays, full text), GiST (geo, ranges), BRIN (huge naturally ordered tables), hash (equality)."
---

## Explanation

### B-tree basics

The default index is a **B-tree**: sorted keys in a balanced tree of pages, leaves pointing to heap tuples (TIDs). Lookup is O(log n) page reads; **range scans** walk leaves in order. B-trees serve `=`, `<`, `>`, `BETWEEN`, `IN`, `IS NULL`, `LIKE 'prefix%'` (with suitable collation/opclass), and `ORDER BY` on the indexed columns.

### Composite indexes

The index on `(a, b, c)` is sorted by `a`, then `b`, then `c`. Usable for predicates on a **leftmost prefix**:

| Query | Uses (a, b, c)? |
|---|---|
| `a = 1` | yes |
| `a = 1 AND b = 2` | yes |
| `a = 1 AND b > 5 ORDER BY b` | yes |
| `a = 1 ORDER BY c` | partly (needs sort unless b fixed) |
| `b = 2` | not efficiently |

Rule of thumb: **equality columns first, then range or sort columns**.

### Special index forms

- **Partial**: `CREATE INDEX ON orders (created_at) WHERE status = 'pending';`
- **Expression**: `CREATE INDEX ON users (lower(email));`
- **Covering**: `CREATE INDEX ON orders (customer_id) INCLUDE (total);` enables index-only scans.
- **Unique**: enforce invariants (`UNIQUE (class_id, user_id)`), also usable for lookups.
- **GIN** for `jsonb`/arrays/full-text, **BRIN** for huge append-only tables ordered by time.

### The planner

Cost-based: estimates rows via statistics (`ANALYZE`) and chooses Seq Scan, Index Scan, Bitmap Index/Heap Scan, or Index Only Scan. Low selectivity favours sequential scans. Mismatches (wrong types, functions on columns) prevent index use.

### Costs

Indexes slow writes, consume space and cache, and can block HOT updates. Build them on large tables with `CREATE INDEX CONCURRENTLY` to avoid blocking writes. Find unused ones via `pg_stat_user_indexes.idx_scan`.

## Worked examples

### Before and after

```text
-- before: Seq Scan on orders  (cost=0.00..10234.00 rows=10 width=16) (actual time=0.03..48.1 rows=9)
--           Filter: (customer_id = 4242)  Rows Removed by Filter: 499991
CREATE INDEX CONCURRENTLY orders_customer_idx ON orders (customer_id);
-- after:  Index Scan using orders_customer_idx on orders (actual time=0.02..0.05 rows=9)
```
48 ms → 0.05 ms because the index turns a 500k-row filter into a handful of page reads. The **PostgreSQL lab** reproduces this.

### Selectivity

`WHERE status = 'paid'` where a third of rows are paid: an index on `status` won't help (too many rows); a partial index for the rare `pending` status might.

## Common misconceptions

- **"Index every column used in WHERE."** — Index for real query patterns; composite indexes beat many single-column ones.
- **"Column order in a composite index doesn't matter."** — It's the most important decision.
- **"If an index exists, Postgres will use it."** — Only when the planner estimates it's cheaper.
- **"Indexes are free."** — They cost write throughput and memory.

## Practical exercises

1. Complete the **PostgreSQL lab** (before/after EXPLAIN ANALYZE).
2. For five queries from a real project, design composite indexes and justify the column order.
3. Create a partial index for a rare status and verify it's used with EXPLAIN.
