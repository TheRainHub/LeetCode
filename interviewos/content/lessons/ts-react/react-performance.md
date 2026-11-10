---
slug: react-performance
title: React and web performance
path: ts-react
module: react-quality
order: 1
minutes: 45
depth: full
practice: conceptual
summary: Measuring first (Profiler, Core Web Vitals), avoiding unnecessary renders, memoization, virtualisation, code splitting, and server rendering trade-offs.
prerequisites: [react-hooks]
problems: []
objectives:
  - Measure performance with the React Profiler, browser DevTools and Core Web Vitals (LCP, INP, CLS)
  - Reduce render work with state colocation, memoization and stable props
  - Handle large lists and heavy bundles with virtualisation and code splitting
  - Explain SSR/streaming/Server Components effects on load performance
readings:
  - title: "web.dev — Web Vitals"
    url: https://web.dev/articles/vitals
    kind: docs
  - title: "React docs — memo"
    url: https://react.dev/reference/react/memo
    kind: docs
  - title: "React docs — Profiler"
    url: https://react.dev/reference/react/Profiler
    kind: docs
  - title: "React docs — lazy"
    url: https://react.dev/reference/react/lazy
    kind: docs
interview:
  - q: "A list of 5,000 rows is slow to render and scroll. What do you do?"
    a: "Measure with the Profiler, then virtualise (render only visible rows with TanStack Virtual/react-window), memoize row components with stable props and keys, avoid expensive work per render, and paginate or filter server-side if users don't need all rows."
  - q: "What is INP?"
    a: "Interaction to Next Paint — a Core Web Vital measuring responsiveness: the latency from user interactions to the next frame being painted, reported near the worst interaction. Long tasks on the main thread hurt it."
  - q: "When does React.memo not help?"
    a: "When props change every render anyway (new object/function literals), when the component is cheap, or when it re-renders because of its own state or context. Fix prop stability first or move state down."
selfAssessment:
  - I can use the React Profiler to find a slow component
  - I can name the three Core Web Vitals and how to improve each
completion:
  - Score at least 70% on the quiz
  - Explain how you'd fix a slow list in interview mode
quiz:
  - q: "Typing in an input re-renders a large sibling chart each keystroke. Best first fix:"
    options: ["useMemo everything", "Move the input state down into a smaller component (colocation) so the chart isn't in the re-rendering subtree", "Use Redux", "Debounce the chart"]
    answer: 1
    why: "Colocating state shrinks what re-renders, without memoization."
  - q: "CLS (Cumulative Layout Shift) is reduced by:"
    options: ["Faster JS", "Reserving space for images/ads/fonts (width/height, aspect-ratio)", "Using SSR only", "Smaller CSS"]
    answer: 1
    why: "Unexpected layout movement after load causes CLS."
  - q: "Code splitting with lazy()/dynamic import helps:"
    options: ["Runtime speed of loops", "Initial load by deferring code not needed immediately (e.g. the Monaco editor)", "SEO only", "Memory leaks"]
    answer: 1
    why: "Heavy components load when needed."
explain:
  prompt: "A page in your React app feels slow when users type into a search box. Explain how you'd investigate and fix it."
  rubric:
    - "Measure: React Profiler / Performance panel; identify what renders and long tasks"
    - "Colocate state, memoize expensive children with stable props"
    - "Defer/expensive filtering: useDeferredValue/useTransition, debounce, move work to server or worker"
    - "Virtualise large result lists; verify improvement"
  model: "I'd record an interaction in the React Profiler and the browser Performance panel to see which components re-render per keystroke and whether there are long tasks. Commonly the search state lives high up, so the whole page re-renders; I'd move it into the search component or memoize the expensive siblings with stable props. If filtering itself is expensive, I'd mark the results update as non-urgent with useDeferredValue or startTransition so typing stays responsive, debounce server requests, or move filtering to the server or a worker. If the result list is long, I'd virtualise it. Then I'd profile again to confirm the keystroke-to-paint latency improved."
cards:
  - q: "Core Web Vitals"
    a: "LCP (loading), INP (responsiveness), CLS (visual stability)."
  - q: "Keep input responsive during heavy updates"
    a: "useDeferredValue / startTransition, colocated state, virtualisation."
  - q: "memo requires"
    a: "Stable props (useCallback/useMemo for functions/objects) to be effective."
---

## Explanation

### Measure first

- React DevTools **Profiler**: what rendered, why, how long.
- Browser Performance panel: long tasks (>50 ms), layout thrashing.
- **Core Web Vitals** in the field: LCP (largest content paint), INP (responsiveness), CLS (layout shift).

### Reduce render work

- **Colocate state** so updates affect small subtrees.
- `React.memo` + stable props (`useCallback`, `useMemo`) for expensive children; the React Compiler automates much of this.
- Avoid creating new context values each render.
- **useTransition / useDeferredValue** to keep urgent updates (typing) responsive.

### Large data and heavy code

- **Virtualise** long lists.
- **Code split** heavy components (`next/dynamic`, `React.lazy`) — InterviewOS loads Monaco only in the workspace.
- Optimise images (sizes, formats), fonts (`font-display`), and third-party scripts.

### Rendering strategies

SSR/SSG improve first paint and SEO; streaming with Suspense sends HTML progressively; Server Components ship less JavaScript. Hydration cost grows with client JS.

## Worked examples

```tsx
function Search({ items }: { items: Item[] }) {
  const [query, setQuery] = useState("");
  const deferred = useDeferredValue(query);
  const results = useMemo(() => filter(items, deferred), [items, deferred]);
  return (
    <>
      <input value={query} onChange={(e) => setQuery(e.target.value)} />
      <ResultsList results={results} />   {/* memoized + virtualised */}
    </>
  );
}
```

## Common misconceptions

- **"Re-renders are always bad."** — Fast re-renders are fine; optimise measured slowness.
- **"useMemo makes everything faster."** — It adds overhead when the computation is cheap.
- **"SSR always makes apps faster."** — It improves first paint but adds server work and hydration cost.

## Practical exercises

1. Profile the InterviewOS practice list or another app and record the slowest interaction.
2. Build a 10,000-row list, measure, then virtualise it and compare.
