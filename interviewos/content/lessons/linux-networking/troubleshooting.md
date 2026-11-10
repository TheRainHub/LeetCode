---
slug: troubleshooting
title: Systematic troubleshooting of networked services
path: linux-networking
module: net-edge
order: 3
minutes: 45
depth: full
practice: lab
summary: A repeatable method for 'the site is slow/down' — scope, layer-by-layer hypotheses, evidence from tools, and communicating while you debug.
prerequisites: [linux-net-tools, http-versions, dns]
problems: []
objectives:
  - Scope an incident (who, what, since when, what changed) before touching anything
  - Work through layers (DNS → TCP → TLS → HTTP → application → dependencies) with the right tool at each
  - Form and test hypotheses with evidence, and know when to mitigate before root-causing
  - Communicate status and write a blameless post-incident summary
readings:
  - title: "Google SRE Book — Effective Troubleshooting"
    url: https://sre.google/sre-book/effective-troubleshooting/
    kind: book
  - title: "Google SRE Book — Managing Incidents"
    url: https://sre.google/sre-book/managing-incidents/
    kind: book
  - title: "Brendan Gregg — The USE Method"
    url: https://www.brendangregg.com/usemethod.html
    kind: article
interview:
  - q: "Users report the website is slow. How do you approach it?"
    a: "Clarify scope (all users or some region, all pages or one endpoint, since when, what changed), check dashboards for latency/error/saturation, reproduce with curl -w to split DNS/TCP/TLS/TTFB, then drill into the slow layer: network/CDN vs application vs dependencies (DB, external APIs), using logs, traces and metrics. Mitigate first (rollback, scale, shed load) if impact is high."
  - q: "When do you roll back before knowing the root cause?"
    a: "When user impact is significant and a recent change is a plausible cause: rollback is usually fast and low-risk, restores service, and preserves time to investigate calmly. Root cause analysis continues afterwards."
selfAssessment:
  - I start every incident by asking 'what changed?'
  - I can map symptoms to the layer most likely responsible
  - I can write a blameless incident summary
completion:
  - Score at least 70% on the quiz
  - Verify the Linux Networking lab
  - Explain your troubleshooting method in interview mode
quiz:
  - q: "Only users in one country can't reach the site; others can. The first suspect is:"
    options: ["A bug in the application code", "Regional routing/CDN PoP/DNS resolution issues", "Database deadlock", "Disk full"]
    answer: 1
    why: "Partial, geography-correlated failures point at the network edge."
  - q: "curl -w shows ttfb 4.8 s with dns, tcp and tls under 100 ms. Look at:"
    options: ["DNS records", "The server/application and its dependencies", "TLS certificates", "The client's Wi-Fi"]
    answer: 1
    why: "The network handshake is fast; time is spent producing the response."
  - q: "The best first question in an incident is usually:"
    options: ["Who wrote this code?", "What changed recently (deploys, config, traffic, dependencies)?", "Can we rewrite it?", "Is it Friday?"]
    answer: 1
    why: "Most incidents correlate with changes."
explain:
  prompt: "Describe your step-by-step approach when an API suddenly starts returning errors and timeouts in production."
  rubric:
    - "Scopes the problem and checks what changed (deploys, config, traffic, dependencies)"
    - "Uses metrics (errors, latency, saturation) and logs/traces to localise"
    - "Goes layer by layer with concrete tools and forms testable hypotheses"
    - "Mitigates first when impact is high (rollback, scale, feature flag off, shed load)"
    - "Communicates status and follows up with a blameless post-mortem and action items"
  model: "First I'd scope it: which endpoints, what percentage of requests, which regions, since when, and what changed — a deploy, a config or feature-flag change, a traffic spike, a dependency incident. Dashboards for error rate, latency percentiles and saturation usually narrow it down. If a deploy lines up and impact is high, I'd roll back or disable the flag first and investigate after. Otherwise I'd localise layer by layer: from outside with curl -w to split DNS, TCP, TLS and time to first byte; then the load balancer's 502 versus 504 split; then application logs and traces for slow spans, connection pool exhaustion or exceptions; then dependencies like the database or external APIs, and host resources using the USE method. Each step is a hypothesis I confirm or reject with evidence. Throughout, I'd post short status updates, and afterwards write a blameless post-mortem with timeline, root cause and concrete action items."
cards:
  - q: "Incident first questions"
    a: "Scope (who/what/where), since when, what changed."
  - q: "Layer order"
    a: "DNS → TCP → TLS → HTTP/proxy → application → dependencies → host resources."
  - q: "Mitigate vs root-cause"
    a: "With high impact, restore service first (rollback, flag off, scale), then investigate."
---

## Explanation

### 1. Scope before you debug

- **Who** is affected (all users, a region, one customer, one client version)?
- **What** fails (all endpoints, one route, writes only)?
- **Since when**, and **what changed** (deploys, config, feature flags, certificates, DNS, traffic, upstream providers)?
- **How bad** (error rate, latency percentiles, revenue impact)?

### 2. Mitigate if needed

High impact + plausible recent change → roll back, flip the feature flag off, fail over, scale out, or shed load. Restoring service beats understanding it.

### 3. Localise layer by layer

| Layer | Question | Evidence |
|---|---|---|
| DNS | right answer everywhere? | `dig`, `dig +trace`, resolver comparison |
| Network/TCP | reachable? refused vs timeout? | `nc -vz`, `ss`, `tcpdump`, `mtr` |
| TLS | valid chain, not expired? | `openssl s_client`, `curl -v` |
| Proxy/LB | 502 or 504? healthy backends? | LB logs/metrics, health checks |
| Application | errors, slow spans, pool exhaustion? | logs, traces, thread dumps, metrics |
| Dependencies | DB/cache/queue/third parties OK? | their metrics, slow query log |
| Host | CPU/memory/disk/FD saturation? | USE method: `vmstat`, `iostat`, `ss` |

### 4. Hypothesis → test → conclude

Write hypotheses down, predict what evidence would confirm/refute each, and change one thing at a time. Correlation with a deploy is a strong lead, not proof.

### 5. Communicate and learn

Regular status updates (impact, next steps, next update time). Afterwards, a **blameless post-mortem**: timeline, impact, root cause(s), what went well, action items with owners — focusing on systems, not individuals.

## Worked examples

### "Checkout is slow since 14:05"

1. Scope: only `/checkout`, p99 from 400 ms to 6 s, all regions. Deploy at 14:00 added a fraud-check call.
2. Mitigation: disable the fraud-check feature flag → p99 back to 450 ms within minutes.
3. Root cause: the fraud API's p99 is 5 s; the client had no timeout and a synchronous call in the request path; the HTTP client pool (20 connections) saturated.
4. Actions: timeout of 800 ms with fallback, circuit breaker, async fraud evaluation for low-risk orders, alert on pool saturation.

### Linux lab failure modes as a mini-incident

`curl: (7) Failed to connect … Connection refused` → TCP RST → nothing listening on that port (server crashed or bound to 127.0.0.1 only). `curl: (28) Connection timed out` → packets dropped → firewall, security group or routing.

## Common misconceptions

- **"Start by reading the code."** — Start with scope, changes and telemetry.
- **"Rollback is admitting defeat."** — It's the standard mitigation.
- **"Post-mortems find who to blame."** — Blame hides information; fix the system.

## Practical exercises

1. Complete the **Linux Networking lab** and write a 5-line incident note for the simulated failure.
2. Take a real bug you fixed at Make and rewrite it as a blameless post-mortem (timeline, root cause, actions) — useful for behavioral interviews.
3. Create a personal troubleshooting checklist card with the layer table above.
