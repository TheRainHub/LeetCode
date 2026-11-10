---
slug: dns
title: DNS
path: linux-networking
module: net-application
order: 1
minutes: 50
depth: full
practice: lab
summary: How a name becomes an address — recursive resolution, record types, TTLs and caching, and the DNS failure modes behind 'it's always DNS'.
prerequisites: [udp]
problems: []
objectives:
  - Walk through recursive resolution from stub resolver to authoritative server
  - Use A, AAAA, CNAME, NS, MX, TXT, SOA records correctly (including CNAME restrictions)
  - Reason about TTLs, caching and propagation during migrations
  - Debug DNS with dig, including +trace and querying specific resolvers
readings:
  - title: "RFC 1034 — Domain Names: Concepts and Facilities"
    url: https://www.rfc-editor.org/rfc/rfc1034
    kind: rfc
  - title: "RFC 1035 — Domain Names: Implementation and Specification"
    url: https://www.rfc-editor.org/rfc/rfc1035
    kind: rfc
  - title: "Cloudflare Learning Center — What is DNS?"
    url: https://www.cloudflare.com/learning/dns/what-is-dns/
    kind: article
interview:
  - q: "What happens when you resolve www.example.com for the first time?"
    a: "The stub resolver asks the configured recursive resolver. If uncached, the resolver queries a root server (gets the .com NS referral), a .com TLD server (gets example.com's NS), then example.com's authoritative server, which returns the record (or a CNAME to follow). The resolver caches each answer for its TTL and returns the result."
  - q: "You're migrating a service to a new IP. How do you minimise downtime with DNS?"
    a: "Lower the record's TTL well in advance (at least one old TTL before), keep the old server serving during the transition, switch the record, monitor traffic draining from the old IP, then raise the TTL again. Remember some clients/resolvers cache longer than they should."
  - q: "Why can't you put a CNAME at the zone apex (example.com)?"
    a: "A CNAME must be the only record at its name, but the apex must have SOA and NS records. Providers offer ALIAS/ANAME or CNAME flattening to emulate it."
selfAssessment:
  - I can explain recursive vs authoritative servers
  - I can use dig +trace to find where resolution breaks
  - I can plan a TTL-aware migration
completion:
  - Score at least 70% on the quiz
  - Explain the resolution path in interview mode
quiz:
  - q: "Which server holds the definitive answer for records in a zone?"
    options: ["The recursive resolver", "The authoritative name server for that zone", "The root server", "The browser cache"]
    answer: 1
    why: "Recursive resolvers fetch and cache; authoritative servers own the data."
  - q: "TTL on a DNS record controls:"
    options: ["How long the server is up", "How long resolvers may cache the answer", "Packet hop limit", "TLS session length"]
    answer: 1
    why: "Changes are only seen after caches expire."
  - q: "dig returns NXDOMAIN. That means:"
    options: ["The server timed out", "The name does not exist in the zone", "The record exists but is empty", "DNSSEC failed"]
    answer: 1
    why: "NOERROR with no answer (NODATA) means the name exists but not that record type; SERVFAIL indicates a resolver/zone problem."
  - q: "A CDN is commonly attached to a customer domain with:"
    options: ["An MX record", "A CNAME from www.customer.com to a CDN hostname", "A TXT record", "Changing the root servers"]
    answer: 1
    why: "The CDN then answers with edge IPs (often geo/latency-aware)."
explain:
  prompt: "Explain end to end how a DNS lookup works, how caching affects it, and how you would debug a resolution failure."
  rubric:
    - "Stub → recursive resolver → root → TLD → authoritative path"
    - "Record types involved (A/AAAA, CNAME chains, NS referrals)"
    - "Caching at multiple layers controlled by TTL, plus negative caching"
    - "Debugging: dig the name, query specific resolvers, +trace, compare authoritative answers"
  model: "The application asks the OS stub resolver, which sends the query to a recursive resolver — the ISP's, the company's, or a public one. If it has nothing cached, the resolver asks a root server, which refers it to the .com TLD servers, which refer it to the domain's authoritative name servers, which return the A or AAAA record, or a CNAME that the resolver then follows. Every answer is cached for its TTL — in the resolver, often the OS, the browser and runtimes like the JVM — and negative answers are cached too, according to the SOA. To debug, I'd run dig against the default resolver, then against a public resolver and the authoritative server directly, and use dig +trace to see which step fails, checking for NXDOMAIN versus SERVFAIL, wrong NS delegation or stale cached values."
cards:
  - q: "Resolution path"
    a: "stub → recursive resolver → root → TLD → authoritative (+ caching at each step)."
  - q: "NXDOMAIN vs SERVFAIL vs NODATA"
    a: "Name doesn't exist / resolver or zone failure / name exists but no record of that type."
  - q: "Migration with DNS"
    a: "Lower TTL in advance, switch, keep old target serving, raise TTL later."
---

## Explanation

### Roles

- **Stub resolver** — in the OS (`/etc/resolv.conf`, `systemd-resolved`); asks someone else.
- **Recursive resolver** — does the work, caches results (ISP, corporate, 1.1.1.1, 8.8.8.8).
- **Authoritative servers** — hold zone data (Route 53, Cloudflare DNS, your own BIND).
- **Root and TLD servers** — delegate via NS records.

### Record types

| Type | Purpose |
|---|---|
| A / AAAA | IPv4 / IPv6 address |
| CNAME | alias to another name (must be alone at its name; not at apex) |
| NS | delegate a zone to name servers |
| MX | mail servers |
| TXT | verification, SPF/DKIM |
| SOA | zone metadata, negative-caching TTL |
| SRV, CAA, PTR | services, allowed CAs, reverse lookups |

### Caching and TTLs

Every layer caches: recursive resolvers, OS, browsers, language runtimes (the JVM caches successful lookups; configure `networkaddress.cache.ttl` in long-running services). Changing a record isn't instant — old answers live until their TTL expires. **Negative answers** are cached too.

### DNS and traffic engineering

- **Round-robin** multiple A records (crude load distribution).
- **GeoDNS / latency-based** answers (CDNs return the nearest edge).
- **Failover** by health-checked records (bounded by TTL and client caching).

### Transport and security

UDP port 53 by default, TCP for large responses (truncation) and zone transfers. **DNSSEC** signs records (authenticity, not privacy). **DoT/DoH** encrypt the stub-to-resolver hop.

## Worked examples

### Following a CDN CNAME chain

```text
$ dig www.example.com
www.example.com.        300   IN  CNAME  example.cdn-provider.net.
example.cdn-provider.net. 60  IN  A      203.0.113.42
```
The customer controls the CNAME (TTL 300); the CDN controls the final A record with a short TTL so it can steer users between edges quickly.

### Debugging checklist

```bash
dig app.example.com                     # what does my resolver say?
dig @1.1.1.1 app.example.com            # what does a public resolver say?
dig NS example.com +short               # who is authoritative?
dig @ns1.example-dns.net app.example.com   # ask the authority directly
dig +trace app.example.com              # walk the delegation chain
```
If the authority returns the new IP but your resolver returns the old one, you're seeing caching; if `+trace` fails at the delegation step, NS records at the registrar/parent are wrong.

## Common misconceptions

- **"DNS propagation takes 48 hours."** — Changes are visible as caches expire (TTL), but registrar/NS changes at the parent can take longer.
- **"Low TTL is always better."** — More queries, more latency on cache misses, more dependency on the DNS provider's availability.
- **"DNSSEC encrypts DNS."** — It authenticates; DoH/DoT provide privacy.

## Practical exercises

1. Run `dig +trace` for three domains and identify root, TLD and authoritative steps.
2. Find a site served by a CDN and follow its CNAME chain.
3. Write down a TTL plan for moving `api.example.com` to a new load balancer with minimal downtime.
