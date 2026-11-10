---
slug: component-architecture
title: Component architecture
path: ts-react
module: react-core
order: 4
minutes: 40
depth: concise
practice: conceptual
summary: Composition over configuration, presentational vs container responsibilities, controlled vs uncontrolled components, prop design, folder structure and design systems.
prerequisites: [react-hooks]
problems: []
objectives:
  - Design components with clear responsibilities and composable APIs (children, slots, compound components)
  - Choose controlled vs uncontrolled components
  - Organise a frontend codebase by feature and build on a design system
readings:
  - title: "React docs — Thinking in React"
    url: https://react.dev/learn/thinking-in-react
    kind: docs
  - title: "React docs — Passing Props to a Component (children)"
    url: https://react.dev/learn/passing-props-to-a-component
    kind: docs
  - title: "Radix UI — Primitives introduction"
    url: https://www.radix-ui.com/primitives/docs/overview/introduction
    kind: docs
interview:
  - q: "How do you avoid a component with 25 boolean props?"
    a: "Prefer composition: accept children or slot props, split into smaller components, use compound components (Tabs, Tabs.List, Tabs.Trigger) sharing state via context, and use variants (a `variant` enum) instead of independent booleans that create impossible combinations."
  - q: "Controlled vs uncontrolled input?"
    a: "Controlled: value comes from React state and changes via onChange — single source of truth, easy validation. Uncontrolled: the DOM holds the value, read via ref or form submission — less code and re-rendering, good for simple forms (FormData, server actions)."
selfAssessment:
  - I can refactor a prop-heavy component using composition
  - I can explain how I'd structure a feature folder
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "Compound components (e.g. <Select><Select.Option/></Select>) share state via:"
    options: ["Global variables", "Context provided by the parent component", "Props drilling only", "Refs to DOM"]
    answer: 1
    why: "The parent owns state; children read it from context."
  - q: "Prop drilling through 5 levels is best fixed first by:"
    options: ["Redux immediately", "Composition (passing elements as children) or context if truly global", "Global variables", "Copying state"]
    answer: 1
    why: "Often the intermediate components don't need to know about the data."
  - q: "An accessible design system primitive library (e.g. Radix) mainly provides:"
    options: ["Colours", "Behaviour, keyboard handling and ARIA for complex widgets", "A CSS reset", "Routing"]
    answer: 1
    why: "Styling is layered on top (InterviewOS uses Tailwind)."
explain:
  prompt: "Explain how you'd design a reusable data table component for a product with many different tables."
  rubric:
    - "Separation of data logic (sorting/filtering/pagination) from presentation (headless approach)"
    - "Column definitions as configuration with render functions; composition for toolbar/empty states"
    - "Controlled vs uncontrolled sorting/pagination state; server-side support"
    - "Accessibility (table semantics, keyboard) and performance (virtualisation)"
  model: "I'd separate the logic from the markup: a headless hook (or TanStack Table) handles sorting, filtering, selection and pagination, and the table component renders semantic table elements from column definitions that include header text, an accessor and an optional cell render function. Toolbars, empty states and row actions are passed as children or slots instead of booleans. Sorting and pagination state can be controlled by the parent — needed when the server does the sorting — or uncontrolled for small client-side tables. It keeps proper table semantics, sortable headers as buttons with aria-sort, and for thousands of rows uses virtualisation. Styling comes from the design system tokens so all tables look consistent."
cards:
  - q: "Composition patterns"
    a: "children, slot props, compound components, render props/headless hooks."
  - q: "Controlled vs uncontrolled"
    a: "Controlled = React state is the source of truth; uncontrolled = DOM holds the value."
---

## Explanation

- **Single responsibility**: data loading (server components / hooks) separate from presentation.
- **Composition**: `children`, named slots (`header`, `actions`), compound components.
- **Variants over booleans**: `variant: "primary" | "ghost"` instead of `isPrimary`, `isGhost`.
- **Controlled/uncontrolled**: support both with `value`/`defaultValue` + `onChange` when building primitives.
- **Headless + styled layers**: logic hooks (Radix, TanStack) + your design tokens (shadcn/ui style).
- **Feature folders**: `features/practice/{components,hooks,api}` or route-colocated code; shared `ui/` primitives.

## Worked examples

InterviewOS's UI follows this: `src/components/ui/*` primitives (Button with variants, Dialog on Radix), feature folders (`components/practice`, `components/interviews`), and server pages composing them.

```tsx
<Card>
  <CardHeader><CardTitle>Upcoming reviews</CardTitle></CardHeader>
  <CardContent>{children}</CardContent>
</Card>
```

## Common misconceptions

- **"Reusable means configurable with many props."** — Composable beats configurable.
- **"Container/presentational split is mandatory."** — It's a guideline; hooks and server components changed the patterns.

## Practical exercises

1. Refactor a component with 6+ boolean props into variants + composition.
2. Build a small `Tabs` compound component with context and keyboard support.
