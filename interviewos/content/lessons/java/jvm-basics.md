---
slug: jvm-basics
title: JVM fundamentals
path: java
module: java-runtime
order: 1
minutes: 40
depth: concise
practice: conceptual
summary: From .java to running machine code — class loading, bytecode, the JIT and why warm-up matters for performance measurements.
prerequisites: []
problems: []
objectives:
  - Describe the compile → bytecode → class loading → interpretation/JIT pipeline
  - Explain why JVM benchmarks need warm-up and why JMH exists
  - Identify the main JVM memory areas at a high level
readings:
  - title: "The Java Virtual Machine Specification, Java SE 21"
    url: https://docs.oracle.com/javase/specs/jvms/se21/html/index.html
    kind: spec
  - title: "OpenJDK — JMH (Java Microbenchmark Harness)"
    url: https://github.com/openjdk/jmh
    kind: docs
interview:
  - q: "What happens when you run java Main?"
    a: "The JVM starts, the class loader loads Main (and dependencies lazily) through bootstrap/platform/application loaders, bytecode is verified, static initialisers run, and main executes — first interpreted, then hot methods are JIT-compiled to native code with profile-guided optimisations."
  - q: "Why is a naive System.nanoTime() benchmark misleading?"
    a: "It may measure interpretation and JIT compilation instead of steady state, the JIT may eliminate dead code whose result is unused, and GC pauses add noise. Use JMH with warm-up iterations, forks and blackholes."
selfAssessment:
  - I can explain JIT warm-up and its effect on latency
  - I know why JMH exists
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "javac produces:"
    options: ["Native machine code", "Platform-independent bytecode in .class files", "Assembly", "LLVM IR"]
    answer: 1
    why: "The JVM interprets or JIT-compiles bytecode at runtime."
  - q: "The JIT compiler mainly optimises:"
    options: ["All methods equally at startup", "Hot methods identified by runtime profiling", "Only static methods", "Only main()"]
    answer: 1
    why: "Tiered compilation profiles code and compiles hot paths with aggressive optimisations (inlining, escape analysis)."
  - q: "Where do local primitive variables of a method live?"
    options: ["Heap", "The thread's stack frame", "Metaspace", "Code cache"]
    answer: 1
    why: "Objects live on the heap (unless escape analysis scalar-replaces them); locals and references on the stack."
explain:
  prompt: "Explain how Java code goes from source to running fast, and what that implies for performance testing."
  rubric:
    - "javac compiles to bytecode; JVM loads classes lazily via class loaders"
    - "Bytecode is interpreted first, hot methods JIT-compiled (tiered C1/C2)"
    - "JIT uses profiling: inlining, escape analysis, dead-code elimination; deoptimisation possible"
    - "Benchmarks need warm-up and tools like JMH to avoid measuring compilation or eliminated code"
  model: "javac turns source into bytecode in class files. When the program runs, class loaders load classes on first use, the verifier checks the bytecode, and execution starts in the interpreter. The JVM profiles which methods and loops are hot and compiles them with tiered JIT compilers, first quickly and then with aggressive optimisations like inlining, escape analysis and dead-code elimination, and it can deoptimise if assumptions break. That means early requests are slower than steady state, and naive timing loops measure the interpreter or code the JIT removed. For benchmarks I'd use JMH, which handles warm-up, forking and consuming results so they can't be optimised away."
cards:
  - q: "Tiered compilation"
    a: "Interpreter → C1 (fast compile, profiling) → C2 (optimised) for hot code."
  - q: "JVM memory areas"
    a: "Heap (objects), thread stacks (frames), metaspace (class metadata), code cache (JIT output)."
---

## Explanation

### Pipeline

1. **Compile**: `javac` → bytecode (`.class`), a stack-based instruction set.
2. **Load**: class loaders (bootstrap → platform → application) load classes lazily; **link** (verify, prepare, resolve) and **initialise** (static blocks).
3. **Execute**: the interpreter runs bytecode; the **JIT** (C1 then C2 in tiered compilation) compiles hot methods to native code using runtime profiles — inlining, escape analysis (can avoid heap allocation), loop optimisations. Wrong speculative assumptions cause **deoptimisation**.

### Memory areas (high level)

| Area | Holds |
|---|---|
| Heap | objects and arrays (GC-managed) |
| Thread stacks | frames: locals, operand stack, references |
| Metaspace | class metadata (native memory) |
| Code cache | JIT-compiled code |

### Practical consequences

- **Warm-up**: latency of the first requests is worse; services may pre-warm or use CDS/AOT features.
- **Benchmarks**: use **JMH**; naive loops can measure the wrong thing.
- **Startup vs peak**: GraalVM native image trades peak optimisation for fast startup.

## Worked examples

A naive benchmark:

```java
long t0 = System.nanoTime();
for (int i = 0; i < 1_000_000; i++) compute(i);   // result unused → may be eliminated
System.out.println(System.nanoTime() - t0);
```
Problems: no warm-up, dead-code elimination, single run, GC noise. JMH runs warm-up iterations, forks fresh JVMs, and passes results to a `Blackhole`.

## Common misconceptions

- **"Java is interpreted, so it's slow."** — Hot code is compiled and highly optimised.
- **"All objects live on the heap."** — Escape analysis can scalar-replace non-escaping objects.
- **"Measure once to compare implementations."** — JVM timing needs warm-up and repetition.

## Practical exercises

1. Run a program with `-Xlog:class+load` and observe lazy loading.
2. Write a small JMH benchmark comparing `ArrayList` and `LinkedList` iteration.
