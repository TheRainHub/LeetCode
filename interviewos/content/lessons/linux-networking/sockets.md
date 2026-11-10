---
slug: sockets
title: Sockets and network programming
path: linux-networking
module: net-transport
order: 1
minutes: 45
depth: full
practice: lab
summary: The socket API behind every server — listen/accept, blocking vs non-blocking I/O, epoll, and the connection lifecycle your frameworks hide.
prerequisites: [processes-threads, tcp-ip]
problems: []
objectives:
  - Walk through the server and client socket call sequence
  - Explain backlog, ephemeral ports and the 4-tuple identifying a connection
  - Compare blocking, non-blocking and event-driven (epoll) I/O models
readings:
  - title: "man7 — socket(7)"
    url: https://man7.org/linux/man-pages/man7/socket.7.html
    kind: docs
  - title: "man7 — epoll(7)"
    url: https://man7.org/linux/man-pages/man7/epoll.7.html
    kind: docs
  - title: "Beej's Guide to Network Programming"
    url: https://beej.us/guide/bgnet/
    kind: book
interview:
  - q: "What uniquely identifies a TCP connection?"
    a: "The 4-tuple (source IP, source port, destination IP, destination port), plus protocol. That's why one server port can accept many connections, and why clients use ephemeral ports."
  - q: "How does a single-threaded server like nginx or Node handle thousands of connections?"
    a: "Non-blocking sockets plus an event notification mechanism (epoll on Linux): the event loop asks the kernel which sockets are ready and only does work for those, so idle connections cost memory but no threads."
  - q: "What is the listen backlog?"
    a: "The queue of connections that completed the handshake but haven't been accept()ed yet. If it overflows (slow accept loop under load), new SYNs/ACKs are dropped and clients see timeouts."
selfAssessment:
  - I can list server-side socket calls in order
  - I can explain epoll at a conceptual level
completion:
  - Score at least 70% on the quiz
  - Verify the Linux Networking lab
quiz:
  - q: "The server-side call order is:"
    options: ["connect, bind, listen", "socket, bind, listen, accept", "socket, accept, bind", "listen, socket, accept"]
    answer: 1
    why: "Clients call socket then connect."
  - q: "accept() returns:"
    options: ["The listening socket", "A new socket (file descriptor) for that specific client connection", "The client's PID", "Nothing until data arrives"]
    answer: 1
    why: "The listening socket keeps accepting other clients."
  - q: "Binding to 127.0.0.1 instead of 0.0.0.0 means:"
    options: ["Faster connections", "Only local clients can connect", "Only IPv6 works", "TLS is required"]
    answer: 1
    why: "0.0.0.0 binds all IPv4 interfaces — a classic 'works locally, not in Docker' issue."
explain:
  prompt: "Explain how a server accepts and serves many concurrent clients, from socket() to the event loop."
  rubric:
    - "socket/bind/listen/accept sequence; accept returns a per-connection socket"
    - "Thread-per-connection blocking model and its limits"
    - "Non-blocking sockets + epoll/kqueue event loop model"
    - "Backlog and what happens under overload"
  model: "The server creates a socket, binds it to an address and port, and calls listen, which makes the kernel complete TCP handshakes into a backlog queue. accept takes one completed connection and returns a new file descriptor for it, while the listening socket keeps going. The simple model gives each accepted connection its own thread doing blocking reads and writes, which is easy but costs a thread per connection. Event-driven servers set sockets non-blocking and register them with epoll; one thread waits for readiness events and processes only the sockets that can make progress, so tens of thousands of idle connections are cheap. If the server can't accept fast enough the backlog fills and clients see timeouts."
cards:
  - q: "Server socket sequence"
    a: "socket → bind → listen → accept (loop) → read/write → close."
  - q: "Connection identity"
    a: "4-tuple: src IP, src port, dst IP, dst port."
  - q: "epoll"
    a: "Kernel tells the event loop which of many non-blocking sockets are ready."
---

## Explanation

### The call sequence

```text
Server: socket() → bind(addr, port) → listen(backlog) → accept() → read()/write() → close()
Client: socket() → connect(addr, port) → write()/read() → close()
```

- `listen` lets the kernel complete handshakes into the **accept queue** (size ≈ backlog, capped by `net.core.somaxconn`).
- `accept` returns a **new socket** per connection.
- Clients get an **ephemeral port** (`net.ipv4.ip_local_port_range`); a connection is identified by the 4-tuple.
- `close`/`shutdown` start the FIN exchange.

### I/O models

| Model | How | Trade-off |
|---|---|---|
| Blocking, thread per connection | `read` blocks the thread | simple; threads cost memory and switching |
| Non-blocking + readiness (epoll) | event loop handles ready sockets | scales to many connections; logic is callback/async |
| Virtual threads / coroutines | blocking-style code on cheap threads | simple code, scalable I/O |

Node.js (libuv), nginx, Netty and Redis use event loops over epoll/kqueue.

### Socket options worth knowing

`SO_REUSEADDR` (restart a server despite TIME_WAIT), `SO_KEEPALIVE`, `TCP_NODELAY` (disable Nagle for latency-sensitive small writes), send/receive buffer sizes, timeouts.

## Worked examples

A minimal Python echo server (blocking, thread per connection):

```python
import socket, threading
srv = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
srv.setsockopt(socket.SOL_SOCKET, socket.SO_REUSEADDR, 1)
srv.bind(("0.0.0.0", 9000)); srv.listen(128)
def handle(conn):
    with conn:
        while data := conn.recv(4096):
            conn.sendall(data)
while True:
    conn, addr = srv.accept()
    threading.Thread(target=handle, args=(conn,), daemon=True).start()
```
Test with `nc localhost 9000` and inspect with `ss -tanp | grep 9000`: one LISTEN socket plus one ESTAB socket per client.

## Common misconceptions

- **"One port = one connection."** — Many connections share the server port; the 4-tuple differs.
- **"recv returns a whole message."** — TCP is a byte stream; you must frame messages (length prefix, delimiter).
- **"Event loops are faster for everything."** — CPU-heavy work blocks the loop; offload it.

## Practical exercises

1. Run the echo server, connect two clients with `nc`, and identify all sockets with `ss`.
2. Show that `recv` can return partial data by sending a large payload in chunks.
3. Complete the **Linux Networking lab** port-conflict step and explain `SO_REUSEADDR`.
