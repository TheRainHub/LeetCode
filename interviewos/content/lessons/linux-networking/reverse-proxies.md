---
slug: reverse-proxies
title: Reverse proxies and load balancers
path: linux-networking
module: net-edge
order: 2
minutes: 35
depth: concise
practice: conceptual
summary: What sits between clients and your app — TLS termination, routing, load balancing, timeouts and the headers that preserve client information.
prerequisites: [http-versions]
problems: []
objectives:
  - Explain reverse proxy responsibilities (TLS termination, routing, buffering, caching, rate limiting)
  - Compare L4 and L7 load balancing and common algorithms
  - Configure timeouts and forwarded headers correctly and interpret 502/504 errors
readings:
  - title: "nginx — Beginner's Guide"
    url: https://nginx.org/en/docs/beginners_guide.html
    kind: docs
  - title: "nginx — ngx_http_proxy_module"
    url: https://nginx.org/en/docs/http/ngx_http_proxy_module.html
    kind: docs
  - title: "Cloudflare Learning Center — What is a reverse proxy?"
    url: https://www.cloudflare.com/learning/cdn/glossary/reverse-proxy/
    kind: article
interview:
  - q: "502 vs 504 from nginx?"
    a: "502 Bad Gateway: nginx got an invalid response or connection error from the upstream (refused, reset, crashed app). 504 Gateway Timeout: the upstream didn't respond within proxy_read_timeout (slow app or blocked thread pool)."
  - q: "L4 vs L7 load balancing?"
    a: "L4 balances TCP/UDP connections by IP/port without understanding HTTP (fast, protocol-agnostic). L7 understands HTTP: routes by host/path/headers, terminates TLS, retries, rewrites and can do per-request balancing over long-lived connections."
selfAssessment:
  - I can explain how the app learns the real client IP behind a proxy
  - I can diagnose 502 vs 504
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Behind a reverse proxy, the application sees the client's IP via:"
    options: ["The TCP source address", "X-Forwarded-For / Forwarded headers set by the trusted proxy", "The Host header", "DNS"]
    answer: 1
    why: "The TCP peer is the proxy; only trust these headers from known proxies."
  - q: "Least-connections balancing is better than round-robin when:"
    options: ["All requests take the same time", "Request durations vary a lot", "There is one backend", "Using UDP"]
    answer: 1
    why: "It avoids piling requests on a backend busy with slow ones."
  - q: "Health checks in a load balancer are used to:"
    options: ["Measure client latency", "Remove unhealthy backends from rotation", "Renew TLS certificates", "Compress responses"]
    answer: 1
    why: "Active/passive checks stop sending traffic to failing instances."
explain:
  prompt: "Explain the role of a reverse proxy/load balancer in front of a web service and how you'd configure it robustly."
  rubric:
    - "TLS termination, routing, load balancing and health checks"
    - "Forwarded headers and trusting only known proxies"
    - "Timeouts aligned with upstream behaviour; retries only for idempotent requests"
    - "Limits/buffering/rate limiting to protect upstreams; interpreting 502/504"
  model: "The reverse proxy is the public entry point: it terminates TLS, routes requests by host and path to the right upstream pool, balances across healthy instances using health checks, and can add compression, caching and rate limiting. It passes client information to the app through X-Forwarded-For, X-Forwarded-Proto and Host, and the app must only trust those headers from the proxy. Timeouts have to match reality: connect timeouts short, read timeouts slightly above the service's expected worst case, and the proxy's idle timeout longer than the client's keep-alive to avoid races. Retries go only to idempotent requests, otherwise a retried POST could double-charge someone. When things break, 502 means the upstream refused or returned garbage, and 504 means it was too slow."
cards:
  - q: "502 vs 504"
    a: "502: bad/failed upstream response. 504: upstream timeout."
  - q: "Load-balancing algorithms"
    a: "Round-robin, weighted, least-connections, consistent hashing (sticky by key)."
---

## Explanation

A **reverse proxy** accepts client connections on behalf of servers (nginx, Envoy, HAProxy, cloud load balancers, Kubernetes ingress controllers).

### Responsibilities

TLS termination, routing (host/path), load balancing + health checks, connection pooling to upstreams, request buffering (protects slow clients from tying up app threads), compression, caching, rate limiting, header manipulation, WAF.

### L4 vs L7

| | L4 | L7 |
|---|---|---|
| Sees | TCP/UDP connections | HTTP requests |
| Routing | IP/port | host, path, headers, cookies |
| TLS | pass-through (or terminate) | terminates |
| Balancing unit | connection | request |

### Algorithms

Round-robin, weighted, least-connections, random-of-two (power of two choices), consistent hashing (session affinity, cache locality).

### Configuration essentials

```nginx
upstream app { least_conn; server 10.0.0.11:8080; server 10.0.0.12:8080; keepalive 64; }
server {
  listen 443 ssl http2;
  location /api/ {
    proxy_pass http://app;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
    proxy_connect_timeout 2s;
    proxy_read_timeout 30s;
    proxy_http_version 1.1; proxy_set_header Connection "";   # upstream keep-alive
  }
}
```

## Worked examples

**Symptom**: users get 504 after exactly 60 s on report downloads. **Cause**: `proxy_read_timeout 60s` while the report takes ~90 s. **Better fix than raising the timeout**: make report generation asynchronous (202 + polling or a webhook/email), keeping proxies' timeouts tight.

## Common misconceptions

- **"Retrying at the proxy is always safe."** — Not for non-idempotent requests.
- **"X-Forwarded-For is trustworthy."** — Clients can forge it; trust only the hop your proxy added.
- **"Sticky sessions are required for scale."** — Stateless services avoid them; stickiness hurts balancing and failover.

## Practical exercises

1. Run nginx locally in front of the lab's Python server and observe headers the app receives.
2. Stop the upstream and observe 502; add `sleep` to it and lower `proxy_read_timeout` to observe 504.
