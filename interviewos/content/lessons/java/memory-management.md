---
slug: memory-management
title: Memory management and memory leaks in Java
path: java
module: java-runtime
order: 2
minutes: 35
depth: concise
practice: conceptual
summary: Stack vs heap, references and reachability, object overhead, and how leaks happen in a garbage-collected language.
prerequisites: [jvm-basics]
problems: []
objectives:
  - Explain stack vs heap allocation and reachability from GC roots
  - Estimate object overhead (headers, references, boxing) at a high level
  - Diagnose common leaks — unbounded caches, listeners, ThreadLocals, static collections
readings:
  - title: "Java SE 21 — Troubleshooting Guide: Troubleshoot Memory Leaks"
    url: https://docs.oracle.com/en/java/javase/21/troubleshoot/troubleshooting-memory-leaks.html
    kind: docs
  - title: "Java SE 21 API — java.lang.ref (weak and soft references)"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/ref/package-summary.html
    kind: docs
interview:
  - q: "How can a Java program leak memory if it has a garbage collector?"
    a: "Objects that are still reachable but no longer needed are never collected: growing static maps/caches without eviction, registered listeners never removed, ThreadLocals in pooled threads, or long-lived collections holding request data."
  - q: "How would you investigate growing heap usage in production?"
    a: "Check GC logs/metrics for heap after GC trending up, take a heap dump (jcmd GC.heap_dump or -XX:+HeapDumpOnOutOfMemoryError), analyse dominators and retained size in a tool like Eclipse MAT, find the GC-root path keeping objects alive."
selfAssessment:
  - I can name four leak patterns in Java
  - I know how to capture and read a heap dump at a high level
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "An object becomes eligible for garbage collection when:"
    options: ["It goes out of scope", "It is no longer reachable from any GC root", "System.gc() is called", "Its finalizer runs"]
    answer: 1
    why: "Reachability from roots (stacks, statics, JNI) is what matters."
  - q: "A HashMap<Long, Long> with a million entries uses:"
    options: ["About 16 MB (two longs each)", "Much more — node objects, boxed Longs and the bucket array", "Exactly 8 MB", "Less than an array"]
    answer: 1
    why: "Each entry has a node object plus two boxed objects; often 60+ bytes per entry."
  - q: "WeakHashMap entries are removed when:"
    options: ["They're older than a minute", "Their keys are no longer strongly reachable", "The map is full", "Never"]
    answer: 1
    why: "Keys are weakly referenced; useful for metadata attached to objects owned elsewhere."
explain:
  prompt: "Explain how memory is managed in Java and how memory leaks still happen."
  rubric:
    - "Stack frames hold locals/references; objects live on the heap"
    - "GC frees objects unreachable from GC roots"
    - "Leaks = reachable but unneeded objects (with examples)"
    - "Diagnosis: heap after GC trend, heap dump, retained size / path to GC root"
  model: "Each thread has a stack of frames with local primitives and references, while objects live on the heap. The garbage collector frees objects that can't be reached from GC roots such as thread stacks and static fields. So a leak in Java isn't forgotten free calls; it's objects that are still reachable but no longer useful: a static cache without eviction, listeners that are registered but never removed, ThreadLocals in pooled threads, or a collection that accumulates per-request data. I'd confirm it by watching heap usage after full GCs trend upward, then take a heap dump and look for the objects with the largest retained size and their path to a GC root."
cards:
  - q: "GC roots"
    a: "Thread stacks (locals), static fields, JNI references, active monitors."
  - q: "Common Java leak sources"
    a: "Unbounded caches/static maps, listeners, ThreadLocals in thread pools, long-lived collections."
---

## Explanation

- **Stack**: per-thread frames with primitives and references; freed automatically when methods return.
- **Heap**: all objects; reclaimed by the GC when **unreachable** from roots (thread stacks, statics, JNI handles).

### Object overhead

A 64-bit JVM object has a header (~12–16 bytes), fields, and padding to 8 bytes. A boxed `Integer` is ~16 bytes versus 4 for an `int`. Collections of boxed values (`List<Integer>`, `Map<Long, Long>`) can use 5–10× the memory of primitive arrays — relevant for performance-oriented roles.

### Reference types

- **Strong** — normal references.
- **Soft** — cleared under memory pressure (rarely the right cache tool; prefer bounded caches).
- **Weak** — cleared when only weakly reachable (`WeakHashMap`).
- **Phantom** — post-mortem cleanup (`Cleaner`).

### Leak patterns

1. Static or long-lived maps used as caches without size/TTL limits.
2. Event listeners/callbacks never unregistered.
3. `ThreadLocal` values in thread pools (threads live forever) — always `remove()`.
4. Inner classes/lambdas capturing large outer objects.
5. Unclosed resources (also file descriptor leaks).

### Diagnosis toolkit

GC logs (`-Xlog:gc*`), `jcmd <pid> GC.heap_info`, `jcmd <pid> GC.heap_dump file.hprof`, `-XX:+HeapDumpOnOutOfMemoryError`, analysis in Eclipse MAT or VisualVM (dominator tree, retained size, path to GC roots).

## Worked examples

```java
class RequestContext {
    private static final ThreadLocal<User> CURRENT = new ThreadLocal<>();
    static void run(User u, Runnable r) {
        CURRENT.set(u);
        try { r.run(); } finally { CURRENT.remove(); }   // without remove(), pooled threads keep stale Users
    }
}
```

## Common misconceptions

- **"GC prevents all leaks."** — It only frees unreachable objects.
- **"System.gc() fixes memory problems."** — It's only a hint and doesn't free reachable objects.
- **"Soft references make a good cache."** — They cause unpredictable GC behaviour; use a bounded cache (e.g. Caffeine).

## Practical exercises

1. Write a program that leaks via a static list, run it with a small heap, and inspect the heap dump.
2. Compare memory of `int[1_000_000]` vs `ArrayList<Integer>` with a quick measurement.
