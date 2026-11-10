---
slug: linux-net-tools
title: Linux networking tools
path: linux-networking
module: linux-shell
order: 2
minutes: 50
depth: full
practice: lab
summary: ss, ip, curl, dig, nc, tcpdump and friends — what each answers and how to read their output when something is broken.
prerequisites: [processes-threads, tcp-ip]
problems: []
objectives:
  - Find listening sockets and established connections and map them to processes
  - Inspect HTTP exchanges with curl (verbose, timing, resolve overrides)
  - Query DNS with dig and test raw TCP connectivity with nc
  - Capture and read basic packet traces with tcpdump
readings:
  - title: "man7 — ss(8)"
    url: https://man7.org/linux/man-pages/man8/ss.8.html
    kind: docs
  - title: "man7 — ip(8)"
    url: https://man7.org/linux/man-pages/man8/ip.8.html
    kind: docs
  - title: "curl — command line tool manual"
    url: https://curl.se/docs/manpage.html
    kind: docs
  - title: "tcpdump manual page"
    url: https://www.tcpdump.org/manpages/tcpdump.1.html
    kind: docs
interview:
  - q: "How do you find which process is listening on port 8080?"
    a: "ss -ltnp 'sport = :8080' (listening TCP sockets, numeric, with process; may need sudo), or lsof -iTCP:8080 -sTCP:LISTEN. Then inspect the PID with ps or /proc."
  - q: "How do you measure where time goes in an HTTP request?"
    a: "curl -w with timing variables: time_namelookup (DNS), time_connect (TCP), time_appconnect (TLS), time_starttransfer (TTFB), time_total. Large gaps point to the slow phase."
  - q: "Many sockets in TIME_WAIT on a client — problem?"
    a: "TIME_WAIT is normal for the side that actively closes (lasts 2×MSL, ~60s on Linux). Very high counts with many short connections can exhaust ephemeral ports; fix with connection reuse (keep-alive, pooling) rather than kernel hacks."
selfAssessment:
  - I can map a port to a process in under a minute
  - I can break down request latency with curl -w
  - I can read a three-way handshake in tcpdump output
completion:
  - Score at least 70% on the quiz
  - Verify the Linux Networking lab
quiz:
  - q: "ss -tan state established shows:"
    options: ["Listening UDP sockets", "Established TCP connections with numeric addresses", "Routing table", "DNS cache"]
    answer: 1
    why: "-t TCP, -a all, -n numeric, filtered by state."
  - q: "curl --resolve example.com:443:10.0.0.5 https://example.com/ is useful to:"
    options: ["Bypass TLS verification", "Test a specific backend/IP while keeping the correct Host header and SNI", "Change DNS servers globally", "Force HTTP/1.0"]
    answer: 1
    why: "Great for testing one server behind a load balancer or a new origin before switching DNS."
  - q: "nc -vz host 5432 tells you:"
    options: ["Whether PostgreSQL credentials work", "Whether a TCP connection to port 5432 can be established", "The DNS record", "Latency percentiles"]
    answer: 1
    why: "It tests reachability at the TCP layer only."
  - q: "In tcpdump output, flags [S], [S.], [.] in sequence indicate:"
    options: ["A reset", "The TCP three-way handshake (SYN, SYN-ACK, ACK)", "Data transfer", "Connection close"]
    answer: 1
    why: "[F] is FIN, [R] is RST, [P] is PUSH."
explain:
  prompt: "A service can't reach its database. Which tools would you use, in what order, and what does each tell you?"
  rubric:
    - "Checks DNS resolution of the database host (dig/getent)"
    - "Tests TCP reachability (nc -vz / ss) and distinguishes refused vs timeout"
    - "Checks the server side: is it listening (ss -ltnp), firewall/security groups"
    - "Uses tcpdump if needed to see SYNs without replies or RSTs"
    - "Then application-level checks: credentials, TLS, connection pool limits, logs"
  model: "I'd go layer by layer. First DNS: dig or getent hosts to confirm the hostname resolves to the address I expect. Then TCP: nc -vz db 5432 from the application host — 'connection refused' means the host answered but nothing listens on that port, a timeout means packets are dropped, typically a firewall, security group or routing issue. On the database host, ss -ltnp shows whether PostgreSQL listens on the right interface and port, not just 127.0.0.1. If it's still unclear, tcpdump on either side shows whether SYNs arrive and what comes back. Once TCP works, I'd check the application layer: credentials, TLS requirements, pg_hba rules, connection pool exhaustion and the logs on both sides."
cards:
  - q: "Who listens on port X"
    a: "ss -ltnp 'sport = :X' or lsof -iTCP:X -sTCP:LISTEN"
  - q: "curl timing breakdown"
    a: "-w '%{time_namelookup} %{time_connect} %{time_appconnect} %{time_starttransfer} %{time_total}'"
  - q: "Refused vs timeout"
    a: "Refused = RST (nothing listening). Timeout = no answer (filtered/dropped/unreachable)."
---

## Explanation

| Question | Tool |
|---|---|
| What is listening / connected? | `ss -ltnp`, `ss -tanp`, `lsof -i` |
| What are my IPs/routes/interfaces? | `ip addr`, `ip route`, `ip link` |
| Does the name resolve, and to what? | `dig`, `getent hosts`, `resolvectl` |
| Can I open a TCP connection? | `nc -vz host port`, `curl -v telnet://host:port` |
| What does the HTTP exchange look like? | `curl -v`, `curl -I`, `curl -w` |
| What's on the wire? | `tcpdump`, Wireshark |
| Where does the path break? | `ping`, `traceroute`/`mtr` |

### ss

```bash
ss -ltnp                         # listening TCP, numeric, with processes
ss -tan state established        # established connections
ss -tan | awk '{print $1}' | sort | uniq -c   # count by state (TIME-WAIT, CLOSE-WAIT…)
```
- Many **CLOSE-WAIT**: your application didn't close sockets after the peer did (bug).
- Many **TIME-WAIT**: lots of short-lived connections closed by this side (use keep-alive/pooling).
- A listener on `127.0.0.1:port` is unreachable from other hosts; `0.0.0.0` or a specific interface is needed.

### curl

```bash
curl -v https://api.example.com/health                 # handshake, request and response headers
curl -sS -o /dev/null -w 'dns=%{time_namelookup} tcp=%{time_connect} tls=%{time_appconnect} ttfb=%{time_starttransfer} total=%{time_total}\n' https://example.com
curl --resolve example.com:443:203.0.113.10 https://example.com/   # pin to one backend
curl -H 'Host: app.local' http://10.0.0.5/                          # test a vhost directly
```

### dig

```bash
dig example.com A +short
dig example.com CNAME
dig +trace example.com           # follow delegation from the root
dig @1.1.1.1 example.com         # ask a specific resolver
```

### tcpdump

```bash
sudo tcpdump -i any -nn port 5432                 # traffic to/from PostgreSQL
sudo tcpdump -i any -nn 'tcp[tcpflags] & (tcp-syn|tcp-rst) != 0'   # only SYNs and RSTs
sudo tcpdump -i any -w capture.pcap port 443      # save for Wireshark
```

## Worked examples

### Reading a handshake and a refusal

```text
10:00:00.001 IP 10.0.0.2.51514 > 10.0.0.9.5432: Flags [S], seq 1001
10:00:00.002 IP 10.0.0.9.5432 > 10.0.0.2.51514: Flags [R.], seq 0, ack 1002
```
The server answered the SYN with RST: the host is reachable, but nothing is listening on 5432 (or a firewall actively rejects). If you only see repeated `[S]` lines with no reply, packets are being dropped → timeout.

### Latency breakdown

`dns=0.004 tcp=0.020 tls=0.180 ttfb=1.950 total=1.960` → network and TLS are fine; the server took ~1.8 s to produce the first byte. Investigate the application, not the network.

## Common misconceptions

- **"ping works, so the service is reachable."** — ICMP says nothing about TCP ports or firewalls on them.
- **"TIME_WAIT means a leak."** — It's normal TCP behaviour; CLOSE_WAIT is the suspicious one.
- **"curl -k is fine for testing."** — It hides certificate problems you need to see.

## Practical exercises

1. Complete the **Linux Networking lab**.
2. Measure the timing breakdown of three public sites with `curl -w` and explain differences.
3. Capture a full HTTP request with `tcpdump -nn -A port 8080` against your lab server and identify handshake, request, response and FIN.
