---
slug: react-rendering
title: How React renders
path: ts-react
module: react-core
order: 1
minutes: 50
depth: full
practice: conceptual
summary: Render vs commit, what triggers re-renders, reconciliation and keys, batching, Strict Mode double-invocation, and Server vs Client Components.
prerequisites: [closures-prototypes]
problems: []
objectives:
  - Explain the render and commit phases and what causes a component to re-render
  - Explain reconciliation and why stable keys matter in lists
  - Describe batching, Strict Mode behaviour and why rendering must be pure
  - Explain React Server Components vs Client Components at a practical level
readings:
  - title: "React docs — Render and Commit"
    url: https://react.dev/learn/render-and-commit
    kind: docs
  - title: "React docs — Preserving and Resetting State"
    url: https://react.dev/learn/preserving-and-resetting-state
    kind: docs
  - title: "React docs — Keeping Components Pure"
    url: https://react.dev/learn/keeping-components-pure
    kind: docs
  - title: "React docs — Server Components"
    url: https://react.dev/reference/rsc/server-components
    kind: docs
interview:
  - q: "What causes a React component to re-render?"
    a: "Its state changes (setState/useReducer dispatch with a new value), its parent re-renders (props don't need to change unless the child is memoized), or a context it consumes changes value. Re-rendering is calling the component function; the DOM only changes where the output differs."
  - q: "Why are keys important in lists, and why is the array index often a bad key?"
    a: "Keys identify items across renders so React preserves the right state and DOM nodes. With index keys, inserting or reordering items shifts keys, so state (input values, focus) attaches to the wrong item and work is wasted. Use stable ids."
  - q: "Why does my effect run twice in development?"
    a: "React Strict Mode mounts, unmounts and remounts components in development to surface missing cleanup. Effects must be resilient: clean up subscriptions, abort fetches. Production runs once."
selfAssessment:
  - I can explain render vs commit
  - I can predict when a child re-renders
  - I can explain keys and state preservation by position
completion:
  - Score at least 70% on the quiz
  - Explain re-render triggers in interview mode
quiz:
  - q: "Calling setCount(count + 1) three times in one click handler (count was 0) gives:"
    options: ["3", "1 — all three read the same count from the render's closure", "0", "An error"]
    answer: 1
    why: "Use setCount(c => c + 1) to queue updates based on the latest value."
  - q: "A component's state is preserved across renders when:"
    options: ["It has the same name", "The same component type renders at the same position in the tree (and with the same key)", "Props are equal", "It's memoized"]
    answer: 1
    why: "Changing the key resets the state."
  - q: "The commit phase is when React:"
    options: ["Calls component functions", "Applies the minimal DOM changes and runs layout effects", "Fetches data", "Compiles JSX"]
    answer: 1
    why: "Rendering computes output; committing updates the DOM."
  - q: "In the Next.js App Router, components are by default:"
    options: ["Client Components", "Server Components — they can't use state or effects without 'use client'", "Static HTML only", "Web Components"]
    answer: 1
    why: "Interactivity requires a 'use client' boundary."
explain:
  prompt: "Explain what happens from a setState call to the DOM update, and how keys influence that process."
  rubric:
    - "setState schedules an update; React batches updates"
    - "Render phase: component functions called, new element tree produced (must be pure)"
    - "Reconciliation compares with the previous tree by type/position/key"
    - "Commit applies minimal DOM changes; effects run after"
    - "Keys preserve identity/state of list items"
  model: "Calling setState doesn't change the variable immediately; it queues an update and schedules a render, and updates from the same event are batched. In the render phase React calls the component — and its children — to produce a new element tree; this must be pure because React may call it more than once. Reconciliation compares the new tree with the previous one: same component type at the same position keeps its state and DOM node, different types are replaced, and in lists keys tell React which item is which so it can move nodes and keep their state instead of re-creating them. In the commit phase React applies the minimal DOM mutations, then runs layout effects synchronously and regular effects after paint."
cards:
  - q: "Re-render triggers"
    a: "Own state change, parent re-render, consumed context change."
  - q: "Index as key problem"
    a: "Reorders/inserts shift keys → state and DOM attach to the wrong items."
  - q: "Render vs commit"
    a: "Render = call components, compute tree (pure). Commit = mutate DOM, run effects."
---

## Explanation

### Phases

1. **Trigger**: initial mount or a state update.
2. **Render**: React calls your components to get JSX (an element tree). Must be **pure** — same inputs → same output, no side effects.
3. **Commit**: React applies DOM changes, runs `useLayoutEffect`, browser paints, then `useEffect` runs.

### Re-renders

A component re-renders when its state changes, its parent renders, or a consumed context changes. Re-rendering is usually cheap; the DOM is only touched where output differs. `React.memo` skips a child when props are shallowly equal.

### Reconciliation and keys

State is tied to a **position in the tree** and component **type**. Different type at the same position → unmount old subtree. Keys give list items identity; changing a key deliberately resets state (`<Editor key={docId} />`).

### Batching and updater functions

Updates in the same event (and since React 18, in promises/timeouts too) are batched into one render. A state variable is a snapshot for that render; use updater functions for sequential updates.

### Strict Mode

In development it double-invokes render functions and re-runs effects (mount → unmount → mount) to reveal impure renders and missing cleanups.

### Server and Client Components

Server Components render on the server, can access databases/secrets directly, send no JS for themselves, and can't use state/effects. Client Components (`"use client"`) hydrate in the browser for interactivity. Pass serialisable props across the boundary. InterviewOS pages are Server Components that load data; interactive widgets (quiz, workspace, interview chat) are Client Components.

## Worked examples

```tsx
function Counter() {
  const [count, setCount] = useState(0);
  function addThree() {
    setCount((c) => c + 1);
    setCount((c) => c + 1);
    setCount((c) => c + 1);   // 3 — updater functions chain
  }
  return <button onClick={addThree}>{count}</button>;
}
```

```tsx
// Resetting state when the selected item changes
<ProfileForm key={user.id} user={user} />
```

## Common misconceptions

- **"Re-render means DOM update."** — Re-render computes; commit updates only differences.
- **"Props change causes re-render."** — Parent render causes it; memo makes props matter.
- **"State updates are synchronous."** — They're scheduled; the current render's value doesn't change.
- **"Effects running twice is a React bug."** — It's Strict Mode in development.

## Practical exercises

1. Add `console.count` to a component tree and observe which components render on a state change.
2. Build a list with inputs keyed by index, reorder it, and observe the bug; fix with ids.
3. In InterviewOS, identify which components are Server vs Client and why.
