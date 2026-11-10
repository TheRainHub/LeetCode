---
slug: ts-generics-narrowing
title: Generics, narrowing and type-level tools
path: ts-react
module: ts-language
order: 2
minutes: 45
depth: full
practice: conceptual
summary: Generic functions and constraints, control-flow narrowing and type guards, keyof/indexed access, mapped and conditional types, and the built-in utility types.
prerequisites: [ts-type-system]
problems: []
objectives:
  - Write generic functions with constraints and explain inference
  - Narrow unions with typeof, in, instanceof, discriminants and user-defined type guards
  - Use keyof, indexed access, mapped and conditional types and built-in utilities (Partial, Pick, Omit, Record, ReturnType)
readings:
  - title: "TypeScript Handbook — Generics"
    url: https://www.typescriptlang.org/docs/handbook/2/generics.html
    kind: docs
  - title: "TypeScript Handbook — Narrowing"
    url: https://www.typescriptlang.org/docs/handbook/2/narrowing.html
    kind: docs
  - title: "TypeScript Handbook — Mapped Types"
    url: https://www.typescriptlang.org/docs/handbook/2/mapped-types.html
    kind: docs
  - title: "TypeScript Handbook — Utility Types"
    url: https://www.typescriptlang.org/docs/handbook/utility-types.html
    kind: docs
interview:
  - q: "Write a type-safe getProperty(obj, key) function."
    a: "function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] { return obj[key]; } — K is constrained to T's keys and the return type is the indexed access type T[K]."
  - q: "What is a user-defined type guard?"
    a: "A function returning `value is T`, e.g. function isUser(x: unknown): x is User { … }. When it returns true, TypeScript narrows the argument to T in that branch. The check must actually be correct — the compiler trusts it."
  - q: "Implement Partial<T> yourself."
    a: "type MyPartial<T> = { [K in keyof T]?: T[K] }; — a mapped type iterating over T's keys and adding the optional modifier."
selfAssessment:
  - I can write a constrained generic function and explain inference
  - I can implement Pick and Partial with mapped types
  - I can narrow a union in four different ways
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "function first<T>(xs: T[]): T | undefined — calling first([1, 2]) infers T as:"
    options: ["unknown", "number", "1 | 2", "any"]
    answer: 1
    why: "Inference picks number for array elements."
  - q: "'kind' in shape narrows by:"
    options: ["Value equality", "Checking a property exists on union members", "Runtime class", "Nothing"]
    answer: 1
    why: "The in operator narrows to members declaring that property."
  - q: "type T = Exclude<'a' | 'b' | 'c', 'a'> is:"
    options: ["'a'", "'b' | 'c'", "never", "string"]
    answer: 1
    why: "Exclude is a distributive conditional type: T extends U ? never : T."
  - q: "ReturnType<typeof fn> gives:"
    options: ["The function's parameters", "The function's return type", "A Promise", "The function itself"]
    answer: 1
    why: "Implemented with infer in a conditional type."
explain:
  prompt: "Explain how generics with constraints and keyof make a typed event emitter possible."
  rubric:
    - "Event map type: names → payload types"
    - "Generic on K extends keyof Events; payload typed as Events[K]"
    - "Inference catches wrong event names and payloads at compile time"
    - "Notes runtime behaviour unchanged (types erased)"
  model: "I'd define an event map type, for example { booked: { classId: number }; cancelled: { bookingId: number } }. The emitter is generic over that map, and its methods are generic over K extends keyof Events: on<K>(event: K, handler: (payload: Events[K]) => void) and emit<K>(event: K, payload: Events[K]). When I call emit('booked', …) TypeScript infers K as 'booked' and requires the payload to match Events['booked'], so misspelled event names or wrong payloads are compile errors, and handlers get correctly typed payloads without casts. At runtime it's an ordinary map from strings to handler arrays — the safety is purely static."
cards:
  - q: "Constrained generic for property access"
    a: "<T, K extends keyof T>(o: T, k: K): T[K]"
  - q: "Mapped type syntax"
    a: "{ [K in keyof T]: … } with ?/readonly modifiers (+/-)."
  - q: "Conditional type with infer"
    a: "T extends Promise<infer U> ? U : T — extracts the awaited type."
---

## Explanation

### Generics

Type parameters let functions/types work over many types while preserving relationships:

```ts
function mapValues<T, U>(obj: Record<string, T>, f: (v: T) => U): Record<string, U> { … }
```
**Constraints**: `<T extends { id: number }>`. **Defaults**: `<T = string>`. Inference usually figures out type arguments.

### Narrowing

TypeScript tracks control flow:
- `typeof x === "string"`, `x instanceof Date`, `"prop" in x`
- equality checks on **discriminants** (`s.status === "error"`)
- truthiness (careful with `0` and `""`)
- **type predicates** `x is T` and **assertion functions** `asserts x is T`

### Type-level tools

- `keyof T`, `T[K]` (indexed access), `typeof value`
- **Mapped types**: `{ [K in keyof T]: … }`, key remapping with `as`
- **Conditional types**: `T extends U ? X : Y`, distributive over unions, `infer`
- **Template literal types**: `` `on${Capitalize<E>}` ``
- Utilities: `Partial`, `Required`, `Readonly`, `Pick`, `Omit`, `Record`, `Exclude`, `Extract`, `NonNullable`, `ReturnType`, `Parameters`, `Awaited`
- `satisfies` checks a value against a type without widening it.

## Worked examples

### Typed event emitter

```ts
type Events = { booked: { classId: number }; cancelled: { bookingId: number } };

class Emitter<E extends Record<string, unknown>> {
  private handlers: { [K in keyof E]?: ((p: E[K]) => void)[] } = {};
  on<K extends keyof E>(event: K, h: (p: E[K]) => void) {
    (this.handlers[event] ??= []).push(h);
  }
  emit<K extends keyof E>(event: K, payload: E[K]) {
    this.handlers[event]?.forEach((h) => h(payload));
  }
}
const bus = new Emitter<Events>();
bus.emit("booked", { classId: 7 });      // OK
// bus.emit("booked", { bookingId: 7 }); // compile error
```

### satisfies

```ts
const routes = { home: "/", lesson: "/learn/:slug" } satisfies Record<string, string>;
routes.lesson; // type is the literal "/learn/:slug", not string
```

## Common misconceptions

- **"Generics are like `any`."** — They preserve relationships between inputs and outputs.
- **"Type guards are checked by the compiler."** — The predicate's correctness is your responsibility.
- **"Complex type gymnastics are good design."** — Prefer simple types; readability matters in reviews.

## Practical exercises

1. Implement `MyPick`, `MyOmit`, `MyReadonly` and `MyAwaited`.
2. Write `isNonEmptyString(x: unknown): x is string` and use it to narrow form input.
3. Type a `groupBy<T, K extends PropertyKey>(xs: T[], key: (x: T) => K): Record<K, T[]>`.
