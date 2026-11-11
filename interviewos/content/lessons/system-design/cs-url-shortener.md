---
slug: cs-url-shortener
title: "Case study: URL shortener"
path: system-design
module: sd-case-studies
order: 1
minutes: 50
depth: full
practice: conceptual
summary: A classic read-heavy design — key generation, storage, redirects, caching, analytics and abuse prevention — worked end to end.
prerequisites: [sd-requirements, sd-estimation, sd-data-caching]
problems: []
objectives:
  - Clarify requirements and estimate load for a read-heavy service
  - Compare key generation strategies (hash, counter + base62, random with collision check)
  - Design the redirect path for low latency with caching and the analytics path asynchronously
readings:
  - title: "System Design Primer — Design Pastebin / URL shortener"
    url: https://github.com/donnemartin/system-design-primer/blob/master/solutions/system_design/pastebin/README.md
    kind: docs
  - title: "RFC 9110 — Redirection 3xx (301, 302, 307, 308)"
    url: https://www.rfc-editor.org/rfc/rfc9110#name-redirection-3xx
    kind: rfc
interview:
  - q: "How do you generate short codes?"
    a: "Options: (1) a global counter/sequence encoded in base62 — unique, short, but predictable and needs a distributed ID allocator (ranges per server); (2) random 7-char base62 with a uniqueness check (unique constraint, retry on collision) — unpredictable; (3) hash of the URL truncated — dedupes identical URLs but collisions need handling. 62^7 ≈ 3.5 trillion codes."
  - q: "301 or 302 redirect?"
    a: "301 (permanent) is cached by browsers, reducing load but hiding subsequent clicks from analytics and making destination changes hard. 302/307 (temporary) hits the service every time, enabling accurate analytics and editable links."
  - q: "How do you collect click analytics without slowing redirects?"
    a: "Redirect immediately and emit a click event asynchronously (queue/log); aggregate in a stream processor or batch into an analytics store. Never block the redirect on analytics writes."
selfAssessment:
  - I can present the full design in 20 minutes
  - I can compare three key generation strategies
completion:
  - Score at least 70% on the quiz
  - Do a system design mock on this prompt
quiz:
  - q: "How many distinct 7-character base62 codes exist?"
    options: ["~62 million", "~3.5 trillion", "~10^7", "~2^32"]
    answer: 1
    why: "62^7 ≈ 3.52 × 10^12."
  - q: "The redirect path should read from:"
    options: ["The analytics DB", "A cache (Redis/CDN) in front of the key-value/relational store", "Kafka", "A batch job"]
    answer: 1
    why: "Reads dominate and are highly cacheable."
  - q: "Sequential codes are a problem because:"
    options: ["They're long", "They're enumerable — anyone can crawl all links", "They collide", "They're slow"]
    answer: 1
    why: "Use random codes or scramble the counter if privacy matters."
explain:
  prompt: "Design a URL shortener handling 100M new links per month and 10B redirects per month."
  rubric:
    - "Requirements and estimates (writes ~40/s, reads ~4k/s avg, storage)"
    - "API: POST /links, GET /{code} redirect; optional custom alias and expiry"
    - "Key generation strategy with collision handling"
    - "Read path: cache + DB, 302 vs 301 decision; analytics async"
    - "Abuse: rate limiting, malicious URL scanning; scaling/partitioning"
  model: "Requirements: create short links, optionally with custom alias and expiry, and redirect fast; analytics on clicks; links must not be lost. 100 million links a month is about 40 writes per second; 10 billion redirects is about 4,000 reads per second on average, with peaks maybe five times higher, and storage around 50 GB a month at roughly 500 bytes per link. API: POST /links returns the code; GET /{code} redirects. For codes I'd generate random 7-character base62 strings and insert with a unique constraint, retrying on the rare collision, which keeps links unguessable. Links live in PostgreSQL or a key-value store keyed by code. The redirect path checks Redis first, falls back to the database, and returns a 302 so every click reaches us for analytics; the click event goes to a queue and is aggregated asynchronously. Popular links can also be cached at a CDN with a short TTL. For abuse I'd rate-limit creation per user and IP and scan destinations against malware lists. Since writes are low and reads are cacheable, one primary database with replicas goes a long way; partition by code hash when storage grows."
cards:
  - q: "URL shortener key strategies"
    a: "Counter+base62 (needs ID allocation, enumerable), random+unique check, hash+collision handling."
  - q: "301 vs 302 for shorteners"
    a: "301 cached by browsers (less load, lost analytics); 302/307 every click hits you."
---

## Explanation

### Requirements

- Functional: shorten URL (optional alias, expiry), redirect, basic click stats.
- Non-functional: very low redirect latency, high availability for reads, durability of mappings, unguessable codes (if private), abuse prevention.

### Estimates

Writes ≈ 40/s, reads ≈ 4k/s average (peak 20k/s), storage ≈ 0.6 TB/year (500 B/link) — modest; reads dominate.

### API

```text
POST /links { url, alias?, expiresAt? } → 201 { code, shortUrl }
GET  /{code} → 302 Location: <url>   (404 if unknown, 410 if expired)
GET  /links/{code}/stats
```

### Data model

`links(code PK, url, owner_id, created_at, expires_at)`; clicks in an analytics store (`clicks(code, ts, country, referrer)`), aggregated.

### Architecture

```text
client → CDN/edge → redirect service → Redis → links DB
                       └─ click event → queue → aggregator → analytics DB
create API → key generator → links DB (unique constraint)
```

### Deep dives

- **Key generation**: random + retry is simplest at this scale; a counter with per-node ranges (ticket server) avoids collisions; Snowflake-style IDs if ordering matters.
- **Caching**: hot links follow a power law → high hit ratio; cache negative lookups briefly.
- **Expiry**: check on read; lazy deletion plus periodic cleanup.
- **Abuse**: rate limits, URL reputation checks, report/disable flow.

## Worked examples

Collision probability with random 7-char codes after 1 billion links: ~10^9 / 3.5·10^12 ≈ 0.03% chance per new insert — the unique constraint + retry handles it cheaply.

## Common misconceptions

- **"Use an MD5 of the URL."** — Truncation collides and identical URLs from different users may need different links.
- **"Write analytics synchronously."** — It slows every redirect.

## Practical exercises

1. Run a system design mock with this prompt and compare with this lesson.
2. Prototype `links` in PostgreSQL with a random code generator and measure collision retries.
