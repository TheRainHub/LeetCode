---
slug: ts-type-system
title: The TypeScript type system
path: ts-react
module: ts-language
order: 1
minutes: 50
depth: full
practice: conceptual
summary: Structural typing, unions and intersections, literal types, any vs unknown vs never, interfaces vs type aliases, and what types do (and don't) guarantee at runtime.
prerequisites: []
problems: []
objectives:
  - Explain structural typing and how assignability is decided
  - Model data with unions, discriminated unions, literal types and optional properties
  - Choose between any, unknown and never and explain each
  - Recognise where static types end — validating untrusted input at runtime (e.g. Zod)
readings:
  - title: "TypeScript Handbook — Everyday Types"
    url: https://www.typescriptlang.org/docs/handbook/2/everyday-types.html
    kind: docs
  - title: "TypeScript Handbook — Type Compatibility"
    url: https://www.typescriptlang.org/docs/handbook/type-compatibility.html
    kind: docs
  - title: "TypeScript Handbook — Object Types"
    url: https://www.typescriptlang.org/docs/handbook/2/objects.html
    kind: docs
  - title: "Zod documentation"
    url: https://zod.dev/
    kind: docs
interview:
  - q: "What does 'structural typing' mean in TypeScript?"
    a: "Compatibility is based on shape, not declared names: an object is assignable to a type if it has the required properties with compatible types. Two interfaces with the same members are interchangeable. Java/C# use nominal typing instead."
  - q: "any vs unknown?"
    a: "any turns off checking — anything goes in and out. unknown accepts any value but you must narrow it (typeof, instanceof, schema validation) before using it. Use unknown for untrusted input such as JSON.parse results or catch variables."
  - q: "Do TypeScript types protect you from bad API responses?"
    a: "No. Types are erased at compile time; a response typed as User may contain anything. Validate external data at runtime (Zod, Valibot, io-ts) and derive the static type from the schema."
selfAssessment:
  - I can explain structural typing with an example
  - I can model a state machine with a discriminated union
  - I know when to use unknown and how to narrow it
completion:
  - Score at least 70% on the quiz
  - Explain any vs unknown vs never in interview mode
quiz:
  - q: "Which type is assignable to every other type and to which nothing else is assignable?"
    options: ["unknown", "never", "any", "void"]
    answer: 1
    why: "never is the bottom type (empty set). unknown is the top type."
  - q: "const x = 'GET' has type:"
    options: ["string", "'GET' (a literal type)", "any", "String"]
    answer: 1
    why: "const bindings of primitives infer literal types; let widens to string."
  - q: "Excess property checks happen when:"
    options: ["Always", "Assigning a fresh object literal directly to a typed target", "Never", "At runtime"]
    answer: 1
    why: "Passing a variable with extra properties is allowed (structural typing)."
  - q: "type A = { a: string } & { b: number } describes:"
    options: ["Either a or b", "An object having both a and b", "A union", "An error"]
    answer: 1
    why: "Intersection combines requirements; union means one of."
explain:
  prompt: "Explain how you'd type the response of an external API in a TypeScript backend so that bugs from unexpected data are caught."
  rubric:
    - "Types are erased; compile-time types alone don't validate runtime data"
    - "Treat input as unknown; validate with a schema (Zod) at the boundary"
    - "Derive types from the schema (z.infer) to keep them in sync"
    - "Handle validation failure explicitly (error, logging, fallback)"
  model: "TypeScript types disappear at runtime, so declaring the response as some interface is just an assertion — if the API changes, the code will happily read undefined fields. I'd treat the parsed body as unknown and validate it at the boundary with a schema library like Zod, then derive the TypeScript type from the schema with z.infer so the static type and the runtime check can't drift. If validation fails I return a clear error or degrade gracefully and log the mismatch with enough context to debug, instead of letting bad data flow deeper. Inside the application I can then rely on the types."
cards:
  - q: "any vs unknown vs never"
    a: "any: opt out. unknown: top type, must narrow. never: bottom type, impossible values."
  - q: "Structural typing"
    a: "Assignability by shape, not by name."
  - q: "interface vs type alias"
    a: "Both describe objects; interfaces merge and extend; type aliases also do unions, mapped and conditional types."
---

## Explanation

### Structural typing

```ts
interface Point { x: number; y: number }
const p = { x: 1, y: 2, label: "A" };
const q: Point = p; // OK: p has at least x and y
```

### Building blocks

- **Primitives and literals**: `string`, `"GET"`, `42`, `true`.
- **Unions** `A | B` (one of), **intersections** `A & B` (both).
- **Optional** `name?: string` vs `name: string | undefined` (differ under `exactOptionalPropertyTypes`).
- **Tuples** `[string, number]`, **readonly** arrays/properties.
- **Top/bottom**: `unknown` (everything), `never` (nothing).
- `any` disables checking and spreads silently — avoid it; enable `strict`.

### Discriminated unions

```ts
type RequestState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "success"; data: T }
  | { status: "error"; error: string };
```
Impossible states (data while loading) become unrepresentable.

### interface vs type

Interfaces support declaration merging and `extends`; type aliases support unions, mapped and conditional types. Use either consistently for object shapes.

### Compile time vs runtime

Types are erased. `as` casts are unchecked assertions. External input (HTTP bodies, env vars, `JSON.parse`, `localStorage`) must be validated at runtime — InterviewOS validates every server action input with Zod for this reason.

### Strictness flags worth knowing

`strict` (includes `strictNullChecks`, `noImplicitAny`), `noUncheckedIndexedAccess` (array/record index may be undefined), `exactOptionalPropertyTypes`.

## Worked examples

### Schema-first types

```ts
import { z } from "zod";
const User = z.object({ id: z.number().int(), email: z.string().email(), role: z.enum(["admin", "member"]) });
type User = z.infer<typeof User>;

async function fetchUser(id: number): Promise<User> {
  const res = await fetch(`/api/users/${id}`);
  const body: unknown = await res.json();
  return User.parse(body); // throws with a precise error if the shape is wrong
}
```

### Exhaustiveness with never

```ts
function label(s: RequestState<unknown>): string {
  switch (s.status) {
    case "idle": return "Idle";
    case "loading": return "Loading…";
    case "success": return "Done";
    case "error": return s.error;
    default: { const _exhaustive: never = s; return _exhaustive; }
  }
}
```

## Common misconceptions

- **"TypeScript validates data at runtime."** — It doesn't; it's erased.
- **"`as` converts values."** — It only tells the compiler to trust you.
- **"Interfaces and classes are nominal."** — Classes are compared structurally too (except private/protected members).
- **"Optional means nullable."** — Optional means the property may be missing; `null` is a separate value.

## Practical exercises

1. Model a booking's lifecycle (requested → confirmed → cancelled/attended) as a discriminated union with exhaustive handling.
2. Replace an `as` cast in one of your projects with schema validation.
3. Turn on `noUncheckedIndexedAccess` in a project and fix the errors it surfaces.
