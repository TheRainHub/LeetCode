---
slug: sd-estimation
title: Back-of-the-envelope estimation
path: system-design
module: sd-method
order: 2
minutes: 30
depth: concise
practice: conceptual
summary: Turning users into QPS, storage and bandwidth quickly, with latency numbers every engineer should know, and knowing when estimates actually change the design.
prerequisites: [sd-requirements]
problems: []
objectives:
  - Convert DAU and actions into average and peak QPS
  - Estimate storage and bandwidth over time with round numbers
  - Use latency and throughput reference numbers to sanity-check designs
readings:
  - title: "Jeff Dean — Latency numbers every programmer should know (via System Design Primer)"
    url: https://github.com/donnemartin/system-design-primer#latency-numbers-every-programmer-should-know
    kind: docs
  - title: "System Design Primer — Back-of-the-envelope calculations"
    url: https://github.com/donnemartin/system-design-primer#appendix
    kind: docs
interview:
  - q: "Estimate QPS for 10 million DAU each making 20 requests per day."
    a: "200 M requests/day ÷ ~10^5 seconds/day (86,400) ≈ 2,000–2,300 QPS average; peak maybe 2–5× → ~5,000–10,000 QPS. State the peak factor as an assumption."
  - q: "Why estimate at all?"
    a: "To decide whether a single database/machine suffices, whether sharding or caching is needed, and storage/cost implications. Only estimate what changes decisions."
selfAssessment:
  - I can compute QPS, storage and bandwidth in under 3 minutes
  - I remember rough latency orders of magnitude
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Seconds in a day, rounded for estimates:"
    options: ["~10^3", "~10^5 (86,400)", "~10^7", "~10^9"]
    answer: 1
    why: "1 M requests/day ≈ 12 QPS."
  - q: "Storing 1 KB per event at 1,000 events/s for one year needs roughly:"
    options: ["31 GB", "~31 TB", "3 PB", "310 MB"]
    answer: 1
    why: "1 KB × 1,000 × 3.15·10^7 s ≈ 3.15·10^10 KB ≈ 31.5 TB (before replication)."
  - q: "Which is slowest?"
    options: ["L1 cache reference", "Main memory reference", "Round trip within a datacenter", "Round trip Europe ↔ US"]
    answer: 3
    why: "~100+ ms vs ~0.5 ms in-datacenter vs ~100 ns memory."
explain:
  prompt: "Estimate the storage and QPS for a URL shortener with 100 million new URLs per month and a 100:1 read/write ratio."
  rubric:
    - "Write QPS ≈ 100M / (30·86,400) ≈ 40/s; reads ≈ 4,000/s average, higher peak"
    - "Storage per record (~500 bytes) × 100M × 12 × years"
    - "States assumptions and rounding clearly"
    - "Draws design implications (cache reads, single DB may suffice for writes)"
  model: "100 million new URLs per month is about 100 million divided by 2.6 million seconds, roughly 40 writes per second. With a 100:1 ratio that's about 4,000 reads per second on average; assuming peaks of three to five times, around 15,000 to 20,000 reads per second. If each record — short code, long URL, owner, timestamps — is about 500 bytes, that's 50 GB per month, 600 GB per year, and a few terabytes over five years before replication. Implications: writes are easily handled by one primary database; reads are the challenge, but they're highly cacheable, so a cache in front of the database or a CDN handles most of them; storage growth suggests planning partitioning eventually but not on day one."
cards:
  - q: "1 M requests/day ≈"
    a: "~12 QPS (≈ 10^6 / 86,400)."
  - q: "Latency orders of magnitude"
    a: "Memory ~100 ns, SSD read ~100 µs, DC round trip ~0.5 ms, cross-continent ~100 ms."
---

## Explanation

### Recipe

1. **QPS** = DAU × actions/user/day ÷ 86,400; **peak** = 2–10× average (state assumption).
2. **Storage** = records/day × bytes/record × retention × replication factor.
3. **Bandwidth** = QPS × response size.
4. **Memory for cache** ≈ hot fraction (e.g. 20%) of daily read working set.

### Handy numbers

| Quantity | Value |
|---|---|
| Seconds/day | ~86,400 ≈ 10^5 |
| Seconds/month | ~2.6 × 10^6 |
| Seconds/year | ~3.15 × 10^7 |
| Memory reference | ~100 ns |
| SSD random read | ~100 µs |
| Same-DC round trip | ~0.5 ms |
| Cross-continent round trip | ~100–150 ms |
| A well-indexed Postgres instance | thousands to tens of thousands of simple queries/s (hardware-dependent) |

Use powers of ten; precision doesn't matter, the order of magnitude does.

## Worked examples

Booking platform: 5,000 studios × 20 classes/day = 100,000 classes/day; average 10 bookings each → 1 M bookings/day ≈ 12 writes/s average. But a popular class opening at 08:00 may get 2,000 attempts in seconds — the **peak on one row** is the real design driver, not average QPS.

## Common misconceptions

- **"Estimates must be precise."** — Round aggressively; show reasoning.
- **"Average QPS is enough."** — Peaks and hot keys drive design.

## Practical exercises

1. Estimate QPS/storage for a chat app with 5 M DAU sending 40 messages/day.
2. Estimate the cache size for a product catalogue where 10% of products get 90% of views.
