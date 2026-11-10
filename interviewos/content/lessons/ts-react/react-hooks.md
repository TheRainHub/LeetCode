---
slug: react-hooks
title: React hooks
path: ts-react
module: react-core
order: 2
minutes: 55
depth: full
practice: conceptual
summary: useState, useEffect, useRef, useMemo/useCallback, useReducer, useContext and custom hooks — the rules, dependency arrays, cleanup, stale closures, and when you don't need an effect.
prerequisites: [react-rendering]
problems: []
objectives:
  - Use useState/useReducer and useRef appropriately and explain the difference
  - Write effects with correct dependencies and cleanup; avoid unnecessary effects
  - Diagnose stale closures and infinite effect loops
  - Extract custom hooks that encapsulate reusable stateful logic
readings:
  - title: "React docs — Built-in React Hooks"
    url: https://react.dev/reference/react/hooks
    kind: docs
  - title: "React docs — Synchronizing with Effects"
    url: https://react.dev/learn/synchronizing-with-effects
    kind: docs
  - title: "React docs — You Might Not Need an Effect"
    url: https://react.dev/learn/you-might-not-need-an-effect
    kind: docs
  - title: "React docs — Reusing Logic with Custom Hooks"
    url: https://react.dev/learn/reusing-logic-with-custom-hooks
    kind: docs
interview:
  - q: "What are the rules of hooks and why do they exist?"
    a: "Call hooks only at the top level of components or custom hooks — not in loops, conditions or nested functions. React identifies hooks by call order on each render; conditional calls would shift the order and mismatch state."
  - q: "useRef vs useState?"
    a: "Both persist across renders. Updating state triggers a re-render and the value is a per-render snapshot; mutating ref.current doesn't re-render and is read at any time. Use refs for DOM nodes, timers, and mutable values not shown in the UI."
  - q: "When should you not use useEffect?"
    a: "For deriving data from props/state (compute during render, or useMemo if expensive), for handling user events (do it in the event handler), or resetting state on prop change (use a key). Effects are for synchronising with external systems."
selfAssessment:
  - I can write a data-fetching effect with abort and cleanup
  - I can spot and fix a stale closure
  - I can explain when useMemo/useCallback actually help
completion:
  - Score at least 70% on the quiz
  - Explain effects and cleanup in interview mode
quiz:
  - q: "useEffect(() => { setCount(count + 1) }) with no dependency array causes:"
    options: ["One update", "An infinite render loop", "Nothing", "A compile error"]
    answer: 1
    why: "No deps → runs after every render, and each run triggers a new render."
  - q: "An interval callback always logs the initial count. Likely cause:"
    options: ["React bug", "Stale closure: the effect captured count from the first render (empty deps)", "The interval is too fast", "useRef"]
    answer: 1
    why: "Use a functional update, include count in deps, or read from a ref."
  - q: "useCallback is useful mainly when:"
    options: ["Every function", "Passing a callback to a memoized child or using it as an effect dependency", "Making functions faster", "Async functions"]
    answer: 1
    why: "It stabilises identity; it doesn't speed up the function."
  - q: "The cleanup function returned from useEffect runs:"
    options: ["Never", "Before the effect re-runs and when the component unmounts", "Only on unmount", "Before the first render"]
    answer: 1
    why: "Cleanup pairs with each effect run."
explain:
  prompt: "Write (in words) a custom hook useFetch(url) and explain its effect dependencies, cleanup and race conditions."
  rubric:
    - "State for data/error/loading (or a discriminated union)"
    - "Effect depends on url; uses AbortController; cleanup aborts"
    - "Avoids setting state from stale responses (race)"
    - "Mentions alternatives (React Query/SWR, Server Components) for caching"
  model: "useFetch keeps one state value describing loading, success with data, or error. Its effect depends on url: it creates an AbortController, sets loading, starts fetch with the signal, and on resolution sets success or error unless the request was aborted. The cleanup aborts the controller, which runs both when url changes and on unmount. That also fixes the race where a slow response for an old url arrives after a newer one — the old request is aborted, so it never overwrites state. In Strict Mode the effect runs twice in development, and the abort makes that harmless. For real apps I'd prefer a library like TanStack Query or, in Next.js, fetching in Server Components, because they add caching, deduplication and revalidation."
cards:
  - q: "Rules of hooks"
    a: "Top level only, only in components/custom hooks — order must be stable."
  - q: "Stale closure fix"
    a: "Correct deps, functional updates (setX(x => …)), or a ref holding the latest value."
  - q: "Effects are for"
    a: "Synchronising with external systems (network, subscriptions, DOM APIs, timers)."
---

## Explanation

### State

- `useState` for simple values; `useReducer` when updates depend on actions or many related fields change together.
- State is immutable per render: create new objects/arrays rather than mutating.

### Refs

`useRef` gives a mutable box that survives renders without causing them: DOM nodes, timer ids, latest-value refs, previous values.

### Effects

```tsx
useEffect(() => {
  const controller = new AbortController();
  load(id, controller.signal).then(setData).catch(ignoreAbort);
  return () => controller.abort();       // cleanup
}, [id]);                                // dependencies: every reactive value used
```
- Missing deps → stale values; extra object/function deps recreated each render → effect runs every render.
- `useLayoutEffect` for measuring layout before paint.
- Strict Mode runs setup → cleanup → setup in development.

### Memoization

`useMemo` caches a computed value; `useCallback` caches a function identity. They matter for expensive computations, memoized children (`React.memo`) and effect dependencies. The React Compiler can do much of this automatically.

### Context

`useContext` reads the nearest provider value; every consumer re-renders when the value changes — split contexts or memoize values.

### Custom hooks

Functions starting with `use` that call other hooks; share logic, not state (each call has its own state). InterviewOS's `useStopwatch` in the coding workspace is an example.

## Worked examples

### Stale closure and fix

```tsx
// Bug: logs 0 forever
useEffect(() => {
  const id = setInterval(() => console.log(count), 1000);
  return () => clearInterval(id);
}, []);

// Fix A: functional update when changing state
useEffect(() => {
  const id = setInterval(() => setCount((c) => c + 1), 1000);
  return () => clearInterval(id);
}, []);
```

### Derive instead of syncing

```tsx
// Avoid: effect copying derived data into state
const [fullName, setFullName] = useState("");
useEffect(() => setFullName(`${first} ${last}`), [first, last]);
// Prefer: compute during render
const fullName = `${first} ${last}`;
```

## Common misconceptions

- **"Empty deps means 'run once' safely."** — Only if the effect truly uses no reactive values.
- **"useMemo everywhere improves performance."** — It costs memory and comparisons; measure first.
- **"Effects are for responding to events."** — Put event logic in handlers.

## Practical exercises

1. Implement `useDebouncedValue(value, ms)` and `useLocalStorage(key, initial)` with tests.
2. Find an effect in a project that only derives state and remove it.
3. Read InterviewOS's `useStopwatch` hook and explain each dependency.
