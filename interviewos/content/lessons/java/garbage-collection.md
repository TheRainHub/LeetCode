---
slug: garbage-collection
title: Garbage collection
path: java
module: java-runtime
order: 3
minutes: 45
depth: full
practice: conceptual
summary: Generational collection, the G1/ZGC/Parallel trade-offs between throughput and pause time, and how to reason about GC in latency-sensitive systems.
prerequisites: [memory-management]
problems: []
objectives:
  - Explain mark, sweep/compact and copying collection and the generational hypothesis
  - Compare Serial, Parallel, G1 and ZGC by throughput, pause time and footprint
  - Read basic GC logs and reduce allocation pressure in hot paths
readings:
  - title: "Java SE 21 — HotSpot Virtual Machine Garbage Collection Tuning Guide"
    url: https://docs.oracle.com/en/java/javase/21/gctuning/introduction-garbage-collection-tuning.html
    kind: docs
  - title: "OpenJDK — ZGC project page"
    url: https://wiki.openjdk.org/display/zgc
    kind: docs
interview:
  - q: "What is the generational hypothesis and how do collectors exploit it?"
    a: "Most objects die young. The heap is split into young and old generations; the young generation is collected often and cheaply by copying surviving objects (cost proportional to live objects, not garbage), and survivors are promoted to the old generation, which is collected less often."
  - q: "G1 vs ZGC — when would you choose each?"
    a: "G1 (default) balances throughput and pause times with region-based incremental collection and a pause goal (~200 ms default). ZGC is concurrent with sub-millisecond pauses largely independent of heap size, at some CPU/throughput cost — good for latency-sensitive services with large heaps."
  - q: "How do you reduce GC pressure in a hot path?"
    a: "Allocate less: avoid boxing and temporary objects, reuse buffers, prefer primitive arrays, size collections up front, avoid string building in loops; then measure allocation rate with a profiler (JFR, async-profiler)."
selfAssessment:
  - I can explain stop-the-world pauses and why they matter for latency
  - I can name the collector I'd choose for a low-latency service and why
completion:
  - Score at least 70% on the quiz
  - Explain the throughput vs latency trade-off in interview mode
quiz:
  - q: "Copying collectors' cost is mainly proportional to:"
    options: ["Total heap size", "The amount of live data copied", "The number of dead objects", "The number of threads"]
    answer: 1
    why: "Dead objects are never touched — which makes young-gen collection cheap when most objects die young."
  - q: "The default collector in modern JDKs (since 9) for server-class machines is:"
    options: ["Serial", "Parallel", "G1", "ZGC"]
    answer: 2
    why: "G1 is the default; ZGC and Parallel are opt-in via flags."
  - q: "A stop-the-world pause means:"
    options: ["The OS suspends the process", "Application threads are paused while the GC performs some phase", "The JVM restarts", "Only the GC thread stops"]
    answer: 1
    why: "Concurrent collectors minimise these pauses but rarely eliminate them completely."
  - q: "For a batch job that maximises total work per hour, the usual choice is:"
    options: ["ZGC", "Parallel GC", "Epsilon (no-op) GC in production", "Serial on many cores"]
    answer: 1
    why: "Parallel GC optimises throughput and accepts longer pauses."
explain:
  prompt: "Explain how generational garbage collection works and how you'd choose a collector for a low-latency trading or API service."
  rubric:
    - "Generational hypothesis: most objects die young"
    - "Young collections copy survivors; old generation collected less often (mark/compact or regions)"
    - "Stop-the-world vs concurrent phases and why pauses hurt tail latency"
    - "Compares Parallel (throughput), G1 (balanced default), ZGC (low pause) with trade-offs"
    - "Mentions reducing allocation and measuring (GC logs, JFR) before tuning flags"
  model: "Most objects die young, so the heap is split into generations. New objects go to the young generation, which is collected frequently by copying the few survivors into survivor space; that's cheap because cost scales with live data. Objects that survive several cycles are promoted to the old generation, collected less often. Some phases stop all application threads, and those pauses show up directly in tail latency. Parallel GC maximises throughput but pauses longer, G1 is the balanced default with region-based collection and a pause-time goal, and ZGC does nearly everything concurrently with sub-millisecond pauses at some CPU cost. For a latency-sensitive service I'd start with G1 or ZGC, but first reduce allocation in hot paths and measure with GC logs and JFR rather than guessing at flags."
cards:
  - q: "Generational hypothesis"
    a: "Most objects die young → collect the young generation often and cheaply."
  - q: "Collector trade-offs"
    a: "Parallel = throughput; G1 = balanced default; ZGC = sub-ms pauses, more CPU."
  - q: "First step against GC problems"
    a: "Measure (GC logs, JFR), then reduce allocation; tune flags last."
---

## Explanation

### Basic algorithms

- **Mark** — trace from GC roots, marking reachable objects.
- **Sweep** — reclaim unmarked memory (fragmentation risk).
- **Compact** — move live objects together (no fragmentation, costs copying and reference updates).
- **Copying** — evacuate live objects to a new space; cost ∝ live data.

### Generational collection

The **weak generational hypothesis**: most objects die young (temporary strings, iterators, request objects). So:

- **Young generation** (Eden + survivor spaces) — collected frequently with a copying collector ("minor GC").
- **Old generation** — objects that survived N young collections are **promoted**; collected less often ("major/mixed GC").
- Cross-generation references are tracked with **card tables / remembered sets** so young collections don't scan the whole old generation.

### Collectors in HotSpot

| Collector | Goal | Pauses | Notes |
|---|---|---|---|
| Serial | small heaps, single core | STW | client/embedded |
| Parallel | throughput | longer STW | batch jobs |
| G1 (default) | balance | target pause (`-XX:MaxGCPauseMillis=200`) | heap divided into regions; collects garbage-first regions; concurrent marking |
| ZGC | latency | sub-millisecond, ~independent of heap size | concurrent relocation with load barriers; generational since JDK 21 |
| Shenandoah | latency | low | concurrent compaction (non-Oracle builds) |

### Latency-sensitive systems

In low-latency systems (e.g. trading), tail latency matters more than averages. Strategies:

1. **Allocate less** in hot paths: primitives, reused buffers, object pools only when measured, avoiding boxing and streams in tight loops.
2. **Choose a low-pause collector** (ZGC) or size the young generation so minor GCs are short.
3. **Measure**: GC logs (`-Xlog:gc*:file=gc.log`), JDK Flight Recorder allocation profiling, p99/p999 latency correlated with GC events.
4. **Avoid** relying on `System.gc()` or finalizers.

## Worked examples

### Reading a G1 log line

```text
[12.345s][info][gc] GC(42) Pause Young (Normal) (G1 Evacuation Pause) 512M->128M(1024M) 8.531ms
```
Heap occupancy dropped from 512 MB to 128 MB (most young objects were garbage) in an 8.5 ms stop-the-world pause. If "after" values for collections keep rising over hours, suspect a leak; if pauses are long, check live-set size and allocation rate.

### Removing allocation from a hot loop

```java
// Before: allocates a boxed Long per element and an iterator
long sum = list.stream().mapToLong(Long::longValue).sum();
// After: primitive array, no allocation in the loop
long sum = 0; for (long v : values) sum += v;
```

## Common misconceptions

- **"GC pauses are proportional to heap size."** — Copying cost depends on live data; ZGC pauses are nearly heap-size independent.
- **"Bigger heap always helps."** — It reduces GC frequency but can lengthen some pauses and hide leaks.
- **"Object pooling is always faster."** — Modern allocation is cheap; pooling can increase old-generation pressure. Measure.
- **"Tune flags first."** — Fix allocation patterns and leaks first.

## Practical exercises

1. Run a small allocation-heavy program with `-Xlog:gc` under G1 and ZGC; compare pause times.
2. Use JDK Flight Recorder (`-XX:StartFlightRecording`) to find the top allocating methods.
3. Explain to yourself, out loud, why a copying young collection is cheap when most objects die young.
