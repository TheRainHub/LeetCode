---
slug: interfaces-abstraction
title: Interfaces, abstract classes and abstraction
path: java
module: java-oop
order: 2
minutes: 35
depth: concise
practice: conceptual
summary: When to use an interface, an abstract class, default methods or sealed types — and how abstraction shapes testable code.
prerequisites: [oop]
problems: []
objectives:
  - Compare interfaces and abstract classes in modern Java (default methods, sealed types)
  - Design narrow interfaces at module boundaries for testability
  - Use functional interfaces and lambdas idiomatically
readings:
  - title: "The Java Tutorials — Interfaces and Inheritance"
    url: https://docs.oracle.com/javase/tutorial/java/IandI/index.html
    kind: docs
  - title: "Java Language Updates — Sealed classes"
    url: https://docs.oracle.com/en/java/javase/21/language/sealed-classes-and-interfaces.html
    kind: docs
interview:
  - q: "Interface vs abstract class in Java 21?"
    a: "Interfaces define a contract, support multiple inheritance of type and can have default/static/private methods but no instance state. Abstract classes can hold state and constructors and share implementation, but a class can extend only one. Use interfaces for capabilities and boundaries; abstract classes for a template with shared state."
  - q: "What problem do default methods solve, and what is their risk?"
    a: "They let library authors evolve interfaces without breaking implementations (e.g. Collection.stream()). Risk: diamond conflicts that must be resolved explicitly, and putting too much behaviour in interfaces."
selfAssessment:
  - I can choose between interface and abstract class for a given design
  - I can write and use a functional interface
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "A class implementing two interfaces with the same default method must:"
    options: ["Pick one automatically", "Override the method and resolve the conflict (e.g. A.super.m())", "Fail at runtime", "Use reflection"]
    answer: 1
    why: "The compiler forces an explicit override."
  - q: "A functional interface has:"
    options: ["No methods", "Exactly one abstract method", "Only default methods", "Exactly one default method"]
    answer: 1
    why: "That single abstract method is what a lambda implements."
  - q: "Sealed interfaces are most useful for:"
    options: ["Performance", "Restricting implementations to a known set, enabling exhaustive switch", "Serialization", "Thread safety"]
    answer: 1
    why: "Pattern-matching switches over sealed hierarchies can be checked for exhaustiveness."
explain:
  prompt: "When would you choose an interface vs an abstract class in Java? Use an example."
  rubric:
    - "Interfaces: contracts/capabilities, multiple implementation, no instance state"
    - "Abstract classes: shared state and implementation, single inheritance, constructors"
    - "Gives a concrete example of each"
    - "Mentions testability / dependency inversion benefits of interfaces"
  model: "I use an interface to describe a capability or a boundary, like a PaymentGateway with charge and refund: many unrelated classes can implement it, a class can implement several interfaces, and tests can substitute a fake. I'd use an abstract class when implementations share state and a common skeleton, say an AbstractHttpClient that holds the base URL and retry policy and leaves one method for subclasses to fill in. Since Java 8 interfaces can carry default methods, so the remaining difference is mainly instance state, constructors and single inheritance. My default is an interface at module boundaries, with composition for sharing code."
cards:
  - q: "Interface vs abstract class (one line)"
    a: "Interface = contract, multiple, no state; abstract class = shared state/implementation, single."
  - q: "Built-in functional interfaces"
    a: "Function<T,R>, Supplier<T>, Consumer<T>, Predicate<T>, BiFunction, UnaryOperator, Runnable, Callable."
---

## Explanation

**Abstraction** means exposing *what* a component does while hiding *how*. In Java you express it with interfaces and abstract classes.

| | Interface | Abstract class |
|---|---|---|
| Instance fields | no (constants only) | yes |
| Constructors | no | yes |
| Multiple inheritance | yes | no |
| Default/static/private methods | yes (Java 8/9+) | yes |
| Typical use | capability, boundary, plugin point | template with shared state |

**Sealed types** (Java 17+) restrict who may implement an interface: `sealed interface Shape permits Circle, Square {}`. Combined with records and pattern-matching `switch`, you get algebraic-data-type style modelling with compile-time exhaustiveness.

**Functional interfaces** have one abstract method and can be implemented with lambdas or method references: `Comparator<User> byAge = Comparator.comparingInt(User::age);`.

### Interfaces for testability

Depending on `Clock`, `UserRepository` or `HttpClient` interfaces (instead of static calls or concrete classes) lets tests inject fakes: e.g. pass a fixed `Clock` to test expiry logic deterministically.

## Worked examples

```java
sealed interface PaymentResult permits Approved, Declined, Failed {}
record Approved(String id) implements PaymentResult {}
record Declined(String reason) implements PaymentResult {}
record Failed(Exception cause) implements PaymentResult {}

String describe(PaymentResult r) {
    return switch (r) {                       // exhaustive: no default needed
        case Approved a -> "ok " + a.id();
        case Declined d -> "declined: " + d.reason();
        case Failed f -> "error: " + f.cause().getMessage();
    };
}
```

## Common misconceptions

- **"Interfaces can't have code."** — They can, via default methods.
- **"Abstract classes are obsolete."** — They still fit templates with shared state.
- **"Every class needs an interface."** — Only where substitution or a boundary is needed; otherwise it's noise.

## Practical exercises

1. Model shapes with a sealed interface and records; write an exhaustive `area` switch.
2. Refactor a class that calls `System.currentTimeMillis()` to accept a `Clock`, and write a test with `Clock.fixed`.
