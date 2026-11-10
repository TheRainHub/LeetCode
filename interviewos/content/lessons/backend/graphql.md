---
slug: graphql
title: GraphQL
path: backend
module: be-apis
order: 2
minutes: 35
depth: concise
practice: conceptual
summary: Schemas, queries and resolvers — what GraphQL solves, the N+1 problem and DataLoader, and the operational trade-offs versus REST.
prerequisites: [rest-api-design]
problems: []
objectives:
  - Explain schema, query, mutation, resolver and how a query is executed
  - Solve the N+1 problem with batching (DataLoader)
  - Compare GraphQL and REST for caching, versioning, security and performance
readings:
  - title: "GraphQL — Learn"
    url: https://graphql.org/learn/
    kind: docs
  - title: "GraphQL — DataLoader (GitHub)"
    url: https://github.com/graphql/dataloader
    kind: docs
interview:
  - q: "What is the N+1 problem in GraphQL and how do you fix it?"
    a: "Resolving a list of N parents then a field per parent triggers N extra queries (e.g. author per post). DataLoader batches all keys requested in the same tick into one query (WHERE id IN (...)) and caches per request."
  - q: "When would you choose GraphQL over REST?"
    a: "Many clients with different data needs (mobile vs web), aggregating several backends, rapidly evolving UIs. Costs: harder HTTP caching, query complexity/cost limiting, more complex server and monitoring. REST fits simple resource APIs, public caching and webhooks."
selfAssessment:
  - I can explain resolver execution and N+1
  - I know how to protect a GraphQL API from expensive queries
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "GraphQL queries are typically sent as:"
    options: ["Multiple REST endpoints", "A POST to a single endpoint with the query document", "SQL", "gRPC only"]
    answer: 1
    why: "GET is possible for persisted queries, which also helps caching."
  - q: "Over-fetching means:"
    options: ["Too many requests", "Receiving more fields than the client needs", "Queries that time out", "Too many resolvers"]
    answer: 1
    why: "GraphQL lets clients select exactly the fields they need."
  - q: "Protecting against expensive nested queries uses:"
    options: ["Bigger servers", "Depth/complexity limits, pagination limits and persisted queries", "HTTP/2", "CORS"]
    answer: 1
    why: "Clients can otherwise craft queries that explode in cost."
explain:
  prompt: "Explain how a GraphQL query is executed and how you'd avoid the N+1 problem."
  rubric:
    - "Schema defines types; query selects fields; resolvers fetch each field"
    - "Execution walks the query tree calling resolvers per field"
    - "Nested list fields cause N+1 queries"
    - "DataLoader batches and caches per request"
  model: "The schema defines types and fields; a client sends a query selecting exactly the fields it wants. The server validates it against the schema and walks the selection tree, calling a resolver for each field, passing each parent object to its children's resolvers. That's where N+1 appears: a query for 50 posts and each post's author calls the author resolver 50 times, each doing its own database query. DataLoader fixes it by collecting all author ids requested in the same execution tick and loading them with one batched query, caching results for the rest of the request."
cards:
  - q: "GraphQL N+1 fix"
    a: "DataLoader: batch keys per tick + per-request cache."
  - q: "GraphQL caching challenge"
    a: "Single POST endpoint defeats HTTP caching → persisted queries, client normalised caches."
---

## Explanation

- **Schema** (SDL): types, fields, arguments; the contract.
- **Query** (read), **Mutation** (write), **Subscription** (push).
- **Resolvers**: functions per field; execution walks the query tree.

```graphql
type Post { id: ID!  title: String!  author: User! }
type Query { posts(first: Int = 20, after: String): PostConnection! }
query { posts(first: 10) { edges { node { title author { name } } } } }
```

### N+1 and batching

Resolving `author` per post issues N queries. **DataLoader** collects keys during one tick and calls a batch function once (`SELECT * FROM users WHERE id = ANY($1)`), caching results per request.

### Trade-offs vs REST

| Concern | REST | GraphQL |
|---|---|---|
| Over/under-fetching | common | client chooses fields |
| HTTP caching | natural (GET + URLs) | harder (POST); persisted queries help |
| Evolution | versions | additive schema + `@deprecated` |
| Security/cost | per endpoint | depth/complexity limits needed |
| Errors | status codes | 200 with `errors` array (partial results) |
| Tooling | OpenAPI | introspection, codegen, strong typing |

## Worked examples

Ataccama-style fullstack apps often use GraphQL between a React UI and Java backend: the UI requests exactly the columns a data-quality table shows; the backend uses batched loaders to fetch related metadata in bulk.

## Common misconceptions

- **"GraphQL replaces the database layer."** — It's an API layer; resolvers still query data stores.
- **"GraphQL is always faster."** — Poor resolvers make it slower; batching and limits are essential.

## Practical exercises

1. Write a schema for classes and bookings; identify where N+1 occurs.
2. Sketch a DataLoader batch function and its SQL.
