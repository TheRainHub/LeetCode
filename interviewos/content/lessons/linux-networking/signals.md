---
slug: signals
title: Signals and graceful shutdown
path: linux-networking
module: linux-os
order: 3
minutes: 30
depth: concise
practice: conceptual
summary: SIGTERM vs SIGKILL, signal handling, and how containers and Kubernetes stop your service — the basis of graceful shutdown.
prerequisites: [processes-threads]
problems: []
objectives:
  - Explain common signals (SIGTERM, SIGKILL, SIGINT, SIGHUP, SIGCHLD) and which can be caught
  - Implement graceful shutdown that drains in-flight work
  - Explain the PID 1 problem in containers
readings:
  - title: "man7 — signal(7)"
    url: https://man7.org/linux/man-pages/man7/signal.7.html
    kind: docs
  - title: "Kubernetes docs — Pod lifecycle: termination of Pods"
    url: https://kubernetes.io/docs/concepts/workloads/pods/pod-lifecycle/
    kind: docs
interview:
  - q: "SIGTERM vs SIGKILL?"
    a: "SIGTERM (15) asks the process to terminate and can be caught for cleanup; SIGKILL (9) cannot be caught or ignored — the kernel kills immediately, so no cleanup happens. Orchestrators send SIGTERM, wait a grace period, then SIGKILL."
  - q: "What is the PID 1 problem in Docker?"
    a: "The container's first process is PID 1, which gets no default signal handlers, so if the app doesn't handle SIGTERM it ignores it and gets SIGKILLed after the timeout; PID 1 must also reap zombies. Use exec-form CMD, handle signals, or a tiny init (tini, docker run --init)."
selfAssessment:
  - I can describe what happens during a Kubernetes rolling update shutdown
  - I can explain why a container may ignore SIGTERM and how to fix it
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Which signal cannot be caught?"
    options: ["SIGTERM", "SIGINT", "SIGKILL", "SIGHUP"]
    answer: 2
    why: "SIGKILL and SIGSTOP can't be caught or ignored."
  - q: "Ctrl+C in a terminal sends:"
    options: ["SIGKILL", "SIGINT", "SIGTERM", "SIGSTOP"]
    answer: 1
    why: "SIGINT, delivered to the foreground process group."
  - q: "CMD node server.js in shell form inside a Dockerfile can cause:"
    options: ["Faster startup", "SIGTERM going to /bin/sh instead of node, so the app never sees it", "No issue", "Port conflicts"]
    answer: 1
    why: "Shell form wraps the command in sh -c; use exec form CMD [\"node\", \"server.js\"]."
explain:
  prompt: "Describe how a service should shut down gracefully when Kubernetes terminates its pod."
  rubric:
    - "Kubernetes sends SIGTERM, waits terminationGracePeriodSeconds, then SIGKILL"
    - "App stops accepting new requests / fails readiness, finishes in-flight work"
    - "Closes resources (DB pools, consumers commit offsets) within the grace period"
    - "Handles the endpoint-removal race (preStop sleep or delay) and PID 1 signal delivery"
  model: "When a pod is terminated, Kubernetes removes it from Service endpoints and sends SIGTERM to the container's main process, waits for the grace period (30 seconds by default), and then sends SIGKILL. So the app must catch SIGTERM, stop accepting new work — failing readiness and closing the listener — finish in-flight requests and background jobs, commit consumer offsets and close connection pools, all within the grace period. Because endpoint removal propagates asynchronously, a short preStop sleep avoids sending new traffic to a pod that's already shutting down. The app also has to actually receive the signal: use exec-form CMD so it runs as PID 1, or a small init like tini."
cards:
  - q: "Kubernetes termination sequence"
    a: "Remove from endpoints + SIGTERM → grace period (default 30 s) → SIGKILL."
  - q: "SIGHUP common use"
    a: "Reload configuration (e.g. nginx -s reload) or terminal hang-up."
---

## Explanation

Signals are asynchronous notifications to a process.

| Signal | Default | Catchable | Typical use |
|---|---|---|---|
| SIGTERM (15) | terminate | yes | polite shutdown request |
| SIGKILL (9) | terminate | **no** | force kill |
| SIGINT (2) | terminate | yes | Ctrl+C |
| SIGHUP (1) | terminate | yes | reload config (daemons) |
| SIGCHLD | ignore | yes | child state changed (reap it) |
| SIGSTOP / SIGCONT | stop / continue | no / yes | job control |
| SIGSEGV | core dump | (yes) | invalid memory access |

`kill -TERM <pid>`, `kill -l` lists signals, `trap 'cleanup' TERM` in Bash.

### Graceful shutdown

1. On SIGTERM, stop accepting new work (close listeners, fail readiness checks).
2. Finish or hand off in-flight work within a deadline.
3. Flush and close resources (DB pools, message consumer offsets, files).
4. Exit 0.

Java: `Runtime.getRuntime().addShutdownHook(...)` (Spring Boot has `server.shutdown=graceful`). Node: `process.on("SIGTERM", ...)`.

### Containers

The container's entrypoint runs as **PID 1**, which has no default signal disposition and must reap zombies. Use exec-form `CMD ["java", "-jar", "app.jar"]`, avoid wrapper shell scripts without `exec`, or add `--init`/tini.

## Worked examples

```js
const server = app.listen(8080);
process.on("SIGTERM", () => {
  console.log("draining");
  server.close(() => db.end().then(() => process.exit(0)));   // stop accepting, finish in-flight
  setTimeout(() => process.exit(1), 25_000).unref();          // hard deadline below the grace period
});
```

## Common misconceptions

- **"kill means SIGKILL."** — `kill` sends SIGTERM by default.
- **"Shutdown hooks always run."** — Not on SIGKILL or power loss.
- **"Containers forward signals automatically."** — Only to PID 1; shell wrappers can swallow them.

## Practical exercises

1. Write a Bash script with `trap` that cleans up a temp file on SIGTERM and SIGINT.
2. Run a container with a shell-form CMD and observe the 10-second delay on `docker stop`; fix it with exec form.
