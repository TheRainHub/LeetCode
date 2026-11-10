---
slug: udp
title: UDP
path: linux-networking
module: net-transport
order: 3
minutes: 25
depth: concise
practice: conceptual
summary: Connectionless datagrams — when the lack of TCP's guarantees is a feature (DNS, media, QUIC) and what the application must handle itself.
prerequisites: [tcp-ip]
problems: []
objectives:
  - Compare UDP and TCP guarantees and costs
  - Name use cases where UDP is preferable and why
  - List what an application on UDP must handle (loss, order, congestion, MTU)
readings:
  - title: "RFC 768 — User Datagram Protocol"
    url: https://www.rfc-editor.org/rfc/rfc768
    kind: rfc
  - title: "man7 — udp(7)"
    url: https://man7.org/linux/man-pages/man7/udp.7.html
    kind: docs
interview:
  - q: "Why does DNS primarily use UDP?"
    a: "Queries and answers are small, a single request/response doesn't need a connection, and avoiding the TCP handshake saves an RTT. DNS falls back to TCP for large responses (truncation) and zone transfers; encrypted DNS uses TCP/TLS or HTTPS/QUIC."
  - q: "Why is QUIC built on UDP instead of a new transport protocol?"
    a: "Middleboxes and OS kernels only reliably pass TCP and UDP; building on UDP lets QUIC be deployed in user space and evolve quickly, while implementing reliability, congestion control and encryption itself."
selfAssessment:
  - I can explain when UDP beats TCP
  - I can list what an application must implement itself on top of UDP
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "UDP provides:"
    options: ["Reliable ordered delivery", "Datagrams with message boundaries, no delivery or ordering guarantees", "Encryption", "Congestion control"]
    answer: 1
    why: "Each send is one datagram; it may be lost, duplicated or reordered."
  - q: "Live voice calls often use UDP because:"
    options: ["It's encrypted", "A late packet is useless; retransmission would add delay", "It's always faster on the wire", "TCP can't carry audio"]
    answer: 1
    why: "Timeliness matters more than completeness."
  - q: "A UDP-based application sending large datagrams should worry about:"
    options: ["TIME_WAIT", "IP fragmentation and MTU limits", "The three-way handshake", "Nagle's algorithm"]
    answer: 1
    why: "Fragments increase loss probability; keep datagrams below path MTU."
explain:
  prompt: "When would you choose UDP over TCP, and what responsibilities move to the application?"
  rubric:
    - "UDP: no handshake, no retransmission, message boundaries, low overhead"
    - "Use cases: DNS, real-time media/gaming, telemetry, QUIC"
    - "Application must handle loss/reorder/duplication as needed"
    - "Application should implement congestion awareness and respect MTU"
  model: "UDP sends independent datagrams with no handshake, retransmission or ordering, but it keeps message boundaries and has minimal overhead. I'd choose it when latency matters more than completeness or when the protocol is a single small request and response: DNS queries, voice and video where a late packet is useless, game state updates, metrics, and as the substrate for QUIC. The application then owns whatever guarantees it needs: sequence numbers to detect loss or reordering, retransmission or forward error correction, deduplication, keeping datagrams under the path MTU, and congestion control so it doesn't flood the network."
cards:
  - q: "UDP vs TCP in one line"
    a: "UDP: datagrams, no guarantees, no handshake. TCP: reliable ordered byte stream with flow/congestion control."
  - q: "UDP use cases"
    a: "DNS, VoIP/video, games, telemetry, QUIC/HTTP/3."
---

## Explanation

UDP adds only ports and a checksum on top of IP.

| | UDP | TCP |
|---|---|---|
| Connection setup | none | 3-way handshake |
| Reliability | none | ACKs + retransmission |
| Ordering | none | in-order byte stream |
| Message boundaries | preserved | none (stream) |
| Flow/congestion control | none | built in |
| Header | 8 bytes | 20+ bytes |

### When UDP fits

- **Request/response that fits one packet**: DNS (with TCP fallback on truncation).
- **Real-time media and games**: stale data is worthless; retransmissions add latency.
- **Telemetry/logs** where occasional loss is acceptable (statsd).
- **QUIC / HTTP/3**: reliability and congestion control reimplemented per stream in user space, avoiding TCP head-of-line blocking.

### What the application must handle

Loss, duplication and reordering (if it matters), MTU (stay ≲ 1200–1400 bytes on the internet), congestion behaviour, and security (no handshake → spoofing and amplification attacks are easier; DNS/NTP amplification DDoS).

## Worked examples

```bash
nc -ul 9999                  # UDP listener
echo hello | nc -u -w1 localhost 9999
ss -uanp | grep 9999         # UDP sockets have no connection states
```

## Common misconceptions

- **"UDP is always faster."** — It avoids handshakes and retransmission delays, but without congestion control it can make things worse under load.
- **"UDP is unreliable, so never use it for important data."** — QUIC builds reliable streams on top of it.

## Practical exercises

1. Send datagrams with `nc -u` and observe that there is no handshake in `tcpdump -nn udp port 9999`.
2. Run `dig +tcp example.com` vs `dig example.com` and compare packets.
