---
slug: promises-async
title: Promises and async/await
path: ts-react
module: ts-language
order: 5
minutes: 45
depth: full
practice: conceptual
summary: Promise states and chaining, async/await error handling, concurrency with Promise.all/allSettled/race/any, cancellation with AbortController, and limiting concurrency.
prerequisites: [event-loop]
problems: []
objectives:
  - Explain promise states and chaining, and convert callback APIs to promises
  - Handle errors correctly with async/await, including unhandled rejections
  - Choose between sequential and concurrent execution and the right Promise combinator
  - Cancel work with AbortController and limit concurrency
readings:
  - title: "MDN — Using promises"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Using_promises
    kind: docs
  - title: "MDN — async function"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Statements/async_function
    kind: docs
  - title: "MDN — AbortController"
    url: https://developer.mozilla.org/en-US/docs/Web/API/AbortController
    kind: docs
interview:
  - q: "Promise.all vs Promise.allSettled vs Promise.race vs Promise.any?"
    a: "all: resolves with all values, rejects on the first rejection. allSettled: waits for all, gives each outcome. race: settles with the first to settle (value or error). any: resolves with the first fulfilment, rejects with AggregateError if all reject."
  - q: "What's wrong with `items.forEach(async (i) => await save(i))`?"
    a: "forEach ignores returned promises, so the caller doesn't wait, errors become unhandled rejections and there's no concurrency control. Use for…of with await (sequential) or Promise.all(items.map(save)) (concurrent), ideally with a concurrency limit."
  - q: "How would you implement a timeout for fetch?"
    a: "Use AbortSignal.timeout(ms) or an AbortController aborted by setTimeout, passed as fetch's signal — this actually cancels the request rather than just ignoring the result."
selfAssessment:
  - I can write a concurrency-limited map
  - I can explain each Promise combinator
  - I handle errors in async code without unhandled rejections
completion:
  - Score at least 70% on the quiz
  - Explain sequential vs concurrent awaits in interview mode
quiz:
  - q: "const a = await f(); const b = await g(); when f and g are independent:"
    options: ["Runs concurrently", "Runs sequentially — total time ≈ f + g", "Fails", "Is the fastest option"]
    answer: 1
    why: "Start both, then await: const [a, b] = await Promise.all([f(), g()])."
  - q: "A rejected promise with no handler in Node (recent versions) by default:"
    options: ["Is ignored", "Crashes the process (unhandled rejection)", "Retries", "Logs only in the browser"]
    answer: 1
    why: "Node's default is --unhandled-rejections=throw."
  - q: "An async function always returns:"
    options: ["The value directly", "A Promise", "undefined", "A generator"]
    answer: 1
    why: "Returned values are wrapped; thrown errors become rejections."
  - q: "Promise.race([fetch(url), timeout(1000)]) without AbortController:"
    options: ["Cancels the fetch", "Stops waiting but the request keeps running in the background", "Throws immediately", "Retries"]
    answer: 1
    why: "Promises aren't cancellable; use signals to cancel the underlying work."
explain:
  prompt: "You need to fetch details for 500 ids from an API that allows 10 concurrent requests. Explain your approach with async/await."
  rubric:
    - "Not sequential (slow) and not Promise.all of 500 (overloads API)"
    - "Concurrency limit via worker pool/semaphore (e.g. 10 workers pulling from a queue)"
    - "Error handling: retries for transient errors, allSettled-like collection"
    - "Cancellation/timeout via AbortController"
  model: "Awaiting one at a time would take 500 round trips, and Promise.all on 500 promises would fire them all at once and get rate limited. I'd run a small pool: create 10 async workers that each take the next id from a shared index and await the request until the list is exhausted, then Promise.all the workers. Each request gets a timeout through an AbortSignal and retries transient failures with backoff; results are collected per id as success or error, like allSettled, so one failure doesn't throw away 499 results. If the user navigates away, aborting a shared controller cancels in-flight requests."
cards:
  - q: "Run independent awaits concurrently"
    a: "const [a, b] = await Promise.all([f(), g()])."
  - q: "Promise.any vs race"
    a: "any: first fulfilment (ignores rejections until all fail). race: first settlement of any kind."
  - q: "Cancel a fetch"
    a: "Pass an AbortSignal (AbortController or AbortSignal.timeout)."
---

## Explanation

### Promises

States: pending → fulfilled or rejected (settled once). `then` returns a new promise → chaining; returning a promise from `then` flattens it; throwing inside rejects. `catch` = `then(undefined, onRejected)`; `finally` for cleanup.

### async/await

`async` functions return promises; `await` pauses the function (not the thread) until the promise settles. Use `try/catch/finally`. Top-level `await` in ES modules.

### Concurrency patterns

| Need | Tool |
|---|---|
| All must succeed | `Promise.all` |
| Want every outcome | `Promise.allSettled` |
| First result wins (any outcome) | `Promise.race` |
| First success wins | `Promise.any` |
| Bounded concurrency | worker pool / p-limit |

### Cancellation

`AbortController` → `signal` passed to `fetch`, streams, many Node APIs; listen to `signal.aborted`/`abort` event in your own code. React effects should abort fetches on cleanup.

### Errors

Always handle rejections; don't mix callbacks and promises; wrap callback APIs with `util.promisify` or `new Promise`.

## Worked examples

### Concurrency-limited map

```ts
async function mapLimit<T, R>(items: T[], limit: number, fn: (x: T) => Promise<R>): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function worker() {
    while (next < items.length) {
      const i = next++;                 // safe: single-threaded, no await between read and increment
      results[i] = await fn(items[i]!);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
}
```

### Timeout with real cancellation

```ts
const res = await fetch(url, { signal: AbortSignal.timeout(3000) });
```

## Common misconceptions

- **"await makes code synchronous."** — It yields to the event loop.
- **"Promise.all runs things in parallel threads."** — It waits on already-started operations concurrently.
- **"Wrapping in try/catch catches errors from un-awaited promises."** — Only awaited ones.

## Practical exercises

1. Implement `mapLimit` and test it with fake delays, asserting max concurrency.
2. Implement `retry(fn, { attempts, signal })` that stops on abort.
3. Refactor a sequential chain of independent awaits in one of your projects.
