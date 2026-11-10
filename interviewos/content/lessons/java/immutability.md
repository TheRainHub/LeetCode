---
slug: immutability
title: Immutability, records and value objects
path: java
module: java-oop
order: 3
minutes: 35
depth: concise
practice: conceptual
summary: Why immutable objects are simpler, thread-safe and safe as map keys — and how to build them correctly in Java.
prerequisites: [oop]
problems: []
objectives:
  - List the rules for an immutable class and pitfalls with mutable fields
  - Use records and unmodifiable collections correctly
  - Explain why immutability simplifies concurrency and hashing
readings:
  - title: "Java Language Updates — Record classes"
    url: https://docs.oracle.com/en/java/javase/21/language/records.html
    kind: docs
  - title: "Java SE 21 API — List.copyOf / List.of (unmodifiable lists)"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/List.html
    kind: docs
interview:
  - q: "How do you make a class immutable?"
    a: "Make it final (or use a record), all fields private final, no setters, initialise everything in the constructor, defensively copy mutable inputs and never expose mutable internals (return copies or unmodifiable views)."
  - q: "Why are immutable objects thread-safe?"
    a: "Their state can't change after construction, so there are no data races on it; final fields also get special Java Memory Model guarantees making a properly constructed object visible correctly to other threads without synchronization."
selfAssessment:
  - I can write a correct immutable class with a list field
  - I know the difference between unmodifiable views and copies
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "A record with a List field is:"
    options: ["Deeply immutable automatically", "Shallowly immutable — the list itself can still be mutated unless copied", "Mutable", "Not allowed"]
    answer: 1
    why: "Records make fields final, not their contents; use List.copyOf in the compact constructor."
  - q: "Collections.unmodifiableList(list) returns:"
    options: ["A deep copy", "A read-only view that reflects later changes to the original", "An immutable copy", "A synchronized list"]
    answer: 1
    why: "Changes to the backing list are visible; List.copyOf makes a true copy."
  - q: "Why are mutable objects risky as HashMap keys?"
    options: ["They are slower", "Mutating a field used in hashCode strands the entry in the wrong bucket", "They can't override equals", "They are never equal"]
    answer: 1
    why: "Lookups go to the new bucket and miss the entry."
explain:
  prompt: "Explain the benefits of immutability and how to implement an immutable class in Java correctly."
  rubric:
    - "Benefits: thread safety, safe sharing/caching, safe hash keys, easier reasoning"
    - "final class/record, private final fields, no setters"
    - "Defensive copies of mutable inputs and outputs"
    - "Mentions shallow vs deep immutability (e.g. lists in records)"
  model: "An immutable object can't change after construction, so it's safe to share between threads without locks, safe to cache and to use as a HashMap key, and much easier to reason about because nobody can modify it behind your back. In Java I'd use a record or a final class with private final fields, no setters, and all state set in the constructor. The trap is mutable components: a final List field can still be modified, so I copy inputs with List.copyOf in the constructor and only expose unmodifiable data. Records are only shallowly immutable, so the same rule applies inside a compact constructor."
cards:
  - q: "Unmodifiable view vs copy"
    a: "Collections.unmodifiableList = view (reflects changes); List.copyOf = independent immutable copy."
  - q: "Immutable class rules"
    a: "final, private final fields, no setters, defensive copies in and out."
---

## Explanation

An **immutable** object's observable state never changes after construction. Examples in the JDK: `String`, `Integer`, `LocalDate`, `BigDecimal`, `List.of(...)`.

### Why it matters

- **Thread safety for free** — no writes means no data races. The JMM guarantees that `final` fields of a properly constructed object are visible to all threads.
- **Safe as keys and in sets** — the hash can't change under the collection.
- **Easier reasoning and caching** — values can be shared freely; no defensive copying by callers.
- **Cost** — creating new objects for changes; usually negligible, and sometimes mitigated with builders.

### Rules

1. Class `final` (or a `record`) so subclasses can't add mutability.
2. Fields `private final`.
3. No setters; "modifiers" return new instances (`withName(...)`).
4. Defensive copies of mutable inputs (`List.copyOf`, `array.clone()`), and don't leak internal mutable objects.
5. Don't let `this` escape during construction.

## Worked examples

```java
public record Order(String id, List<LineItem> items) {
    public Order {                            // compact constructor
        Objects.requireNonNull(id);
        items = List.copyOf(items);           // copy + unmodifiable; rejects nulls
    }
    public Order withItem(LineItem item) {
        var next = new ArrayList<>(items); next.add(item);
        return new Order(id, next);
    }
}
```

## Common misconceptions

- **"`final` makes an object immutable."** — `final` fixes the reference, not the object it points to.
- **"Records are deeply immutable."** — Only shallowly.
- **"Unmodifiable view = copy."** — Views reflect changes to the source.

## Practical exercises

1. Write an immutable `Money(amount, currency)` with `plus` returning a new instance and correct `equals`/`hashCode` (or a record).
2. Show the bug where a `Collections.unmodifiableList` view changes because the source list is modified.
