---
slug: completablefuture
title: CompletableFuture and asynchronous composition
path: java
module: java-concurrency
order: 4
minutes: 40
depth: concise
practice: conceptual
summary: Compose async steps without blocking — thenApply vs thenCompose, combining results, error handling and executor choice.
prerequisites: [executors]
problems: []
objectives:
  - Chain async computations with thenApply, thenCompose and thenCombine
  - Handle failures with exceptionally, handle and whenComplete
  - Choose executors deliberately and add timeouts
readings:
  - title: "Java SE 21 API — CompletableFuture"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/CompletableFuture.html
    kind: docs
interview:
  - q: "thenApply vs thenCompose?"
    a: "thenApply maps the result with a synchronous function (like map). thenCompose chains a function that itself returns a CompletableFuture and flattens it (like flatMap), avoiding CompletableFuture<CompletableFuture<T>>."
  - q: "Which executor do supplyAsync tasks use by default and why can that be a problem?"
    a: "ForkJoinPool.commonPool(), sized for CPU-bound work and shared JVM-wide; blocking I/O there can starve other users. Pass a dedicated executor for blocking calls."
selfAssessment:
  - I can combine two independent async calls and handle a failure in one
  - I know which executor my async stages run on and why it matters for blocking calls
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "To run two independent async calls in parallel and combine their results:"
    options: ["thenCompose", "thenCombine", "thenAccept", "join both sequentially first"]
    answer: 1
    why: "thenCombine waits for both and applies a BiFunction."
  - q: "allOf(f1, f2, f3) returns:"
    options: ["The list of results", "CompletableFuture<Void> completing when all complete", "The first result", "A blocking call"]
    answer: 1
    why: "Collect results with join() on each afterwards."
  - q: "orTimeout(2, SECONDS) does:"
    options: ["Cancels the JVM", "Completes the future exceptionally with TimeoutException if not done in time", "Retries", "Blocks the caller"]
    answer: 1
    why: "completeOnTimeout supplies a default value instead."
explain:
  prompt: "Explain how you would fetch a user and their orders asynchronously, then build a response, with error handling and timeouts using CompletableFuture."
  rubric:
    - "Uses supplyAsync with a dedicated executor for blocking calls"
    - "Uses thenCompose when a step depends on the previous result, thenCombine for independent calls"
    - "Handles failures with exceptionally/handle and timeouts with orTimeout"
    - "Avoids blocking join/get in the middle of the pipeline"
  model: "I'd start with supplyAsync(() -> userClient.get(id), ioExecutor), using a dedicated executor because these calls block. Fetching orders needs the user's account id, so I'd chain it with thenCompose, which flattens the nested future. If I also needed independent data, like recommendations, I'd start it in parallel and merge with thenCombine. Each remote call gets orTimeout, and I'd use exceptionally or handle to map failures to a fallback or a domain error, logging the cause. The pipeline stays non-blocking until the very edge, where the framework consumes the future or I call join once."
cards:
  - q: "thenApply vs thenCompose"
    a: "map vs flatMap: thenCompose for functions returning a future."
  - q: "Default async executor"
    a: "ForkJoinPool.commonPool() — pass your own for blocking I/O."
---

## Explanation

`CompletableFuture<T>` represents a value available later and supports **composition**:

| Method | Use |
|---|---|
| `supplyAsync(supplier, executor)` | start async work |
| `thenApply(fn)` | transform result (sync function) |
| `thenCompose(fn)` | chain dependent async step (fn returns a future) |
| `thenCombine(other, bifn)` | merge two independent futures |
| `allOf(...)`, `anyOf(...)` | wait for all / first |
| `exceptionally(fn)` | recover from failure |
| `handle(bifn)` | see result or exception |
| `whenComplete(...)` | side effects (logging), passes outcome through |
| `orTimeout`, `completeOnTimeout` | deadlines |

Exceptions propagate down the chain wrapped in `CompletionException`; `join()` throws unchecked `CompletionException`, `get()` throws checked `ExecutionException`.

**Executors**: methods without an executor argument use `ForkJoinPool.commonPool()`. For blocking I/O, pass a dedicated executor (or use virtual threads with plain blocking code instead of async chains — often simpler in Java 21).

## Worked examples

```java
CompletableFuture<UserView> view(long id) {
    CompletableFuture<User> user = supplyAsync(() -> users.get(id), io).orTimeout(1, SECONDS);
    CompletableFuture<List<Order>> orders = user.thenCompose(u -> supplyAsync(() -> orderClient.forAccount(u.accountId()), io));
    CompletableFuture<List<Recommendation>> recs = supplyAsync(() -> recommender.forUser(id), io)
        .completeOnTimeout(List.of(), 300, MILLISECONDS);          // optional data: degrade gracefully
    return user.thenCombine(orders, (u, os) -> new UserView(u, os, List.of()))
               .thenCombine(recs, (v, r) -> v.withRecommendations(r))
               .exceptionally(e -> { log.warn("view failed for {}", id, e); throw new CompletionException(e); });
}
```

## Common misconceptions

- **"thenApply runs asynchronously."** — It runs in whatever thread completes the previous stage (use `thenApplyAsync` for a different executor).
- **"Exceptions are thrown immediately."** — They're stored and surface at `join`/`get` or recovery stages.
- **"Calling join() everywhere is fine."** — It blocks and defeats composition.

## Practical exercises

1. Fetch three simulated services in parallel with `allOf` and combine results; make one fail and recover.
2. Add `orTimeout` and observe the `TimeoutException` path.
3. Rewrite the same flow with virtual threads and blocking calls; compare readability.
