---
slug: state-management
title: State management
path: ts-react
module: react-core
order: 3
minutes: 40
depth: concise
practice: conceptual
summary: Categories of state (local, shared UI, server cache, URL, form), where each should live, and when Context, reducers, Zustand/Redux or TanStack Query fit.
prerequisites: [react-hooks]
problems: []
objectives:
  - Classify state and choose where it lives (component, lifted, context, store, server cache, URL)
  - Explain the trade-offs of Context, external stores and server-state libraries
  - Avoid duplicated and derived state
readings:
  - title: "React docs — Managing State"
    url: https://react.dev/learn/managing-state
    kind: docs
  - title: "React docs — Choosing the State Structure"
    url: https://react.dev/learn/choosing-the-state-structure
    kind: docs
  - title: "TanStack Query — Overview"
    url: https://tanstack.com/query/latest/docs/framework/react/overview
    kind: docs
interview:
  - q: "When would you use Redux/Zustand instead of Context?"
    a: "Context is fine for low-frequency global values (theme, user, locale). For frequently changing shared client state with many consumers, a store with selectors avoids re-rendering every consumer and offers devtools/middleware. Server data belongs in a server-state cache (TanStack Query, SWR, or Server Components), not a global store."
  - q: "What's the difference between server state and client state?"
    a: "Server state is owned remotely, shared, can become stale and needs fetching, caching, invalidation and synchronisation. Client state is owned by the UI (open dialogs, form drafts). Mixing them in one store leads to manual cache invalidation bugs."
selfAssessment:
  - I can decide where a given piece of state should live
  - I can explain why server data shouldn't be copied into Redux by default
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Current search filters that should survive a page reload and be shareable belong in:"
    options: ["useState", "The URL (query string)", "A ref", "Context"]
    answer: 1
    why: "The URL is shareable, bookmarkable state."
  - q: "Storing both items and selectedItem (a copy) in state risks:"
    options: ["Nothing", "Duplicated state getting out of sync — store selectedId instead", "Faster renders", "Memory leaks only"]
    answer: 1
    why: "Store minimal state; derive the rest."
  - q: "Every consumer of a Context re-renders when:"
    options: ["Any state changes", "The provided value changes (by reference)", "Never", "The provider unmounts only"]
    answer: 1
    why: "Memoize the value and split contexts by update frequency."
explain:
  prompt: "Explain how you'd structure state in a dashboard app with filters, fetched data, a modal and a multi-step form."
  rubric:
    - "Filters in URL"
    - "Fetched data in a server-state cache / Server Components with invalidation"
    - "Modal open state local"
    - "Form state local (or form library) with validation; persisted draft if needed"
  model: "Filters go in the URL query string so the view is shareable and survives reloads; components read them from the router. Data comes from the server — in Next.js through Server Components, or with TanStack Query on the client — which handles caching, deduplication and refetching after mutations, so I never copy it into a global store. Whether the modal is open is local state in the component that owns it. The multi-step form keeps its fields in a reducer or form library within the form component, validates with a schema, and persists a draft in local storage only if losing it would hurt. I'd reach for a global client store only for genuinely shared, frequently changing UI state."
cards:
  - q: "State categories"
    a: "Local UI, shared UI, server cache, URL, form."
  - q: "Minimal state rule"
    a: "Don't store what you can derive; store ids, not copies."
---

## Explanation

| State | Where |
|---|---|
| Local UI (open, hover, input) | `useState` in the component |
| Shared between siblings | lift to closest common parent |
| App-wide, rarely changing (theme, user, locale) | Context |
| App-wide, frequently changing client state | store with selectors (Zustand, Redux Toolkit, Jotai) |
| Server data | TanStack Query / SWR / Server Components + revalidation |
| Shareable view state | URL search params |
| Forms | local / form library (React Hook Form) + schema validation |

Principles: keep state minimal, avoid duplication and contradictions (use discriminated unions), colocate state with where it's used, and lift only when needed.

## Worked examples

InterviewOS uses Server Components for data, server actions + `revalidatePath` for mutations, local state for UI, `localStorage` for code drafts (with server persistence), and the URL for filters such as `?difficulty=easy` on the practice page.

## Common misconceptions

- **"Every app needs Redux."** — Most need server-state caching more than a global store.
- **"Context is a state manager."** — It's dependency injection; the state still lives in a component.

## Practical exercises

1. Audit a page in one of your projects and classify every state variable using the table.
2. Move a filter from component state into the URL.
