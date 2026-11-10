---
slug: sql-queries
title: SQL queries, joins and aggregation
path: backend
module: be-databases
order: 1
minutes: 45
depth: concise
practice: lab
summary: Joins, grouping, window functions and the NULL rules that trip people up — written so you can reason about results, not just syntax.
prerequisites: []
problems: []
objectives:
  - Write inner/left joins and know how NULLs and missing rows behave
  - Aggregate with GROUP BY/HAVING and use window functions for top-N per group
  - Avoid classic mistakes — accidental fan-out, NOT IN with NULLs, implicit casts
readings:
  - title: "PostgreSQL docs — Queries (SELECT)"
    url: https://www.postgresql.org/docs/current/queries.html
    kind: docs
  - title: "PostgreSQL docs — Window functions tutorial"
    url: https://www.postgresql.org/docs/current/tutorial-window.html
    kind: docs
interview:
  - q: "Find each customer's most recent order."
    a: "Use a window function: SELECT * FROM (SELECT o.*, row_number() OVER (PARTITION BY customer_id ORDER BY created_at DESC) rn FROM orders o) t WHERE rn = 1 — or DISTINCT ON (customer_id) in PostgreSQL."
  - q: "Why can NOT IN (subquery) return no rows unexpectedly?"
    a: "If the subquery returns any NULL, x NOT IN (…, NULL) evaluates to UNKNOWN for every x, so nothing qualifies. Use NOT EXISTS instead."
selfAssessment:
  - I can write top-N-per-group queries two ways
  - I can predict LEFT JOIN results with missing matches
completion:
  - Score at least 70% on the quiz
  - Complete the PostgreSQL lab join/aggregation steps
quiz:
  - q: "LEFT JOIN orders o ON o.customer_id = c.id WHERE o.status = 'paid' behaves like:"
    options: ["A left join", "An inner join — the WHERE filters out customers without orders", "A cross join", "An error"]
    answer: 1
    why: "Move the condition into the ON clause to keep customers without paid orders."
  - q: "COUNT(column) vs COUNT(*):"
    options: ["Identical", "COUNT(column) ignores NULLs", "COUNT(*) ignores NULLs", "COUNT(column) is always faster"]
    answer: 1
    why: "COUNT(*) counts rows."
  - q: "HAVING filters:"
    options: ["Rows before grouping", "Groups after aggregation", "Joins", "Indexes"]
    answer: 1
    why: "WHERE filters rows before GROUP BY."
explain:
  prompt: "Explain how you'd write a query for 'top 3 products by revenue in each category' and what pitfalls you'd watch for."
  rubric:
    - "Joins order lines/products correctly and aggregates revenue per product"
    - "Uses a window function (row_number/rank) partitioned by category"
    - "Discusses ties (rank vs row_number) and NULL handling"
    - "Mentions performance (indexes, pre-aggregation) and avoiding fan-out double counting"
  model: "I'd first aggregate revenue per product by joining order_items to products and summing quantity times price, grouped by category and product. Then wrap that in a subquery or CTE and apply row_number() OVER (PARTITION BY category ORDER BY revenue DESC), keeping rows where the rank is at most three. If ties should all be included I'd use rank or dense_rank instead of row_number. I'd watch for fan-out: joining another one-to-many table before aggregating would multiply revenue, so aggregate first or join carefully. For large data I'd make sure the join keys are indexed or keep a pre-aggregated daily revenue table."
cards:
  - q: "Top-N per group"
    a: "row_number() OVER (PARTITION BY g ORDER BY x DESC) ≤ N, or DISTINCT ON for N = 1 in Postgres."
  - q: "NOT IN with NULLs"
    a: "Returns nothing if the subquery has a NULL — use NOT EXISTS."
---

## Explanation

### Joins

- `INNER JOIN` — matching rows only.
- `LEFT JOIN` — all left rows, NULLs where no match. Conditions on the right table belong in `ON` if you want to keep unmatched rows.
- **Fan-out**: joining two one-to-many relations multiplies rows; aggregate before joining or use subqueries.

### Aggregation

`GROUP BY` collapses rows; every selected column is grouped or aggregated. `HAVING` filters groups. `COUNT(*)` counts rows, `COUNT(col)` skips NULLs.

### Window functions

Compute over related rows without collapsing them: `row_number()`, `rank()`, `lag()`, `sum() OVER (ORDER BY day ROWS BETWEEN 6 PRECEDING AND CURRENT ROW)` for moving averages.

### NULL semantics

Three-valued logic: `NULL = NULL` is unknown. Use `IS NULL`, `COALESCE`, `IS DISTINCT FROM`. Prefer `NOT EXISTS` over `NOT IN`.

## Worked examples

```sql
-- Revenue per country for paid orders, only countries above 10k
SELECT c.country, SUM(o.amount_cents) / 100.0 AS revenue
FROM orders o JOIN customers c ON c.id = o.customer_id
WHERE o.status = 'paid'
GROUP BY c.country
HAVING SUM(o.amount_cents) > 1000000
ORDER BY revenue DESC;

-- Latest order per customer (PostgreSQL)
SELECT DISTINCT ON (customer_id) customer_id, id, created_at
FROM orders ORDER BY customer_id, created_at DESC;
```

## Common misconceptions

- **"LEFT JOIN + WHERE on the right table is still a left join."** — It becomes inner.
- **"GROUP BY sorts results."** — Use ORDER BY.
- **"NULL means zero or empty string."** — It means unknown.

## Practical exercises

1. In the **PostgreSQL lab** dataset, write: orders per country, average order value per status, top 3 customers per country.
2. Rewrite a `NOT IN` query with `NOT EXISTS` and test with a NULL in the subquery.
