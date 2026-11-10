---
slug: closures-prototypes
title: Scope, closures, this and prototypes
path: ts-react
module: ts-language
order: 3
minutes: 45
depth: full
practice: conceptual
summary: Lexical scope and closures, var/let/const and the temporal dead zone, how this is bound, and the prototype chain behind classes.
prerequisites: []
problems: []
objectives:
  - Explain lexical scope and closures and use them deliberately (factories, memoization, private state)
  - Predict the value of this under the four binding rules and with arrow functions
  - Explain prototypal inheritance and how class syntax maps to it
readings:
  - title: "MDN — Closures"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Guide/Closures
    kind: docs
  - title: "MDN — this"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Operators/this
    kind: docs
  - title: "MDN — Inheritance and the prototype chain"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Inheritance_and_the_prototype_chain
    kind: docs
interview:
  - q: "What is a closure?"
    a: "A function together with references to the variables of the scope it was created in. The inner function keeps access to those variables after the outer function returns — used for private state, factories, callbacks and memoization."
  - q: "What does this loop print: for (var i = 0; i < 3; i++) setTimeout(() => console.log(i))?"
    a: "3, 3, 3 — var is function-scoped, so all callbacks share one i, which is 3 when they run. With let, each iteration gets a new binding and it prints 0, 1, 2."
  - q: "How is `this` determined?"
    a: "By how a function is called: new binding (new F()), explicit binding (call/apply/bind), implicit binding (obj.method()), default (undefined in strict mode/modules, globalThis otherwise). Arrow functions don't have their own this; they capture it lexically."
selfAssessment:
  - I can predict closure-in-loop output with var and let
  - I can explain why a method loses this when passed as a callback
  - I can describe the prototype chain lookup
completion:
  - Score at least 70% on the quiz
  - Explain closures in interview mode
quiz:
  - q: "const f = obj.method; f(); — inside method, this is:"
    options: ["obj", "undefined in strict mode (method lost its receiver)", "window always", "f"]
    answer: 1
    why: "Implicit binding only applies to obj.method() call syntax."
  - q: "Accessing a let variable before its declaration in the same scope:"
    options: ["Returns undefined", "Throws a ReferenceError (temporal dead zone)", "Returns null", "Is hoisted to 0"]
    answer: 1
    why: "var would give undefined; let/const are hoisted but uninitialised."
  - q: "When you read obj.toString and obj has no own toString:"
    options: ["undefined", "JS walks the prototype chain (e.g. Object.prototype.toString)", "An error", "It calls the constructor"]
    answer: 1
    why: "Property lookup follows [[Prototype]] links."
  - q: "Arrow functions are a poor choice for:"
    options: ["Callbacks", "Object methods that need this to be the object, and constructors", "Array.map", "Event handlers in React components"]
    answer: 1
    why: "Arrows capture outer this and can't be used with new."
explain:
  prompt: "Explain closures using a practical example such as a memoize or a counter factory, and mention a pitfall."
  rubric:
    - "Defines closure: function + captured lexical environment"
    - "Concrete example where state persists across calls"
    - "Pitfall: loop with var, stale closures in React, memory retention"
  model: "A closure is a function bundled with the variables from the scope where it was defined. For example, makeCounter defines let count = 0 and returns a function that increments and returns count; each call to makeCounter creates a separate count that only its returned function can access, so we get private state without classes. Memoize works the same way: it creates a Map in the outer function and the returned function checks and fills that cache. A classic pitfall is var in loops — all callbacks share one variable — fixed by let. In React a related pitfall is a stale closure, where an effect or callback captured an old state value; the fix is correct dependency arrays or functional updates. Closures also keep captured objects alive, which can retain memory unexpectedly."
cards:
  - q: "Closure"
    a: "Function + captured lexical scope that outlives the outer call."
  - q: "this binding rules (priority)"
    a: "new > explicit (call/apply/bind) > implicit (obj.f()) > default; arrows are lexical."
  - q: "class syntax under the hood"
    a: "Constructor function + methods on prototype; extends sets up the prototype chain."
---

## Explanation

### Scope

- **Lexical scope**: variables resolve by where code is written.
- `var`: function-scoped, hoisted as `undefined`. `let`/`const`: block-scoped, hoisted into the **temporal dead zone** until declared.
- `const` prevents rebinding, not mutation of objects.

### Closures

Every function captures its surrounding environment. Uses: data privacy, factories, partial application, memoization, callbacks with context, module pattern.

### this

| Call form | this |
|---|---|
| `new F()` | the new object |
| `f.call(o)`, `f.bind(o)` | `o` |
| `o.f()` | `o` |
| `f()` | `undefined` (strict/modules) |
| arrow function | lexical `this` of the enclosing scope |

### Prototypes

Objects have an internal `[[Prototype]]`; property lookup walks the chain. `class` is syntax over constructor functions + `prototype` objects; `extends` links prototypes and `super` calls the parent constructor/method. Methods on the prototype are shared across instances.

## Worked examples

```js
function memoize(fn) {
  const cache = new Map();           // captured by the returned function
  return (n) => {
    if (!cache.has(n)) cache.set(n, fn(n));
    return cache.get(n);
  };
}

class Timer {
  seconds = 0;
  start() {
    // arrow keeps `this` bound to the Timer instance
    setInterval(() => { this.seconds++; }, 1000);
  }
}
```

```js
const counter = { n: 0, inc() { this.n++; } };
const inc = counter.inc;
inc();               // TypeError in strict mode: this is undefined
const bound = counter.inc.bind(counter); bound(); // works
```

## Common misconceptions

- **"Closures copy variables."** — They reference them; later changes are visible.
- **"Arrow functions are just shorter functions."** — They also differ in `this`, `arguments` and `new`.
- **"JS classes work like Java classes."** — They're prototype-based; methods can be detached and rebound.

## Practical exercises

1. Implement `once(fn)` and `debounce(fn, ms)` using closures.
2. Explain the output of five `this` puzzles you write yourself, then run them to check.
3. Recreate a small class hierarchy with `Object.create` to see the prototype links.
