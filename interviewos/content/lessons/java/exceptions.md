---
slug: exceptions
title: Exceptions and error handling
path: java
module: java-language
order: 3
minutes: 35
depth: concise
practice: conceptual
summary: Checked vs unchecked exceptions, try-with-resources, and designing error handling that helps rather than hides problems.
prerequisites: [oop]
problems: []
objectives:
  - Distinguish checked, unchecked and Error, and choose appropriately for an API
  - Use try-with-resources and understand suppressed exceptions
  - Apply good practices — fail fast, preserve causes, don't swallow exceptions
readings:
  - title: "The Java Tutorials — Exceptions"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/index.html
    kind: docs
  - title: "The Java Tutorials — The try-with-resources Statement"
    url: https://docs.oracle.com/javase/tutorial/essential/exceptions/tryResourceClose.html
    kind: docs
interview:
  - q: "Checked vs unchecked exceptions — when do you use each?"
    a: "Checked (extends Exception) for recoverable conditions the caller should handle (I/O failures); unchecked (RuntimeException) for programming errors or conditions callers can't reasonably recover from (IllegalArgumentException, NPE). Many modern codebases prefer unchecked plus explicit result types."
  - q: "What does try-with-resources guarantee?"
    a: "Resources implementing AutoCloseable are closed in reverse order even if the body throws; if close also throws, that exception is added as suppressed to the primary one instead of masking it."
selfAssessment:
  - I never write empty catch blocks
  - I wrap exceptions while preserving the cause
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "OutOfMemoryError is:"
    options: ["A checked exception", "A RuntimeException", "An Error — usually not something to catch and continue from", "Impossible in Java"]
    answer: 2
    why: "Errors signal serious JVM problems."
  - q: "catch (Exception e) {} around business logic is bad because:"
    options: ["It's slow", "It silently hides failures, leaving the system in an unknown state", "It doesn't compile", "It catches Errors"]
    answer: 1
    why: "At minimum log with context and rethrow or handle meaningfully."
  - q: "To keep the original stack trace when converting exceptions:"
    options: ["throw new MyException(e.getMessage())", "throw new MyException(\"context\", e)", "e.printStackTrace(); return null;", "System.exit(1)"]
    answer: 1
    why: "Passing the cause preserves the chain."
explain:
  prompt: "How do you approach error handling in a Java service? Cover checked vs unchecked, resources and logging."
  rubric:
    - "Distinguishes checked/unchecked/Error with a sensible policy"
    - "Uses try-with-resources for closeable resources"
    - "Wraps with context while preserving the cause; avoids swallowing"
    - "Handles at the right layer (e.g. translate to HTTP status at the boundary) and logs once"
  model: "I validate inputs early and throw unchecked exceptions like IllegalArgumentException for programming errors. For recoverable conditions, such as a downstream timeout, I either use a checked exception or a domain exception the caller is expected to handle, always wrapping with context and passing the original as the cause. Resources go into try-with-resources so they're closed even on failure, and secondary close errors are kept as suppressed exceptions. I don't swallow exceptions; I handle them at the layer that can act — for example a controller advice that maps domain errors to HTTP status codes — and log once there with context rather than at every level."
cards:
  - q: "Exception hierarchy"
    a: "Throwable → Error (don't catch) and Exception → RuntimeException (unchecked) / others (checked)."
  - q: "Suppressed exceptions"
    a: "try-with-resources attaches close() failures to the primary exception via getSuppressed()."
---

## Explanation

```text
Throwable
├── Error                 (OutOfMemoryError, StackOverflowError) — don't catch normally
└── Exception             (checked: IOException, SQLException …)
    └── RuntimeException  (unchecked: NullPointerException, IllegalArgumentException …)
```

- **Checked** exceptions must be declared or caught; they document recoverable failures but can clutter APIs and don't compose well with lambdas.
- **Unchecked** exceptions signal bugs or unrecoverable conditions.

### Good practice

1. **Fail fast** — validate arguments (`Objects.requireNonNull`, explicit checks).
2. **Never swallow** — an empty `catch` hides bugs.
3. **Preserve the cause** — `throw new OrderException("charge failed for " + id, e)`.
4. **Handle at the right layer** — translate low-level exceptions into domain ones at module boundaries; map to HTTP responses at the edge.
5. **Log once** with context; logging and rethrowing at every layer creates duplicate noise.
6. **Use try-with-resources** for anything `AutoCloseable`.
7. **Don't use exceptions for normal control flow** — they're expensive (stack trace capture) and obscure logic.

## Worked examples

```java
String firstLine(Path path) throws IOException {
    try (BufferedReader r = Files.newBufferedReader(path)) {   // closed even on exception
        return r.readLine();
    }
}

Order charge(Order order) {
    try {
        return gateway.charge(order);
    } catch (GatewayTimeoutException e) {
        throw new PaymentUnavailableException("payment provider timed out for order " + order.id(), e);
    }
}
```

## Common misconceptions

- **"finally always runs."** — Not if the JVM exits or the thread is killed; and a `return` in finally overrides exceptions (avoid it).
- **"Catching Exception is defensive."** — It hides bugs and catches unexpected runtime errors.
- **"Checked exceptions are always better."** — They're a design choice with trade-offs.

## Practical exercises

1. Refactor code with nested `try/finally` closing streams into try-with-resources.
2. Write a test that inspects `getSuppressed()` when both the body and `close()` throw.
3. Design the error types for a payment API and map them to HTTP status codes.
