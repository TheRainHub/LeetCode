---
slug: http-versions
title: HTTP semantics and HTTP/1.1, HTTP/2, HTTP/3
path: linux-networking
module: net-application
order: 3
minutes: 55
depth: full
practice: conceptual
summary: Methods, status codes and headers that every API relies on, and how each HTTP version changed the transport underneath.
prerequisites: [tcp-ip, tls]
problems: []
objectives:
  - Use methods, status codes and key headers correctly (safety, idempotency, caching, conditional requests)
  - Explain keep-alive and head-of-line blocking in HTTP/1.1
  - Explain HTTP/2 multiplexing, header compression and its TCP-level limitation
  - Explain HTTP/3 over QUIC and what it solves
readings:
  - title: "RFC 9110 — HTTP Semantics"
    url: https://www.rfc-editor.org/rfc/rfc9110
    kind: rfc
  - title: "RFC 9113 — HTTP/2"
    url: https://www.rfc-editor.org/rfc/rfc9113
    kind: rfc
  - title: "RFC 9114 — HTTP/3"
    url: https://www.rfc-editor.org/rfc/rfc9114
    kind: rfc
  - title: "MDN — An overview of HTTP"
    url: https://developer.mozilla.org/en-US/docs/Web/HTTP/Overview
    kind: docs
interview:
  - q: "Which HTTP methods are idempotent and why does it matter?"
    a: "GET, HEAD, OPTIONS, PUT and DELETE are idempotent: repeating them has the same effect as doing it once, so clients and proxies may retry them. POST (and PATCH, in general) is not, so retries need idempotency keys."
  - q: "What problem does HTTP/2 solve, and what problem remains?"
    a: "HTTP/1.1 needs a connection per in-flight request (or pipelining with head-of-line blocking). HTTP/2 multiplexes many streams over one TCP connection with binary framing and HPACK header compression. But a lost TCP packet still blocks all streams (TCP-level head-of-line blocking)."
  - q: "How does HTTP/3 fix TCP head-of-line blocking?"
    a: "It runs over QUIC (on UDP), which implements reliable streams independently, so loss on one stream doesn't block others. QUIC also merges the transport and TLS 1.3 handshakes (1 RTT, 0-RTT resumption) and supports connection migration across networks."
selfAssessment:
  - I can pick correct status codes for common API situations
  - I can explain the evolution from 1.1 to 3 in two minutes
completion:
  - Score at least 70% on the quiz
  - Explain HTTP/1.1 vs 2 vs 3 in interview mode
quiz:
  - q: "A request with valid credentials that lacks permission should get:"
    options: ["401", "403", "404", "400"]
    answer: 1
    why: "401 means unauthenticated (send credentials); 403 means authenticated but not allowed."
  - q: "If-None-Match with a matching ETag gets:"
    options: ["200 with body", "304 Not Modified without body", "412", "204"]
    answer: 1
    why: "Conditional GET saves bandwidth when the cached copy is still valid."
  - q: "HTTP/2 multiplexing means:"
    options: ["Multiple TCP connections per request", "Many concurrent request/response streams interleaved on one connection", "Server push only", "UDP transport"]
    answer: 1
    why: "Frames from different streams interleave on one TCP connection."
  - q: "Which status is appropriate when a client exceeds a rate limit?"
    options: ["403", "429 with Retry-After", "500", "503 always"]
    answer: 1
    why: "429 Too Many Requests; Retry-After tells clients when to retry."
explain:
  prompt: "Explain how HTTP evolved from HTTP/1.1 to HTTP/2 and HTTP/3 and what problem each version solved."
  rubric:
    - "HTTP/1.1: text protocol, persistent connections, one request at a time per connection, browsers open several connections"
    - "HTTP/2: binary framing, multiplexed streams, HPACK, one connection; TCP head-of-line blocking remains"
    - "HTTP/3: QUIC over UDP, independent streams, combined transport+TLS handshake, connection migration"
    - "Semantics (methods, status codes, headers) stay the same across versions"
  model: "The semantics — methods, status codes, headers — are shared; what changed is how messages are carried. HTTP/1.1 is textual and keeps connections alive, but each connection serves one request at a time, so browsers open several connections and pipelining never worked well because of head-of-line blocking. HTTP/2 introduced binary framing and multiplexing: many streams interleave on one TCP connection, headers are compressed with HPACK, and there's prioritisation. But everything still rides on one TCP byte stream, so a single lost packet stalls every stream until it's retransmitted. HTTP/3 moves to QUIC over UDP, which provides independently reliable streams so loss affects only its own stream, folds the TLS 1.3 handshake into the transport handshake, and lets connections survive IP changes such as switching from Wi-Fi to mobile."
cards:
  - q: "Idempotent methods"
    a: "GET, HEAD, OPTIONS, PUT, DELETE (safe: GET, HEAD, OPTIONS)."
  - q: "401 vs 403"
    a: "401: not authenticated. 403: authenticated but forbidden."
  - q: "HTTP/2 vs HTTP/3 head-of-line blocking"
    a: "HTTP/2 fixed it at HTTP level but not TCP level; HTTP/3 (QUIC) fixes it per stream."
---

## Explanation

### Semantics (all versions)

**Methods**: GET (safe, idempotent, cacheable), HEAD, POST (create/process, not idempotent), PUT (replace, idempotent), PATCH (partial update), DELETE (idempotent), OPTIONS (CORS preflight).

**Status codes**:

| Range | Common codes |
|---|---|
| 2xx | 200 OK, 201 Created (+Location), 202 Accepted (async), 204 No Content |
| 3xx | 301/308 permanent, 302/307 temporary redirect, 304 Not Modified |
| 4xx | 400 bad request, 401 unauthenticated, 403 forbidden, 404, 409 conflict, 412 precondition failed, 422 validation, 429 rate limited |
| 5xx | 500 bug, 502 bad gateway (upstream invalid), 503 unavailable (overload/maintenance), 504 gateway timeout |

**Headers worth knowing**: `Content-Type`, `Accept`, `Authorization`, `Cache-Control`, `ETag`/`If-None-Match`, `Last-Modified`/`If-Modified-Since`, `Vary`, `Location`, `Retry-After`, `Idempotency-Key` (convention), `Connection`, `Host`.

### HTTP/1.1

- Text format, `Host` header (virtual hosting), **persistent connections** (keep-alive) and chunked transfer encoding.
- One outstanding request per connection in practice → browsers open ~6 connections per origin; old optimisations: domain sharding, bundling, sprites.

### HTTP/2

- Binary **frames**, many **streams** multiplexed on one connection, **HPACK** header compression, stream prioritisation (server push is deprecated in practice).
- Negotiated via **ALPN** in TLS.
- Limitation: **TCP head-of-line blocking** — one lost segment stalls all streams.

### HTTP/3

- Runs on **QUIC** (UDP): per-stream reliability, built-in TLS 1.3, 1-RTT setup (0-RTT resumption), **connection migration** via connection IDs, improved loss recovery.
- Discovered via `Alt-Svc` header or DNS HTTPS records; clients fall back to HTTP/2 if UDP is blocked.

## Worked examples

### Conditional requests

```text
GET /logo.png              → 200 OK, ETag: "abc123", Cache-Control: max-age=60
(after 60s) GET /logo.png
If-None-Match: "abc123"    → 304 Not Modified (no body)
```

### Seeing the negotiated version

```bash
curl -sI --http2 https://example.com | head -1        # HTTP/2 200
curl -sI --http3 https://cloudflare.com | head -1     # requires a curl build with HTTP/3
curl -sI https://example.com | grep -i alt-svc        # advertises h3
```

## Common misconceptions

- **"PUT and POST are interchangeable."** — PUT is idempotent replacement at a known URI; POST isn't idempotent.
- **"HTTP/2 needs many connections."** — One connection per origin is the point.
- **"HTTP/3 is just HTTP over UDP."** — QUIC reimplements reliability, congestion control and encryption.
- **"5xx means the server crashed."** — 502/504 often come from proxies talking to unhealthy upstreams.

## Practical exercises

1. For each of 10 API scenarios (validation error, duplicate resource, async job accepted…), choose a status code and justify it.
2. Use `curl -v --http1.1` and `--http2` against the same site and compare connection reuse.
3. Draw how one lost packet affects HTTP/1.1, HTTP/2 and HTTP/3.
