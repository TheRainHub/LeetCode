---
slug: generics
title: Generics, wildcards and type erasure
path: java
module: java-language
order: 2
minutes: 35
depth: concise
practice: conceptual
summary: Type-safe reusable code, PECS for wildcards, and what type erasure does and doesn't let you do at runtime.
prerequisites: [collections]
problems: []
objectives:
  - Write generic classes and methods with bounded type parameters
  - Apply PECS (producer extends, consumer super) to API design
  - Explain type erasure and its consequences (no new T(), no List<int>, unchecked casts)
readings:
  - title: "The Java Tutorials — Generics"
    url: https://docs.oracle.com/javase/tutorial/java/generics/index.html
    kind: docs
  - title: "The Java Tutorials — Wildcards"
    url: https://docs.oracle.com/javase/tutorial/java/generics/wildcards.html
    kind: docs
interview:
  - q: "Is List<Integer> a subtype of List<Number>?"
    a: "No — generics are invariant. Otherwise you could add a Double to a List<Integer> through the List<Number> reference. Use List<? extends Number> to read Numbers from either."
  - q: "What is type erasure?"
    a: "Generic type arguments are checked at compile time and erased in bytecode (replaced by bounds, usually Object, with casts inserted). So you can't do new T(), instanceof List<String>, or create generic arrays; List<int> is impossible (use List<Integer> or primitive specialisations)."
selfAssessment:
  - I can explain PECS with Collections.copy as the example
  - I know what erasure forbids
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "A method that only reads elements from a collection of numbers should accept:"
    options: ["List<Number>", "List<? extends Number>", "List<? super Number>", "List<Object>"]
    answer: 1
    why: "Producer extends: it produces Numbers for you to read."
  - q: "Which is legal in Java?"
    options: ["new T()", "T[] arr = new T[10]", "<T extends Comparable<T>> T max(List<T> xs)", "list instanceof List<String>"]
    answer: 2
    why: "Bounded generic methods are fine; the others are blocked by erasure."
  - q: "Arrays are covariant (String[] is an Object[]). The consequence is:"
    options: ["No consequence", "Storing a wrong type throws ArrayStoreException at runtime", "Compile error always", "Generics become covariant too"]
    answer: 1
    why: "Arrays check element types at runtime; generics check at compile time."
explain:
  prompt: "Explain PECS and why List<Integer> is not a List<Number>."
  rubric:
    - "Generics are invariant and why (type safety when writing)"
    - "? extends T for producers you read from"
    - "? super T for consumers you write into"
    - "Concrete example such as copy(List<? super T> dst, List<? extends T> src)"
  model: "Generic types are invariant: if List<Integer> were a List<Number>, I could add a Double through the Number reference and corrupt the integer list. Wildcards give controlled variance. PECS: when a parameter produces values I read, use ? extends T, so List<? extends Number> accepts a List<Integer> and lets me read Numbers but not add. When a parameter consumes values I write, use ? super T, so List<? super Integer> accepts List<Number> or List<Object> and lets me add Integers. Collections.copy(List<? super T> dest, List<? extends T> src) is the textbook example."
cards:
  - q: "What does PECS stand for?"
    a: "Producer extends, consumer super."
  - q: "Erasure forbids"
    a: "new T(), generic arrays, instanceof with type args, primitives as type args."
---

## Explanation

Generics let one implementation work with many types while the compiler checks types: `List<String>` rejects `add(42)` at compile time and needs no casts on `get`.

### Generic methods and bounds

```java
static <T extends Comparable<? super T>> T max(Collection<? extends T> xs) {
    Iterator<? extends T> it = xs.iterator();
    T best = it.next();
    while (it.hasNext()) { T x = it.next(); if (x.compareTo(best) > 0) best = x; }
    return best;
}
```
`T extends Comparable<? super T>` allows types whose comparison is defined on a supertype.

### Variance and wildcards

- Generics are **invariant**: `List<Integer>` is not a `List<Number>`.
- `? extends T` — read as `T`, cannot add (except `null`) → **producer**.
- `? super T` — can add `T`, reads give `Object` → **consumer**.
- Unbounded `?` — when you only use `Object` methods or `size()`.

### Type erasure

Type arguments exist at compile time only. Consequences: no `new T()` (pass a `Supplier<T>` or `Class<T>`), no generic array creation, no `instanceof List<String>`, overloads that differ only by type arguments clash, and raw types bypass checks (avoid them). Primitives need boxing (`List<Integer>`) — mind the allocation cost in hot loops.

## Worked examples

```java
static <T> void copy(List<? super T> dst, List<? extends T> src) {
    for (T item : src) dst.add(item);
}
List<Number> numbers = new ArrayList<>();
copy(numbers, List.of(1, 2, 3));      // T = Integer: src produces Integers, dst consumes them
```

## Common misconceptions

- **"Generics are checked at runtime."** — They're erased; only casts inserted by the compiler remain.
- **"`List<Object>` accepts any list."** — It accepts only `List<Object>`; use `List<?>`.
- **"Raw types are fine for legacy reasons."** — They disable type checking and produce heap pollution.

## Practical exercises

1. Write a generic `Pair<A, B>` record and a method `swap`.
2. Write `sum(List<? extends Number>)` and explain why `add` doesn't compile inside it.
3. Implement a generic `Cache<K, V>` that accepts a `Function<K, V>` loader.
