---
slug: tcp-ip
title: TCP/IP
path: linux-networking
module: net-transport
order: 2
minutes: 60
depth: full
practice: lab
summary: Layers, IP addressing and routing, and TCP's handshake, reliability, flow control and congestion control — with the failure modes you'll debug.
prerequisites: []
problems: []
objectives:
  - Explain the layered model and what IP, TCP and UDP each provide
  - Walk through the three-way handshake, data transfer and connection teardown including TIME_WAIT
  - Explain reliability (sequence numbers, ACKs, retransmission), flow control and congestion control
  - "Reason about latency: RTT, handshakes, head-of-line blocking, slow start"
readings:
  - title: "RFC 9293 — Transmission Control Protocol (TCP)"
    url: https://www.rfc-editor.org/rfc/rfc9293
    kind: rfc
  - title: "High Performance Browser Networking — Building Blocks of TCP"
    url: https://hpbn.co/building-blocks-of-tcp/
    kind: book
  - title: "man7 — tcp(7)"
    url: https://man7.org/linux/man-pages/man7/tcp.7.html
    kind: docs
interview:
  - q: "Walk through the TCP three-way handshake. Why three steps?"
    a: "Client sends SYN with its initial sequence number; server replies SYN-ACK with its own ISN and acknowledges the client's; client ACKs the server's ISN. Both sides must learn and confirm each other's sequence numbers (and options like MSS, window scaling), which needs three messages; it also protects against stale duplicate SYNs."
  - q: "What is TIME_WAIT and why does it exist?"
    a: "The side that closes first stays in TIME_WAIT for 2×MSL so delayed packets from the old connection can't be mistaken for a new connection with the same 4-tuple, and so the final ACK can be retransmitted if lost."
  - q: "Flow control vs congestion control?"
    a: "Flow control protects the receiver: the advertised receive window limits unacknowledged data. Congestion control protects the network: the sender's congestion window grows (slow start, then congestion avoidance) and shrinks on loss or delay signals (e.g. CUBIC, BBR)."
  - q: "Why are new connections slow for large transfers?"
    a: "Handshake costs one RTT (plus TLS), and slow start begins with a small congestion window that grows per RTT, so the first round trips can't use the full bandwidth. Connection reuse (keep-alive, pooling, HTTP/2) avoids paying this repeatedly."
selfAssessment:
  - I can draw the handshake and teardown with states
  - I can explain why packet loss hurts throughput
  - I can relate RTT to page load or API latency
completion:
  - Score at least 70% on the quiz
  - Explain the handshake and TIME_WAIT in interview mode
  - Verify the Linux Networking lab
quiz:
  - q: "TCP guarantees:"
    options: ["Message boundaries", "Reliable, ordered byte-stream delivery", "Low latency", "Encryption"]
    answer: 1
    why: "No message boundaries (byte stream) and no confidentiality."
  - q: "A connection refused error at the TCP level means the client received:"
    options: ["Nothing", "A RST in response to its SYN", "An ICMP echo reply", "A FIN"]
    answer: 1
    why: "The host is reachable but nothing accepts on that port (or a firewall rejects)."
  - q: "Which state indicates the local application has not closed a socket the peer already closed?"
    options: ["TIME_WAIT", "CLOSE_WAIT", "SYN_SENT", "LISTEN"]
    answer: 1
    why: "Lots of CLOSE_WAIT = application bug (missing close)."
  - q: "Head-of-line blocking in TCP means:"
    options: ["The first client blocks others", "A lost segment delays delivery of later bytes even if they arrived", "SYN floods", "Slow DNS"]
    answer: 1
    why: "In-order delivery forces waiting for retransmission; HTTP/3 over QUIC avoids it per stream."
explain:
  prompt: "Explain how TCP provides reliable, ordered delivery over an unreliable network, including the handshake and how it avoids overwhelming the receiver and the network."
  rubric:
    - "IP is best-effort; TCP adds sequence numbers, ACKs and retransmission (timeouts, duplicate ACKs)"
    - "Three-way handshake exchanges initial sequence numbers and options"
    - "Flow control via the receive window"
    - "Congestion control: slow start, congestion avoidance, reaction to loss"
    - "Teardown with FIN/ACK and TIME_WAIT"
  model: "IP delivers packets best-effort: they can be lost, duplicated or reordered. TCP numbers every byte with sequence numbers; the receiver acknowledges what it has received in order and buffers out-of-order data, and the sender retransmits on timeout or after duplicate ACKs. A connection starts with the three-way handshake — SYN, SYN-ACK, ACK — so both sides agree on initial sequence numbers and options like MSS and window scaling. Flow control uses the receiver's advertised window so a fast sender can't overflow a slow receiver. Congestion control keeps a congestion window that starts small and grows quickly in slow start, then more carefully, and shrinks when loss or delay signals congestion, so senders share the network. Closing uses FIN and ACK in each direction, and the side that closes first waits in TIME_WAIT so stale packets can't confuse a new connection."
cards:
  - q: "Three-way handshake"
    a: "SYN → SYN-ACK → ACK; exchanges ISNs and options; costs one RTT."
  - q: "CLOSE_WAIT vs TIME_WAIT"
    a: "CLOSE_WAIT: peer closed, we haven't (app bug if many). TIME_WAIT: we closed first, waiting 2×MSL (normal)."
  - q: "Flow vs congestion control"
    a: "Receiver window protects the receiver; congestion window protects the network."
  - q: "Why reuse connections"
    a: "Avoid handshake RTTs (TCP + TLS) and slow start on every request."
---

## Explanation

### Layers (TCP/IP model)

| Layer | Examples | Provides |
|---|---|---|
| Application | HTTP, DNS, TLS-protected protocols | semantics |
| Transport | TCP, UDP, (QUIC over UDP) | process-to-process, ports |
| Internet | IPv4, IPv6, ICMP | host-to-host routing, best effort |
| Link | Ethernet, Wi-Fi | local delivery |

**IP** delivers packets between hosts using addresses and routing tables (`ip route`); packets may be lost, duplicated, reordered, and are limited by the MTU (fragmentation/PMTUD). **Ports** identify processes.

### Connection setup

```text
Client                       Server
SYN (seq=x)          →
                     ←       SYN-ACK (seq=y, ack=x+1)
ACK (ack=y+1)        →       ESTABLISHED
```
One RTT before any data (TLS adds 1 more with TLS 1.3, 2 with TLS 1.2).

### Reliability

- **Sequence numbers** per byte, **cumulative ACKs** (+ SACK for selective acks).
- **Retransmission** on timeout (RTO computed from RTT) or **fast retransmit** after three duplicate ACKs.
- **Ordering**: the receiver delivers bytes to the application in order → **head-of-line blocking** when a segment is lost.

### Flow control

The receiver advertises a **window** (free buffer). The sender may have at most `min(rwnd, cwnd)` bytes unacknowledged. A zero window pauses the sender.

### Congestion control

- **Slow start**: `cwnd` starts around 10 segments and roughly doubles per RTT.
- **Congestion avoidance**: linear-ish growth after a threshold.
- **On loss**: reduce `cwnd` (CUBIC is Linux's default; BBR models bandwidth and RTT instead of reacting only to loss).
- Implication: throughput ≈ window / RTT. High RTT or loss → lower throughput.

### Teardown

FIN/ACK in each direction (four segments, sometimes three). The active closer enters **TIME_WAIT** (~60 s on Linux). The passive side goes through **CLOSE_WAIT** until its application calls `close`.

### Useful facts for debugging

- RST = abrupt reset (refused port, application abort, idle timeout on a middlebox).
- Keep-alive probes detect dead peers (default after 2 hours on Linux; applications often set their own heartbeats).
- MTU problems: small requests work, large ones hang (fragmentation/PMTUD blackholes).

## Worked examples

### Latency budget of an HTTPS request across the Atlantic (RTT 90 ms)

| Step | Round trips | Time |
|---|---|---|
| DNS (cached resolver) | 0–1 | 0–90 ms |
| TCP handshake | 1 | 90 ms |
| TLS 1.3 handshake | 1 | 90 ms |
| HTTP request/response | 1 | 90 ms + server time |
| **Total (cold)** | 3–4 | ~270–360 ms + server time |

With a reused connection only the last row remains → why connection pooling, keep-alive, HTTP/2 multiplexing and CDNs (shorter RTT to the edge) matter.

### Diagnosing CLOSE_WAIT buildup

`ss -tan state close-wait` shows 3,000 sockets to a payment API. The remote side closed idle connections, but the client library never closed its end — typically a missing response-body close or a misconfigured HTTP client pool. The fix is in code (close responses, configure idle timeouts), not in the kernel.

## Common misconceptions

- **"TCP preserves message boundaries."** — It's a byte stream.
- **"More bandwidth fixes latency."** — Many small requests are RTT-bound.
- **"TIME_WAIT is a problem to tune away."** — It's correctness machinery; reuse connections instead.
- **"Packet loss only slows the lost packet."** — It shrinks the congestion window and causes head-of-line blocking.

## Practical exercises

1. Complete the **Linux Networking lab** and explain the refused vs timeout outputs at the TCP level.
2. Capture a connection with `tcpdump -nn port 8080` and label SYN, SYN-ACK, ACK, data, FIN.
3. Use `curl -w` timings against a far-away server and map them to the latency table above.
