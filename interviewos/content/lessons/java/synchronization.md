---
slug: synchronization
title: Synchronization, locks and atomics
path: java
module: java-concurrency
order: 2
minutes: 60
depth: full
practice: lab
summary: synchronized, ReentrantLock, atomics and concurrent collections — choosing the right tool and avoiding deadlocks.
prerequisites: [java-concurrency]
problems: []
objectives:
  - Use synchronized, ReentrantLock and ReadWriteLock correctly and know their differences
  - Explain compare-and-set and when atomics or LongAdder beat locks
  - Prevent deadlocks with lock ordering and timeouts; recognise livelock and starvation
  - Coordinate threads with wait/notify replacements — BlockingQueue, CountDownLatch, Semaphore
readings:
  - title: "Java SE 21 API — java.util.concurrent.locks"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/locks/package-summary.html
    kind: docs
  - title: "Java SE 21 API — java.util.concurrent.atomic"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/atomic/package-summary.html
    kind: docs
  - title: "The Java Tutorials — Synchronization"
    url: https://docs.oracle.com/javase/tutorial/essential/concurrency/sync.html
    kind: docs
interview:
  - q: "synchronized vs ReentrantLock?"
    a: "Both are reentrant mutual-exclusion locks with the same memory semantics. ReentrantLock adds tryLock (with timeout), interruptible locking, fairness option and multiple Conditions, but must be unlocked in finally. synchronized is simpler and can't be forgotten."
  - q: "How does AtomicInteger.incrementAndGet work?"
    a: "A compare-and-set (CAS) loop: read the current value, try to atomically replace it with value+1 if unchanged, retry on failure. Lock-free; under heavy contention retries cost CPU, where LongAdder (striped counters) scales better."
  - q: "What are the four conditions for deadlock and how do you prevent it?"
    a: "Mutual exclusion, hold-and-wait, no preemption, circular wait. Prevent circular wait with a global lock ordering (e.g. by account id), use tryLock with timeouts, or minimise holding multiple locks."
  - q: "Producer-consumer in modern Java?"
    a: "Use a BlockingQueue (e.g. ArrayBlockingQueue for bounded backpressure): put blocks when full, take blocks when empty; no manual wait/notify."
selfAssessment:
  - I can write a lock-ordered transfer between two accounts
  - I can explain CAS and the ABA problem at a high level
  - I prefer j.u.c. coordination primitives over wait/notify
completion:
  - Score at least 70% on the quiz
  - Verify the Java Concurrency lab
  - Explain deadlock prevention in interview mode
quiz:
  - q: "Which must be released in a finally block?"
    options: ["synchronized", "ReentrantLock.lock()", "AtomicInteger", "volatile"]
    answer: 1
    why: "Explicit locks aren't released automatically when an exception escapes."
  - q: "Under very high contention on a counter, which scales best?"
    options: ["synchronized", "AtomicLong", "LongAdder", "volatile long"]
    answer: 2
    why: "LongAdder spreads updates across cells and sums on read."
  - q: "Two threads each lock A then B in that order. Deadlock is:"
    options: ["Likely", "Impossible from these two locks — consistent ordering prevents circular wait", "Certain", "Only with fairness"]
    answer: 1
    why: "Deadlock needs a cycle, e.g. A→B in one thread and B→A in another."
  - q: "ReadWriteLock helps when:"
    options: ["Writes dominate", "Reads dominate and read sections are long enough to benefit from sharing", "There is one thread", "You need lock-free code"]
    answer: 1
    why: "Multiple readers proceed concurrently; writers get exclusive access."
explain:
  prompt: "Two threads transfer money between bank accounts concurrently. Explain how you make transfers correct and deadlock-free."
  rubric:
    - "Identifies the invariant (total balance, no negative balances) and that debit+credit must be atomic together"
    - "Explains how naive per-account locking can deadlock (A→B and B→A)"
    - "Uses a global lock order (e.g. by account id) or tryLock with timeout and retry"
    - "Mentions alternatives: single-threaded owner, database transactions, or optimistic concurrency"
    - "Discusses testing difficulty and contention"
  model: "A transfer must debit one account and credit the other as one atomic step so the total balance is preserved and we never overdraw. If each transfer locks the source then the destination, transfer(A, B) and transfer(B, A) running concurrently can each hold one lock and wait for the other — a deadlock from circular wait. I'd break the cycle with a global order: always lock the account with the smaller id first, then the larger, and do the check-and-update inside both locks. An alternative is tryLock with a timeout and retry with backoff. In a real system the accounts would live in a database, so I'd use a transaction with SELECT … FOR UPDATE in a consistent order or a conditional update. Concurrency bugs are hard to test, so I'd add stress tests and keep critical sections short to limit contention."
cards:
  - q: "Deadlock conditions"
    a: "Mutual exclusion, hold-and-wait, no preemption, circular wait — break circular wait with lock ordering."
  - q: "What is CAS (compare-and-set)?"
    a: "Atomically set a value only if it still equals the expected value; retry loop on failure."
  - q: "Coordination primitives"
    a: "BlockingQueue (producer/consumer), CountDownLatch (wait for N events), Semaphore (limit concurrency), CyclicBarrier/Phaser."
---

## Explanation

### Intrinsic locks — `synchronized`

```java
synchronized void deposit(long amount) { balance += amount; }   // locks `this`
synchronized (lock) { /* critical section */ }                  // explicit monitor
```
Reentrant, automatically released (even on exceptions), establishes happens-before between unlock and a later lock of the same monitor. Lock on a private final object, not on `this` or strings, to avoid outside interference.

### Explicit locks

```java
private final ReentrantLock lock = new ReentrantLock();
void update() {
    lock.lock();
    try { /* critical section */ } finally { lock.unlock(); }
}
```
Extras: `tryLock(timeout)`, `lockInterruptibly()`, fairness, multiple `Condition`s. `ReentrantReadWriteLock` lets readers share; `StampedLock` offers optimistic reads.

### Atomics and CAS

`AtomicInteger`, `AtomicLong`, `AtomicReference` use **compare-and-set**:

```java
int prev, next;
do { prev = value.get(); next = prev + 1; } while (!value.compareAndSet(prev, next));
```
Lock-free, but retries waste CPU under contention → `LongAdder` for hot counters. `AtomicReference` with immutable objects enables lock-free updates of composite state (`updateAndGet`).

### Concurrent collections

`ConcurrentHashMap` (atomic `compute`, `merge`, `putIfAbsent`), `CopyOnWriteArrayList` (read-mostly), `ConcurrentLinkedQueue`, `BlockingQueue` implementations (`ArrayBlockingQueue`, `LinkedBlockingQueue`).

### Coordination

| Need | Tool |
|---|---|
| Hand work between threads with backpressure | `BlockingQueue` |
| Wait until N things finish | `CountDownLatch` |
| Limit concurrent access (e.g. 10 DB calls) | `Semaphore` |
| Repeated rendezvous of N threads | `CyclicBarrier`, `Phaser` |

Avoid raw `wait/notify` unless asked; if you use it, wait in a `while` loop (spurious wakeups) while holding the monitor.

### Liveness hazards

- **Deadlock** — circular wait; prevent with ordering or timeouts.
- **Livelock** — threads keep reacting to each other without progress; add randomised backoff.
- **Starvation** — a thread never gets the lock (unfair locks, long critical sections).
- **Contention** — threads waiting rather than working; shrink critical sections, shard state.

## Worked examples

### Deadlock-free transfer

```java
void transfer(Account from, Account to, long amount) {
    Account first = from.id() < to.id() ? from : to;
    Account second = first == from ? to : from;
    synchronized (first) {
        synchronized (second) {
            if (from.balance() < amount) throw new InsufficientFundsException();
            from.debit(amount);
            to.credit(amount);
        }
    }
}
```

### Bounded producer-consumer

```java
BlockingQueue<Job> queue = new ArrayBlockingQueue<>(1000);
// producer
queue.put(job);                 // blocks when full → natural backpressure
// consumer
while (!Thread.currentThread().isInterrupted()) process(queue.take());
```

## Common misconceptions

- **"More locks = more safety."** — More locks = more deadlock risk; protect invariants, not fields.
- **"Atomics are always faster than locks."** — Under heavy contention CAS loops can be worse; measure.
- **"synchronized is slow."** — Uncontended locking is cheap in modern JVMs.
- **"ConcurrentHashMap makes compound actions atomic."** — Only its specific atomic methods are atomic.

## Practical exercises

1. In the **Java Concurrency lab**, compare `synchronized`, `AtomicInteger` and add a `LongAdder` variant.
2. Write a deadlock with two locks, capture a thread dump (`jstack <pid>` or `jcmd <pid> Thread.print`) and find the cycle; then fix it with ordering.
3. Implement a rate-limited worker with a `Semaphore(10)`.
