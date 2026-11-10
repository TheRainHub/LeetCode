---
slug: oop
title: Object-oriented design in practice
path: java
module: java-oop
order: 1
minutes: 45
depth: concise
practice: conceptual
summary: Encapsulation, composition over inheritance and the SOLID ideas that interviewers probe with small design questions.
prerequisites: []
problems: []
objectives:
  - Explain encapsulation, inheritance and polymorphism with concrete Java examples
  - Prefer composition over inheritance and justify it
  - Apply SOLID principles to a small design (e.g. a parking lot or notification sender)
readings:
  - title: "The Java Tutorials — Object-Oriented Programming Concepts"
    url: https://docs.oracle.com/javase/tutorial/java/concepts/index.html
    kind: docs
  - title: "The Java Tutorials — Inheritance"
    url: https://docs.oracle.com/javase/tutorial/java/IandI/subclasses.html
    kind: docs
interview:
  - q: "Why prefer composition over inheritance?"
    a: "Inheritance couples the subclass to the parent's implementation (fragile base class), is fixed at compile time and exposes the parent's API. Composition delegates to a collaborator behind an interface, can be swapped at runtime and keeps each class focused."
  - q: "What is the Liskov substitution principle? Give a violation."
    a: "Subtypes must be usable wherever the base type is expected without breaking expectations. Classic violation: Square extends Rectangle where setWidth also changes height, breaking code that assumes independent dimensions."
  - q: "Design a notification service that can send email, SMS and push. What classes?"
    a: "A Notifier interface (send(Message)), one implementation per channel, a NotificationService that depends on the interface (dependency injection) and chooses channels by user preferences; new channels are added without modifying existing code (open/closed)."
selfAssessment:
  - I can explain each SOLID letter with an example from my own code
  - I can spot an inheritance hierarchy that should be composition
completion:
  - Score at least 70% on the quiz
  - Explain composition vs inheritance in interview mode
quiz:
  - q: "Encapsulation primarily means:"
    options: ["Using many classes", "Hiding internal state behind a minimal interface that preserves invariants", "Making all fields final", "Using inheritance"]
    answer: 1
    why: "Callers interact through methods that keep the object valid."
  - q: "Dependency inversion says high-level modules should depend on:"
    options: ["Concrete low-level classes", "Abstractions", "Static utility methods", "The database"]
    answer: 1
    why: "Both high and low level depend on interfaces, which enables substitution and testing."
  - q: "Dynamic dispatch in Java selects the overridden method based on:"
    options: ["The declared (static) type", "The runtime type of the object", "The package", "The method's return type"]
    answer: 1
    why: "Overloading is resolved at compile time; overriding at runtime."
explain:
  prompt: "Explain to an interviewer why you would usually prefer composition over inheritance, with a small example."
  rubric:
    - "Defines both (is-a vs has-a / delegation)"
    - "Names a concrete problem of inheritance: tight coupling, fragile base class, inherited API, single inheritance"
    - "Shows how composition with an interface enables swapping and testing"
    - "Mentions when inheritance is still appropriate (true is-a with stable base, frameworks)"
  model: "Inheritance says a class is a kind of its parent and reuses its implementation; composition says a class has a collaborator and delegates to it. Inheritance ties the subclass to the parent's internals: changes in the base class can break subclasses, the subclass inherits API it may not want, and Java allows only one parent. With composition, say a ReportService that holds a Formatter interface, I can inject a PdfFormatter or a CsvFormatter, swap implementations at runtime, and test with a fake. I still use inheritance for genuine, stable is-a relationships or when a framework expects it, but my default is interfaces plus composition."
cards:
  - q: "SOLID"
    a: "Single responsibility, Open/closed, Liskov substitution, Interface segregation, Dependency inversion."
  - q: "Overloading vs overriding"
    a: "Overloading: same name, different params, compile time. Overriding: subclass replaces method, runtime dispatch."
---

## Explanation

### The three pillars, practically

- **Encapsulation** — keep fields private, expose behaviour that preserves invariants (`account.withdraw(x)` checks balance; no public `setBalance`).
- **Inheritance** — reuse and specialise (`class SavingsAccount extends Account`). Powerful but tightly coupling.
- **Polymorphism** — code against a type, run the subtype's behaviour (`List<Shape>` calling `area()`).

### Composition over inheritance

Inheritance exposes the parent's implementation details to subclasses and fixes the relationship at compile time. The classic example: extending `HashSet` to count added elements breaks because `addAll` internally calls `add` (double counting). Wrapping a `Set` and delegating avoids depending on that internal detail.

### SOLID in one line each

| Principle | Meaning | Smell when violated |
|---|---|---|
| Single responsibility | one reason to change | 2000-line service class |
| Open/closed | extend without modifying | `switch` on type in many places |
| Liskov substitution | subtypes honour base contracts | `instanceof` checks in callers |
| Interface segregation | small focused interfaces | implementing methods with `throw new UnsupportedOperationException()` |
| Dependency inversion | depend on abstractions | `new MySqlRepository()` inside business logic |

### Object-design interview tips

Start from **use cases**, identify nouns (entities) and verbs (behaviour), define interfaces at boundaries, keep entities small, and discuss extension points ("a new vehicle type adds one class").

## Worked examples

```java
interface Notifier { void send(User to, String message); }

final class EmailNotifier implements Notifier { /* SMTP client injected */ public void send(User to, String m) { /* ... */ } }
final class SmsNotifier implements Notifier { public void send(User to, String m) { /* ... */ } }

final class NotificationService {
    private final Map<Channel, Notifier> notifiers;
    NotificationService(Map<Channel, Notifier> notifiers) { this.notifiers = Map.copyOf(notifiers); }
    void notify(User u, String msg) {
        for (Channel c : u.preferredChannels()) notifiers.get(c).send(u, msg);
    }
}
```
Adding push notifications = one new class plus registration; `NotificationService` is untouched and trivially testable with a fake `Notifier`.

## Common misconceptions

- **"OOP means deep class hierarchies."** — Good designs are shallow, interface-driven.
- **"Getters and setters are encapsulation."** — Public setters for every field expose state just like public fields.
- **"Inheritance is the main reuse mechanism."** — Delegation usually reuses more safely.

## Practical exercises

1. Design classes for a parking lot (spots of sizes, vehicles, tickets) and explain extension points.
2. Refactor a `switch (shape.type)` area calculation into polymorphism.
3. Write the `InstrumentedSet` example with inheritance and with composition; explain the bug.
