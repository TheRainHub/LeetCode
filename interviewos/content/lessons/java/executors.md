---
slug: executors
title: Executors, thread pools and virtual threads
path: java
module: java-concurrency
order: 3
minutes: 50
depth: full
practice: lab
summary: Running tasks without managing threads — pool sizing, queues and rejection, cancellation, shutdown, and where virtual threads fit.
prerequisites: [synchronization]
problems: []
objectives:
  - Submit tasks to an ExecutorService and collect results with Future and invokeAll
  - Size thread pools for CPU-bound vs I/O-bound work and choose queues/rejection policies
  - Shut down executors correctly and propagate interruption
  - Explain virtual threads and when they help
readings:
  - title: "Java SE 21 API — ExecutorService"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ExecutorService.html
    kind: docs
  - title: "Java SE 21 API — ThreadPoolExecutor"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ThreadPoolExecutor.html
    kind: docs
  - title: "Java SE 21 — Virtual Threads"
    url: https://docs.oracle.com/en/java/javase/21/core/virtual-threads.html
    kind: docs
interview:
  - q: "How would you size a thread pool?"
    a: "CPU-bound: about the number of cores (Runtime.availableProcessors()). I/O-bound: more threads, roughly cores × (1 + wait time / compute time), validated by load testing; or use virtual threads for blocking I/O. Also bound the queue to avoid unbounded memory growth."
  - q: "Why is Executors.newFixedThreadPool risky in production?"
    a: "It uses an unbounded LinkedBlockingQueue: under overload tasks pile up in memory and latency explodes instead of failing fast. Prefer a ThreadPoolExecutor with a bounded queue and an explicit rejection policy."
  - q: "What do virtual threads change?"
    a: "Blocking I/O no longer ties up an OS thread, so thread-per-request with simple blocking code scales to many concurrent tasks. They don't speed up CPU-bound work, and pinning (e.g. blocking inside synchronized in older JDKs or native calls) can reduce benefits."
selfAssessment:
  - I always shut down executors I create
  - I can explain bounded queues and rejection policies
  - I know when virtual threads help and when they don't
completion:
  - Score at least 70% on the quiz
  - Explain pool sizing in interview mode
quiz:
  - q: "future.get() on a task that threw an exception:"
    options: ["Returns null", "Throws ExecutionException wrapping the cause", "Hangs forever", "Rethrows the original exception unwrapped"]
    answer: 1
    why: "Check getCause() for the original exception."
  - q: "ThreadPoolExecutor.CallerRunsPolicy on rejection:"
    options: ["Drops the task", "Runs the task in the submitting thread, slowing producers (backpressure)", "Throws", "Queues it anyway"]
    answer: 1
    why: "It throttles submitters instead of losing work."
  - q: "shutdown() vs shutdownNow():"
    options: ["Identical", "shutdown stops accepting new tasks and lets queued ones finish; shutdownNow interrupts running tasks and returns queued ones", "shutdownNow waits for completion", "shutdown kills threads immediately"]
    answer: 1
    why: "Follow with awaitTermination to wait."
  - q: "Virtual threads are most beneficial for:"
    options: ["CPU-heavy numeric loops", "Many concurrent tasks that mostly block on I/O", "GUI rendering", "Reducing GC pauses"]
    answer: 1
    why: "Blocked virtual threads release their carrier OS thread."
explain:
  prompt: "Explain how you'd configure a thread pool for a service that calls a slow external API, including sizing, queueing, rejection and shutdown."
  rubric:
    - "Distinguishes I/O-bound from CPU-bound sizing (or proposes virtual threads)"
    - "Uses a bounded queue to avoid unbounded memory/latency growth"
    - "Chooses a rejection policy (fail fast or CallerRuns backpressure) deliberately"
    - "Sets timeouts on the external calls and handles failures"
    - "Shuts down gracefully (shutdown + awaitTermination) and names threads for debugging"
  model: "Calls to a slow API are I/O-bound, so threads mostly wait; I'd size the pool larger than the core count, guided by the target concurrency and load tests, or on Java 21 use virtual threads with a Semaphore to cap concurrent calls so we don't overwhelm the downstream. With a platform pool I'd use ThreadPoolExecutor with a bounded ArrayBlockingQueue, because an unbounded queue just converts overload into memory growth and huge latency. When the queue is full, I'd either reject fast so the caller can return 503, or use CallerRunsPolicy for backpressure. Every external call gets a timeout so threads can't hang forever. Threads get meaningful names via a ThreadFactory, and on shutdown I call shutdown, awaitTermination with a deadline, then shutdownNow."
cards:
  - q: "Pool size rule of thumb"
    a: "CPU-bound ≈ cores; I/O-bound ≈ cores × (1 + wait/compute), validated by load tests."
  - q: "Problem with newFixedThreadPool"
    a: "Unbounded queue → memory and latency blow-up under overload."
  - q: "Graceful executor shutdown"
    a: "shutdown(); awaitTermination(timeout); then shutdownNow() if needed."
---

## Explanation

An **executor** decouples task submission from execution. You submit `Runnable`/`Callable` tasks; the executor manages threads.

```java
ExecutorService pool = Executors.newFixedThreadPool(8);
Future<Integer> f = pool.submit(() -> compute());
Integer result = f.get(2, TimeUnit.SECONDS);   // may throw ExecutionException / TimeoutException
List<Future<Integer>> all = pool.invokeAll(tasks);
```

### ThreadPoolExecutor anatomy

`new ThreadPoolExecutor(core, max, keepAlive, unit, queue, threadFactory, rejectionHandler)`

- Threads up to `core` are created for new tasks; then tasks go to the **queue**; only when the queue is full are threads added up to `max`; then the **rejection policy** applies.
- Rejection policies: `AbortPolicy` (throw), `CallerRunsPolicy` (backpressure), `DiscardPolicy`, `DiscardOldestPolicy`.
- `Executors.newFixedThreadPool` and `newSingleThreadExecutor` use **unbounded** queues; `newCachedThreadPool` can create unbounded threads. Fine for tests; be explicit in production.

### Sizing

- **CPU-bound**: ≈ `availableProcessors()` (more threads only add context switching).
- **I/O-bound**: larger; Little's law helps: concurrency ≈ throughput × latency. Validate with load tests.
- Separate pools (bulkheads) for different dependencies so one slow dependency can't starve everything.

### Cancellation and shutdown

Interruption is cooperative: `future.cancel(true)` interrupts the worker; blocking methods throw `InterruptedException`. Either propagate it or restore the flag with `Thread.currentThread().interrupt()` — never swallow it.

```java
pool.shutdown();
if (!pool.awaitTermination(30, TimeUnit.SECONDS)) pool.shutdownNow();
```
Java 19+ `ExecutorService` is `AutoCloseable`: `try (var ex = Executors.newVirtualThreadPerTaskExecutor()) { ... }` waits for tasks on close.

### Virtual threads (Java 21)

Lightweight threads managed by the JVM; when they block on I/O they unmount from their carrier OS thread. Write simple blocking code, run thousands of tasks. Caveats: don't pool them (create per task), limit access to scarce resources with semaphores, CPU-bound work gains nothing, and pinning can occur (e.g. native frames; `synchronized` pinning was addressed in later JDKs).

## Worked examples

### Bounded pool with backpressure

```java
ThreadPoolExecutor pool = new ThreadPoolExecutor(
    16, 16, 0, TimeUnit.SECONDS,
    new ArrayBlockingQueue<>(500),
    Thread.ofPlatform().name("api-worker-", 0).factory(),
    new ThreadPoolExecutor.CallerRunsPolicy());
```

### Fan-out with virtual threads and a concurrency cap

```java
Semaphore permits = new Semaphore(20);
try (var ex = Executors.newVirtualThreadPerTaskExecutor()) {
    List<Future<Price>> futures = skus.stream().map(sku -> ex.submit(() -> {
        permits.acquire();
        try { return client.fetchPrice(sku); } finally { permits.release(); }
    })).toList();
    for (Future<Price> f : futures) prices.add(f.get());
}
```

## Common misconceptions

- **"More threads = more throughput."** — Past the bottleneck it only adds contention and memory.
- **"Swallowing InterruptedException is harmless."** — It breaks cancellation and shutdown.
- **"Virtual threads make code faster."** — They improve concurrency for blocking I/O, not CPU work.
- **"Executors clean up themselves."** — Non-daemon pool threads keep the JVM alive until shutdown.

## Practical exercises

1. Rewrite the lab's counter experiment using `invokeAll` and print per-task timings.
2. Configure a `ThreadPoolExecutor` with a bounded queue and observe each rejection policy under load.
3. Fetch 1000 URLs (or simulated sleeps) with platform threads vs virtual threads and compare.
