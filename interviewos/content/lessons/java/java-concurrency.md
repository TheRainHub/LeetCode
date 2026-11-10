---
slug: java-concurrency
title: Threads and the Java Memory Model
path: java
module: java-concurrency
order: 1
minutes: 70
depth: full
practice: lab
summary: What a data race is, why visibility and ordering need happens-before edges, and how to reason about thread safety instead of guessing.
prerequisites: [jvm-basics]
problems: []
objectives:
  - Explain race conditions, atomicity, visibility and ordering with concrete examples
  - State the main happens-before rules (program order, monitor lock, volatile, thread start/join)
  - Identify why `count++` and check-then-act sequences are not thread-safe
  - Choose between confinement, immutability and synchronization as thread-safety strategies
readings:
  - title: "Java Language Specification SE 21 — Chapter 17: Threads and Locks"
    url: https://docs.oracle.com/javase/specs/jls/se21/html/jls-17.html
    kind: spec
    note: Section 17.4 defines the memory model and happens-before.
  - title: "The Java Tutorials — Concurrency"
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/index.html
    kind: docs
  - title: "Java SE 21 API — java.util.concurrent package summary (memory consistency properties)"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/package-summary.html
    kind: docs
interview:
  - q: "What is a data race and why is it a problem beyond 'wrong counts'?"
    a: "Two threads access the same variable without a happens-before ordering and at least one writes. Besides lost updates, the JMM permits other threads to see stale or reordered values, so programs can observe states that no sequential execution would produce."
  - q: "Does volatile make count++ thread-safe?"
    a: "No. volatile guarantees visibility and ordering of individual reads and writes, but count++ is read-modify-write: two threads can read the same value and both write value+1. Use AtomicInteger, synchronized, or LongAdder."
  - q: "What happens-before rules do you rely on most?"
    a: "Unlock of a monitor happens-before every subsequent lock of the same monitor; a volatile write happens-before subsequent reads of that variable; Thread.start happens-before actions in the started thread; all actions in a thread happen-before another thread's successful join on it; plus the java.util.concurrent guarantees (e.g. putting into a ConcurrentHashMap or BlockingQueue happens-before retrieval)."
  - q: "What's the difference between a race condition and a data race?"
    a: "A data race is unsynchronised conflicting access (a memory-model concept). A race condition is a correctness bug due to timing — e.g. check-then-act — and can exist even with fully synchronised individual operations, such as two threads both seeing 'seat available' before either books it."
selfAssessment:
  - I can draw an interleaving that loses an update
  - I can state four happens-before rules from memory
  - I can explain why a boolean stop flag needs volatile
completion:
  - Score at least 70% on the quiz
  - Verify the Java Concurrency lab
  - Explain visibility vs atomicity in interview mode
quiz:
  - q: "A thread loops while (!stop) {} and another sets stop = true (plain boolean). What can happen?"
    options: ["It always stops promptly", "The loop may never observe the write and spin forever", "Compile error", "Exception"]
    answer: 1
    why: "Without volatile/synchronization there's no visibility guarantee; the JIT may even hoist the read out of the loop."
  - q: "Which operation is atomic in Java without extra synchronization?"
    options: ["count++ on an int field", "Reading or writing an int field (not long/double)", "map.put on a HashMap", "if (x == null) x = new X()"]
    answer: 1
    why: "Single int reads/writes are atomic (but not necessarily visible); compound actions are not. Non-volatile long/double writes may even be split."
  - q: "Thread confinement means:"
    options: ["Using a lock per thread", "Data is only accessed by one thread, so it needs no synchronization", "Threads cannot be interrupted", "Using daemon threads"]
    answer: 1
    why: "Examples: local variables, ThreadLocal, single-threaded executors owning state."
  - q: "Double-checked locking for a lazy singleton is correct in modern Java when:"
    options: ["Never", "The instance field is volatile", "The class is final", "You use two locks"]
    answer: 1
    why: "Without volatile another thread can see a reference to a partially constructed object."
explain:
  prompt: "Explain atomicity, visibility and ordering in the Java Memory Model, using count++ and a stop flag as examples."
  rubric:
    - "Atomicity: count++ is read-modify-write; interleavings lose updates"
    - "Visibility: without happens-before, a thread may never see another's write (stop flag)"
    - "Ordering: compiler/CPU reordering is allowed unless constrained (e.g. publication of partially constructed objects)"
    - "Happens-before edges via synchronized, volatile, thread start/join, j.u.c. classes"
    - "Correct fixes: AtomicInteger/synchronized for count; volatile for the flag"
  model: "Three properties matter. Atomicity: count++ is a read, an add and a write, so two threads can both read 5 and both write 6, losing an update. Visibility: if one thread sets a plain boolean stop flag, the JMM doesn't guarantee another thread ever sees it — the JIT can even hoist the read out of the loop — unless there's a happens-before edge. Ordering: the compiler and CPU may reorder independent writes, so another thread could see a reference to an object before its fields are initialised. Happens-before edges come from releasing and acquiring the same monitor, writing then reading a volatile, Thread.start and join, and the java.util.concurrent classes. So the stop flag should be volatile, which fixes visibility and ordering, while the counter needs atomicity too: AtomicInteger, synchronized, or LongAdder."
cards:
  - q: "volatile guarantees"
    a: "Visibility + ordering for that variable's reads/writes; not atomicity of compound actions."
  - q: "Happens-before: monitors"
    a: "Unlock of monitor M happens-before every later lock of M."
  - q: "Three thread-safety strategies"
    a: "Don't share (confinement), don't mutate (immutability), or synchronize access."
  - q: "Race condition example with synchronized getters"
    a: "Check-then-act across two calls (if available then book) — needs one atomic operation."
---

## Explanation

### Threads in Java

A `Thread` runs a `Runnable`; modern code rarely creates threads directly and uses executors instead. Java 21 adds **virtual threads** (`Thread.ofVirtual()`, `Executors.newVirtualThreadPerTaskExecutor()`), cheap threads scheduled by the JVM — excellent for blocking I/O, but they don't make shared-state bugs go away.

### The three problems

1. **Atomicity** — compound actions (`count++`, check-then-act, read-modify-write on collections) can interleave.
2. **Visibility** — writes may sit in caches/registers or be optimised; another thread may not see them.
3. **Ordering** — compilers and CPUs reorder instructions that look independent within one thread.

### The Java Memory Model in one paragraph

The JMM defines **happens-before (HB)**. If action A happens-before B, B sees A's effects. Without an HB path between a write and a read of the same variable, you have a **data race** and the read may see stale or surprising values. HB edges:

| Rule | Edge |
|---|---|
| Program order | each action HB later actions in the same thread |
| Monitor | unlock(M) HB subsequent lock(M) |
| volatile | write(v) HB subsequent read(v) |
| Thread start | `t.start()` HB actions in t |
| Thread join | actions in t HB return from `t.join()` |
| Transitivity | A HB B and B HB C ⇒ A HB C |
| j.u.c. | e.g. `queue.put(x)` HB `queue.take()` returning x |

`final` fields of a properly constructed object (no `this` escape) are visible to all threads without synchronization.

### Strategies for thread safety

1. **Don't share** — thread confinement (locals, `ThreadLocal`, one owner thread/actor).
2. **Don't mutate** — immutable objects (records with defensive copies).
3. **Synchronize** — locks, atomics, concurrent collections; keep invariants inside one critical section.

### Race conditions beyond data races

Even with thread-safe operations, **sequences** can be wrong:

```java
if (!map.containsKey(k)) map.put(k, v);   // two threads can both put
map.putIfAbsent(k, v);                    // atomic in ConcurrentHashMap
```

## Worked examples

### Example 1 — lost update interleaving

| Time | Thread A | Thread B | count |
|---|---|---|---|
| 1 | read 41 | | 41 |
| 2 | | read 41 | 41 |
| 3 | write 42 | | 42 |
| 4 | | write 42 | 42 |

Two increments, one effect. The Java Concurrency lab reproduces this with millions of increments.

### Example 2 — safe publication of a lazily created object

```java
class Config {
    private static volatile Config instance;               // volatile is essential
    static Config get() {
        Config c = instance;
        if (c == null) {
            synchronized (Config.class) {
                c = instance;
                if (c == null) instance = c = load();
            }
        }
        return c;
    }
}
```
Simpler and preferred: the **holder idiom** (`private static class Holder { static final Config I = load(); }`) which relies on class initialisation guarantees.

### Example 3 — the stop flag

```java
private volatile boolean running = true;
void stop() { running = false; }
void loop() { while (running) doWork(); }
```
Better still for tasks: use interruption (`Thread.interrupt()` / `Future.cancel(true)`) and check `Thread.currentThread().isInterrupted()`.

## Common misconceptions

- **"volatile makes operations atomic."** — Only single reads/writes; not `++`.
- **"It works on my machine, so it's correct."** — Races depend on timing, CPU and JIT; tests rarely prove absence.
- **"synchronized getters make a class thread-safe."** — Callers' compound operations still race.
- **"Single-core machines don't have races."** — Preemption interleaves threads anywhere, and the JMM still permits reordering.

## Practical exercises

1. Complete the **Java Concurrency lab** (unsafe counter, `synchronized`, `AtomicInteger`, the volatile trap).
2. Write a check-then-act bug with `ConcurrentHashMap` and fix it with `computeIfAbsent`.
3. Implement a lazily-initialised singleton with the holder idiom and explain why it's thread-safe.
