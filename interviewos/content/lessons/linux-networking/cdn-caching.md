---
slug: cdn-caching
title: CDN architecture and HTTP caching
path: linux-networking
module: net-edge
order: 1
minutes: 55
depth: full
practice: conceptual
summary: How CDNs route users to edges, decide cache hits with cache keys and HTTP headers, keep content fresh, and protect the origin.
prerequisites: [http-versions, dns]
problems: []
objectives:
  - Explain how users reach a CDN edge (DNS/anycast) and the edge → shield → origin hierarchy
  - Control caching with Cache-Control, ETag, Vary and surrogate controls, and design cache keys
  - Choose invalidation strategies — TTLs, purge, versioned URLs — and stale-while-revalidate
  - Reason about hit ratio, origin load and failure modes (thundering herd, cache poisoning)
readings:
  - title: "RFC 9111 — HTTP Caching"
    url: https://www.rfc-editor.org/rfc/rfc9111
    kind: rfc
  - title: "MDN — HTTP caching"
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Caching
    kind: docs
  - title: "Cloudflare Learning Center — What is a CDN?"
    url: https://www.cloudflare.com/learning/cdn/what-is-a-cdn/
    kind: article
interview:
  - q: "How does a CDN decide whether a request is a cache hit?"
    a: "It computes a cache key (typically scheme, host, path, selected query parameters, and headers listed in Vary or configured), looks it up in the edge cache, and checks freshness from Cache-Control/Expires or CDN-specific TTLs. Fresh → hit; stale → revalidate with the origin (conditional request) or serve stale if allowed; missing → fetch from shield/origin."
  - q: "How do you deploy new CSS/JS without users getting stale files?"
    a: "Use content-hashed filenames (app.3f9a1c.js) with long max-age and immutable, and serve HTML with a short TTL or revalidation. New deployments reference new URLs, so no purge is needed."
  - q: "What is a thundering herd at the origin and how do CDNs prevent it?"
    a: "When a popular object expires, many edge requests miss simultaneously and hit the origin. Request coalescing/collapsing (one fetch per key), origin shielding (a mid-tier cache), stale-while-revalidate and jittered TTLs prevent it."
  - q: "What can go wrong with Vary?"
    a: "Varying on high-cardinality headers (User-Agent, Cookie) fragments the cache and kills hit ratio; normalise headers (e.g. device class) or exclude them from the key."
selfAssessment:
  - I can design cache headers for HTML, versioned assets and an API response
  - I can explain cache keys and why query strings matter
  - I can explain shielding and request coalescing
completion:
  - Score at least 70% on the quiz
  - Explain how a CDN serves and refreshes content in interview mode
quiz:
  - q: "Cache-Control: no-cache means:"
    options: ["Never store the response", "Store, but revalidate with the origin before each reuse", "Cache for one day", "Only browsers may cache"]
    answer: 1
    why: "no-store forbids storage; no-cache requires revalidation."
  - q: "Which header lets shared caches (CDNs) cache longer than browsers?"
    options: ["max-age", "s-maxage", "Expires", "Pragma"]
    answer: 1
    why: "s-maxage applies to shared caches only."
  - q: "A response with Set-Cookie for a logged-in user should usually be:"
    options: ["Cached at the edge for an hour", "Marked private or no-store to avoid serving it to other users", "Cached with Vary: User-Agent", "Purged immediately"]
    answer: 1
    why: "Caching personalised responses in shared caches leaks data between users."
  - q: "stale-while-revalidate=60 allows a cache to:"
    options: ["Serve a stale response for up to 60 s while fetching a fresh one in the background", "Never revalidate", "Delete the object after 60 s", "Retry the origin 60 times"]
    answer: 0
    why: "Hides origin latency from users and smooths load."
explain:
  prompt: "Walk an interviewer through what happens when a user requests an image from a website behind a CDN, from DNS to the response, including cache hits, misses and freshness."
  rubric:
    - "DNS/anycast routes the user to a nearby edge; TLS terminates at the edge"
    - "Edge computes a cache key and checks freshness (Cache-Control/TTL)"
    - "Hit: served from edge; miss/stale: fetched via shield/origin (conditional revalidation with ETag)"
    - "Response stored per cache headers; Vary and key design affect hit ratio"
    - "Invalidation via TTLs, purge, or versioned URLs; protection like request coalescing"
  model: "The browser resolves the site's hostname, usually a CNAME to the CDN, and the CDN answers with — or anycast routes to — a nearby edge, where TLS is terminated. The edge builds a cache key from the host, path and relevant query parameters or headers and looks it up. If it has a fresh copy according to Cache-Control or its configured TTL, it serves it immediately: a hit, with latency close to the user's RTT to the edge. If it's missing, the edge asks a shield or regional tier and finally the origin; if it's merely stale, it revalidates with If-None-Match and gets a cheap 304 when nothing changed. Concurrent misses for the same key are collapsed into one origin fetch. The response is stored according to its headers, so private or Set-Cookie responses aren't shared. Content is refreshed by TTL expiry, explicit purges, or, best for assets, by versioned URLs that never need purging."
cards:
  - q: "no-cache vs no-store"
    a: "no-cache: may store, must revalidate. no-store: never store."
  - q: "Asset caching strategy"
    a: "Hashed filenames + Cache-Control: public, max-age=31536000, immutable; short TTL for HTML."
  - q: "Origin protection"
    a: "Shield tier, request coalescing, stale-while-revalidate / stale-if-error, jittered TTLs."
---

## Explanation

### Why CDNs exist

Latency is dominated by RTT; a CDN puts caches (edges/PoPs) close to users, absorbs traffic spikes and DDoS, and offloads the origin. Hit ratio is the key metric: a 95% hit ratio means the origin sees 5% of requests.

### Getting users to an edge

- **DNS-based**: the customer CNAMEs to the CDN; the CDN's DNS answers with an edge chosen by geography, latency and load.
- **Anycast**: the same IP is announced from many locations; BGP routes users to a nearby one.

### Cache hierarchy

Edge → (optional) **shield / mid-tier** → origin. The shield turns many edge misses into one origin request per object.

### Freshness and validation

| Header | Meaning |
|---|---|
| `Cache-Control: max-age=N` | fresh for N seconds (all caches) |
| `s-maxage=N` | shared caches only (CDN) |
| `public` / `private` | may / may not be stored by shared caches |
| `no-cache` | store but revalidate before reuse |
| `no-store` | don't store |
| `immutable` | won't change during freshness; skip revalidation |
| `stale-while-revalidate=N`, `stale-if-error=N` | serve stale while refreshing / when origin fails |
| `ETag` / `Last-Modified` | validators for conditional requests (304) |
| `Vary: Accept-Encoding` | include these request headers in the cache key |

CDNs often add their own controls (surrogate keys/tags for grouped purges, edge TTL overrides).

### Cache keys

Default: method + scheme + host + path + query string. Design decisions: ignore tracking params (`utm_*`), sort query params, normalise `Accept-Encoding`, never key on raw `Cookie` for public content. Wrong keys either fragment the cache (low hit ratio) or merge distinct responses (wrong content served — or **cache poisoning** when unkeyed headers influence the response).

### Invalidation

1. **TTL expiry** — simple, eventual.
2. **Purge** (by URL, prefix, tag) — fast but operationally risky at scale.
3. **Versioned URLs** — best for static assets; no purge needed.

## Worked examples

### Header plan for a typical site

| Resource | Cache-Control |
|---|---|
| `/assets/app.3f9a1c.js` | `public, max-age=31536000, immutable` |
| `/index.html` | `public, max-age=0, s-maxage=60, stale-while-revalidate=30` |
| `/api/products?page=1` (public) | `public, s-maxage=30, stale-if-error=300` |
| `/api/me` | `private, no-store` |

### Diagnosing a low hit ratio

Logs show `/product.jpg?w=300&utm_source=newsletter&session=…`. Every request has a unique `session` param → every request misses. Fix: strip irrelevant params from the cache key (or the URL), keep only `w`.

## Common misconceptions

- **"no-cache means don't cache."** — It means revalidate.
- **"Purging is instantaneous everywhere."** — It propagates across PoPs and may race with in-flight fetches.
- **"Dynamic content can't use a CDN."** — Short TTLs, stale-while-revalidate, and edge TLS/connection reuse still help.
- **"More PoPs always means better hit ratio."** — More PoPs split traffic; shielding compensates.

## Practical exercises

1. Inspect `curl -sI` headers for three CDN-backed sites (look for `Cache-Control`, `Age`, `X-Cache`/`CF-Cache-Status`).
2. Write a header plan for an e-commerce site's HTML, assets, product API and cart API.
3. Explain to yourself how request coalescing prevents a thundering herd when a hot object expires.
