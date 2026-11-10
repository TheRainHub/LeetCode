---
slug: event-loop
title: The event loop
path: ts-react
module: ts-language
order: 4
minutes: 45
depth: full
practice: conceptual
summary: Call stack, task (macrotask) and microtask queues, rendering in browsers, Node.js phases, and why blocking the loop freezes everything.
prerequisites: [closures-prototypes]
problems: []
objectives:
  - Predict the output order of code mixing synchronous code, promises and timers
  - Explain microtasks vs tasks and where rendering fits in the browser
  - Explain Node.js event loop phases, process.nextTick and the libuv thread pool
  - Keep the loop responsive by chunking work or moving it off the main thread
readings:
  - title: "MDN — JavaScript execution model"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Event_loop
    kind: docs
  - title: "Node.js — The Node.js event loop"
    url: https://nodejs.org/en/learn/asynchronous-work/event-loop-timers-and-nexttick
    kind: docs
  - title: "Jake Archibald — In The Loop (JSConf talk)"
    url: https://www.youtube.com/watch?v=cCOL7MC4Pl0
    kind: video
interview:
  - q: "What's the output of: console.log(1); setTimeout(() => console.log(2)); Promise.resolve().then(() => console.log(3)); console.log(4)?"
    a: "1, 4, 3, 2. Synchronous code runs first; then the microtask queue (promise callbacks) is drained; then the next task (the timer callback)."
  - q: "Is Node.js single-threaded?"
    a: "JavaScript runs on a single main thread per event loop, but libuv uses a thread pool for some operations (file system, DNS lookup, crypto, zlib) and the OS kernel handles network I/O asynchronously. Worker threads allow parallel JS."
  - q: "Why would a CPU-heavy function hurt a Node API's latency?"
    a: "While it runs, the event loop can't process any other callbacks, so every concurrent request waits. Offload to worker threads/a separate service, chunk the work, or use a faster algorithm."
selfAssessment:
  - I can predict ordering puzzles with timers, promises and await
  - I can explain Node's phases at a high level
  - I know how to keep the main thread responsive
completion:
  - Score at least 70% on the quiz
  - Explain the event loop in interview mode
quiz:
  - q: "After each task, the browser:"
    options: ["Renders immediately", "Drains the entire microtask queue before the next task or render", "Runs one microtask", "Waits 4 ms"]
    answer: 1
    why: "Endless microtasks can starve rendering."
  - q: "Code after await in an async function runs:"
    options: ["Synchronously", "As a microtask once the awaited promise settles", "As a macrotask", "On another thread"]
    answer: 1
    why: "await is promise continuation."
  - q: "In Node, process.nextTick callbacks run:"
    options: ["After timers", "Before promise microtasks, as soon as the current operation completes", "In the poll phase only", "On the thread pool"]
    answer: 1
    why: "nextTick queue is processed before the promise microtask queue."
  - q: "A 200 ms synchronous loop in a click handler causes:"
    options: ["Nothing", "The page to freeze — no rendering or input handling for 200 ms", "A crash", "Background execution"]
    answer: 1
    why: "Use web workers or chunking (scheduler.yield / setTimeout)."
explain:
  prompt: "Explain the JavaScript event loop and predict the output order of a snippet mixing setTimeout, Promise.then and await."
  rubric:
    - "Call stack runs synchronous code to completion"
    - "Microtasks (promises, await continuations) drained after each task"
    - "Tasks (timers, I/O, events) one at a time; rendering between tasks in browsers"
    - "Correctly orders a concrete example and explains why"
  model: "JavaScript runs one piece of code at a time on the call stack until it completes. Asynchronous APIs schedule callbacks: timers, I/O and events become tasks in a task queue, while promise reactions and code after await become microtasks. The loop takes one task, runs it to completion, then drains all microtasks, and in a browser may render before the next task. So for console.log('A'); setTimeout(() => log('B')); Promise.resolve().then(() => log('C')); (async () => { await null; log('D'); })(); log('E') the output is A, E, C, D, B: A and E are synchronous; C and D are microtasks queued in that order; B is a task that waits for the microtask queue to empty. The practical consequence is that long synchronous work blocks everything, including rendering and other requests in Node."
cards:
  - q: "Microtasks vs tasks"
    a: "Microtasks (promises, await, queueMicrotask) drain fully after each task; tasks (timers, I/O, events) run one per loop turn."
  - q: "Node's thread pool handles"
    a: "fs, dns.lookup, crypto, zlib (default 4 threads)."
  - q: "Keeping the main thread responsive"
    a: "Chunk work, yield to the loop, Web Workers/worker_threads, move heavy work server-side."
---

## Explanation

### The model

1. Run the current script/task to completion (call stack).
2. Drain the **microtask queue** (promise callbacks, `await` continuations, `queueMicrotask`, MutationObserver).
3. Browser: maybe **render** (rAF callbacks, style, layout, paint) — typically ~60 times/s.
4. Take the next **task** (timers, network/IO callbacks, user events, `postMessage`).

Timers are minimum delays, not guarantees.

### Node.js phases

timers → pending callbacks → poll (I/O) → check (`setImmediate`) → close callbacks. Between each callback, `process.nextTick` queue then promise microtasks run. libuv's thread pool (default 4) handles fs/dns.lookup/crypto/zlib; network sockets use OS async I/O.

### Keeping it responsive

- Avoid long synchronous work: chunk with `setTimeout`/`scheduler.yield()`, or move to **Web Workers** / **worker_threads** — InterviewOS runs TypeScript solutions in a Web Worker so an infinite loop can be terminated without freezing the page.
- In Node, avoid sync APIs (`readFileSync`) on request paths; monitor event-loop lag.

## Worked examples

```js
console.log("A");
setTimeout(() => console.log("B"), 0);
Promise.resolve().then(() => console.log("C"));
(async () => { await null; console.log("D"); })();
queueMicrotask(() => console.log("E"));
console.log("F");
// A F C D E B
```
Microtasks run in the order they were queued: C (then), D (await continuation), E (queueMicrotask).

## Common misconceptions

- **"setTimeout(fn, 0) runs immediately after the current line."** — It runs after all microtasks and at least one loop turn.
- **"async functions run in parallel."** — They interleave on one thread; only I/O waits overlap.
- **"Promises make CPU work non-blocking."** — The executor and callbacks still run on the main thread.

## Practical exercises

1. Write five ordering puzzles and verify them in Node and the browser console.
2. Freeze a page with a 2-second loop, then fix it with a Web Worker.
3. Measure event-loop lag in a Node server (`perf_hooks.monitorEventLoopDelay`) under a CPU-heavy endpoint.
