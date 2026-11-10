---
slug: kotlin-fundamentals
title: Kotlin for Java developers
path: java
module: java-kotlin
order: 1
minutes: 45
depth: concise
practice: conceptual
summary: Null safety, data classes, extension functions, immutability by default and coroutines — the Kotlin features interviewers ask Java developers about.
prerequisites: [oop, completablefuture]
problems: []
objectives:
  - Use Kotlin's nullable types, safe calls and smart casts
  - Write idiomatic data classes, sealed classes and collection operations
  - Explain coroutines and structured concurrency at a high level
readings:
  - title: "Kotlin docs — Basic syntax"
    url: https://kotlinlang.org/docs/basic-syntax.html
    kind: docs
  - title: "Kotlin docs — Null safety"
    url: https://kotlinlang.org/docs/null-safety.html
    kind: docs
  - title: "Kotlin docs — Coroutines overview"
    url: https://kotlinlang.org/docs/coroutines-overview.html
    kind: docs
interview:
  - q: "How does Kotlin's null safety work and where can NPEs still happen?"
    a: "Types are non-null by default; T? is nullable and requires ?., ?:, smart casts or !! to use. NPEs remain via !!, platform types from Java (T!), lateinit before init, and some initialization-order cases."
  - q: "What is structured concurrency in Kotlin coroutines?"
    a: "Coroutines are launched in a scope; a parent waits for its children and cancellation/failures propagate through the hierarchy, so you can't leak background work. coroutineScope { async {...}; async {...} } fails fast if a child fails."
selfAssessment:
  - I can translate a Java POJO + equals/hashCode into a Kotlin data class
  - I can explain suspend functions vs threads
completion:
  - Score at least 70% on the quiz
quiz:
  - q: "val user: User? = find(); user.name does:"
    options: ["Compiles and may throw NPE", "Doesn't compile — use user?.name or a null check", "Returns null", "Throws at compile time only for vals"]
    answer: 1
    why: "Members of nullable types need safe access."
  - q: "A Kotlin data class automatically provides:"
    options: ["Thread safety", "equals/hashCode/toString/copy/componentN", "Immutability of nested lists", "Serialization"]
    answer: 1
    why: "Generated from the primary constructor properties."
  - q: "A suspend function:"
    options: ["Always runs on a new thread", "Can pause without blocking its thread and resume later", "Is a Java Future", "Cannot call other functions"]
    answer: 1
    why: "Suspension frees the thread for other coroutines."
explain:
  prompt: "Explain Kotlin's null safety model to a Java developer, including where it can still fail."
  rubric:
    - "Non-null by default; T? for nullable types"
    - "Safe call ?., Elvis ?:, smart casts after checks"
    - "!! and platform types from Java as remaining NPE sources"
    - "Compared with Java Optional / annotations"
  model: "In Kotlin, String can never be null; String? can, and the compiler won't let you call members on it directly. You use the safe call user?.name, which yields null if user is null, the Elvis operator to supply a default, or a null check after which the compiler smart-casts to the non-null type. Compared with Java, where any reference can be null and Optional is opt-in, nullability is part of the type. NPEs can still happen with the !! operator, with platform types coming from Java code that the compiler can't check, and with lateinit properties accessed before initialisation."
cards:
  - q: "Kotlin null-safety operators"
    a: "?. safe call, ?: Elvis default, !! assert non-null (throws), let for scoped non-null use."
  - q: "launch vs async"
    a: "launch: fire-and-forget Job; async: Deferred<T> with await() for a result."
---

## Explanation

### Null safety

```kotlin
val name: String = "Ada"          // never null
val maybe: String? = lookup()      // nullable
val len = maybe?.length ?: 0       // safe call + Elvis
if (maybe != null) println(maybe.length)   // smart cast
```

### Concise modelling

```kotlin
data class Order(val id: String, val items: List<Item>)           // equals/hashCode/toString/copy
sealed interface Result { data class Ok(val v: Int) : Result; data class Err(val msg: String) : Result }
fun describe(r: Result) = when (r) { is Result.Ok -> "ok ${r.v}"; is Result.Err -> "error ${r.msg}" }  // exhaustive
fun String.isPalindrome() = this == reversed()                      // extension function
```
`val` (read-only) vs `var`; `List` is a read-only interface (not necessarily immutable), `MutableList` allows changes.

### Collections and lambdas

`filter`, `map`, `groupBy`, `associateBy`, `sumOf`, `sortedBy`, `windowed`; sequences (`asSequence()`) for lazy pipelines.

### Coroutines

`suspend` functions can pause without blocking a thread. Builders: `launch` (Job), `async` (Deferred). **Structured concurrency**: coroutines live in a `CoroutineScope`; cancellation and failures propagate parent ↔ children. Dispatchers: `Dispatchers.Default` (CPU), `Dispatchers.IO` (blocking I/O).

```kotlin
suspend fun loadDashboard(id: Long): Dashboard = coroutineScope {
    val user = async { users.get(id) }
    val orders = async { orders.forUser(id) }
    Dashboard(user.await(), orders.await())     // if one fails, the other is cancelled
}
```

### Java interop

Kotlin compiles to JVM bytecode and calls Java directly; Java types appear as **platform types** (`String!`) with unknown nullability — annotate Java code (`@Nullable`/`@NonNull`) to help.

## Worked examples

Java → Kotlin:

```kotlin
// 40 lines of Java POJO become:
data class User(val id: Long, val email: String, val name: String? = null)
val renamed = user.copy(name = "New name")
```

## Common misconceptions

- **"List in Kotlin is immutable."** — It's a read-only view; the underlying list may be mutable.
- **"Coroutines are threads."** — Many coroutines run on few threads; blocking calls inside them still block the thread.
- **"!! is fine for convenience."** — It reintroduces NPEs; prefer explicit handling.

## Practical exercises

1. Port a small Java class with getters, equals and hashCode to a Kotlin data class.
2. Model a payment result with a sealed interface and an exhaustive `when`.
3. Write a coroutine that fetches two values concurrently with `async` and cancels both if one fails.
