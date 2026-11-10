---
slug: stack-queue
title: Stacks and queues
path: dsa
module: dsa-linear
order: 2
minutes: 45
depth: full
practice: coding
summary: LIFO and FIFO structures, monotonic stacks, and the deque — plus which Java classes to actually use.
prerequisites: [arrays-strings]
problems: [valid-parentheses]
objectives:
  - Choose between stack, queue and deque based on access order
  - Solve matching/nesting problems with a stack
  - Apply a monotonic stack to 'next greater element' style problems in O(n)
  - Use ArrayDeque correctly in Java and know why Stack is legacy
readings:
  - title: "Java SE 21 API — ArrayDeque"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/ArrayDeque.html
    kind: docs
  - title: "Python docs — collections.deque"
    url: https://docs.python.org/3/library/collections.html#collections.deque
    kind: docs
interview:
  - q: "Why prefer ArrayDeque over Stack in Java?"
    a: "Stack extends Vector, so every method is synchronized (unnecessary overhead) and it exposes index-based operations that break the abstraction. ArrayDeque is unsynchronized, array-backed and implements Deque (push/pop/peek)."
  - q: "What is a monotonic stack and what does it solve?"
    a: "A stack kept in increasing or decreasing order; when a new element breaks the order you pop and resolve the popped elements' 'next greater/smaller' answer. Each element is pushed and popped once → O(n). Used for next greater element, daily temperatures, largest rectangle in histogram."
  - q: "Implement a queue with two stacks — complexity?"
    a: "Push to an input stack; pop from an output stack, refilling it from the input stack only when empty. Each element moves at most twice → amortized O(1) per operation."
selfAssessment:
  - I can implement Valid Parentheses and Min Stack quickly
  - I can explain the amortized cost of a two-stack queue
  - I can recognise monotonic-stack problems
completion:
  - Score at least 70% on the quiz
  - Solve Valid Parentheses independently
quiz:
  - q: "BFS uses which structure for its frontier?"
    options: ["Stack", "Queue", "Priority queue", "Set"]
    answer: 1
    why: "FIFO order processes nodes level by level."
  - q: "'Daily temperatures' (days until a warmer day) runs in O(n) using:"
    options: ["Sorting", "A monotonic decreasing stack of indices", "Binary search per day", "A min-heap"]
    answer: 1
    why: "Each index is popped when a warmer day arrives; each pushed/popped once."
  - q: "ArrayDeque.push(x) adds x to:"
    options: ["The tail", "The head (top of the stack)", "A random position", "It throws"]
    answer: 1
    why: "push = addFirst; pop = removeFirst, giving LIFO behaviour."
explain:
  prompt: "Explain the monotonic stack technique using 'next greater element' as the example, including why it's O(n)."
  rubric:
    - "Scans elements left to right keeping a stack of indices whose answer is still unknown"
    - "Stack values are kept decreasing; a larger element pops smaller ones and becomes their answer"
    - "Elements left in the stack at the end have no greater element (e.g. −1)"
    - "Each index is pushed once and popped at most once → O(n) time, O(n) space"
  model: "I scan left to right and keep a stack of indices that haven't found their next greater element yet. Their values are decreasing from bottom to top, because anything smaller than a later value would already have been resolved. For a new value x, while the top of the stack has a smaller value, that element's next greater element is x, so I pop it and record the answer. Then I push the current index. Whatever remains at the end has no greater element. Each index is pushed once and popped at most once, so despite the nested loop it's O(n) time with O(n) space for the stack."
cards:
  - q: "Java stack/queue class to use"
    a: "ArrayDeque (push/pop/peek for stack; offer/poll/peek for queue). Avoid Stack and LinkedList."
  - q: "Monotonic stack complexity"
    a: "O(n): every element is pushed once and popped at most once."
  - q: "Queue from two stacks"
    a: "Move input→output only when output is empty; amortized O(1)."
---

## Explanation

### Stack (LIFO) and queue (FIFO)

- **Stack** — last in, first out. Natural fit for nesting, undo, DFS, expression evaluation, backtracking.
- **Queue** — first in, first out. Natural fit for BFS, scheduling, buffering producer/consumer work.
- **Deque** — both ends. Implements both, plus sliding-window min/max.

### What to use per language

| | Stack | Queue |
|---|---|---|
| Java | `Deque<T> s = new ArrayDeque<>(); s.push / pop / peek` | `Queue<T> q = new ArrayDeque<>(); q.offer / poll / peek` |
| Python | `list.append / pop` | `collections.deque.append / popleft` (never `list.pop(0)`, it's O(n)) |
| TypeScript | `array.push / pop` | array + head index, or a small ring buffer (`shift()` is O(n)) |

Java's `ArrayDeque` does not allow `null` elements; `poll()` returns `null` when empty while `remove()`/`pop()` throw.

### Patterns

1. **Matching/nesting** — parentheses, HTML tags, decoding `3[a2[c]]`.
2. **Monotonic stack** — next greater/smaller, stock span, histogram area.
3. **Min stack** — store `(value, minSoFar)` pairs for O(1) `getMin`.
4. **Two-stack queue** — amortized O(1).
5. **Queue for BFS** — shortest path in unweighted graphs and grids.

## Worked examples

### Example 1 — min stack

```java
class MinStack {
    private final Deque<int[]> s = new ArrayDeque<>();   // {value, minSoFar}
    void push(int x) { s.push(new int[]{x, s.isEmpty() ? x : Math.min(x, s.peek()[1])}); }
    void pop() { s.pop(); }
    int top() { return s.peek()[0]; }
    int getMin() { return s.peek()[1]; }
}
```

### Example 2 — daily temperatures

```python
def daily_temperatures(t):
    ans, stack = [0] * len(t), []          # stack of indices, temps decreasing
    for i, temp in enumerate(t):
        while stack and t[stack[-1]] < temp:
            j = stack.pop()
            ans[j] = i - j
        stack.append(i)
    return ans
```

### Example 3 — evaluate Reverse Polish Notation

Push numbers; on an operator pop `b` then `a` (order matters for `-` and `/`), push `a op b`. Java integer division truncates toward zero, which matches the usual specification.

## Common misconceptions

- **"java.util.Stack is the standard stack."** — It's legacy; use `ArrayDeque`.
- **"list.pop(0) is a fine queue in Python."** — O(n) per pop.
- **"Monotonic stacks are O(n²) because of the inner loop."** — Amortized, each element is popped once.
- **"Counting brackets validates them."** — Counts can't detect wrong order like `([)]`.

## Practical exercises

1. Solve **Valid Parentheses** with `ArrayDeque<Character>`.
2. Implement MinStack and a two-stack queue; write tests for empty-structure behaviour.
3. Solve "daily temperatures" and "next greater element" with a monotonic stack.
4. Decode strings like `3[a2[c]]` → `accaccacc` with two stacks (counts and partial strings).
