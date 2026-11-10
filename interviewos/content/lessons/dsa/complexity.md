---
slug: complexity
title: Time and space complexity
path: dsa
module: dsa-foundations
order: 1
minutes: 60
depth: full
practice: conceptual
summary: Big-O as a tool for comparing approaches before you write code — and how to state complexity precisely in an interview.
prerequisites: []
problems: [two-sum, binary-search]
objectives:
  - Derive the time and space complexity of iterative and recursive code from first principles
  - Distinguish worst, average, best case and amortized complexity, and say which one you mean
  - Use input-size estimates to pick a target complexity before choosing an algorithm
  - State complexity with named variables (n, m, k) and include auxiliary space and recursion depth
readings:
  - title: "MIT 6.006 Introduction to Algorithms (Spring 2020)"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
    note: Lectures 1–2 cover asymptotic notation and the word-RAM model.
  - title: "Open Data Structures — Chapter 1 (Introduction)"
    url: https://opendatastructures.org/
    kind: book
    note: Free textbook; section 1.3 covers asymptotic notation and amortized analysis.
  - title: "Python docs — TimeComplexity of built-in operations"
    url: https://wiki.python.org/moin/TimeComplexity
    kind: docs
interview:
  - q: "Your solution sorts and then scans. What is the overall complexity and why?"
    a: "Sorting is O(n log n), the scan is O(n); sequential steps add, so O(n log n + n) = O(n log n). Mention the sort's extra space (e.g. O(log n) stack for quicksort-style sorts, O(n) for TimSort/merge sort) if space matters."
  - q: "What does amortized O(1) mean for ArrayList.add?"
    a: "Individual adds can cost O(n) when the backing array grows (copy), but because capacity grows geometrically, the total cost of n adds is O(n), so the average per operation over any sequence is O(1). It is a guarantee over sequences, not an average over random inputs."
  - q: "n is up to 10^5. Is an O(n²) solution acceptable?"
    a: "10^10 elementary operations is far too slow (roughly 10^8–10^9 simple operations per second). Aim for O(n log n) or O(n). This kind of estimate should drive the algorithm choice."
  - q: "What is the space complexity of a recursive DFS on a tree?"
    a: "O(h) for the call stack where h is the tree height: O(log n) for balanced trees, O(n) for a degenerate (linked-list-like) tree. Auxiliary structures (visited sets, output) are counted separately."
selfAssessment:
  - I can derive the complexity of nested loops whose bounds depend on each other
  - I can explain amortized analysis using dynamic array growth
  - I always state what n refers to and include recursion stack space
completion:
  - Score at least 70% on the quiz
  - Explain amortized complexity in interview mode with at least 70% rubric coverage
quiz:
  - q: "for (i = 0; i < n; i++) for (j = i; j < n; j++) work(); — how many times does work() run, asymptotically?"
    options: ["O(n)", "O(n log n)", "O(n²)", "O(n³)"]
    answer: 2
    why: "The inner loop runs n, n−1, …, 1 times: n(n+1)/2 = O(n²). Dependent bounds halve the constant, not the order."
  - q: "A loop that halves n each iteration runs how many times?"
    options: ["O(1)", "O(log n)", "O(√n)", "O(n)"]
    answer: 1
    why: "After k iterations n/2^k ≤ 1, so k = log₂ n."
  - q: "Which statement about O(n) vs O(n log n) is correct?"
    options: ["O(n log n) is always slower in practice", "For small n constants can dominate, but for large n O(n) wins", "They are equivalent because log n is a constant", "O(n) algorithms never use extra memory"]
    answer: 1
    why: "Big-O describes growth; constant factors and cache behaviour matter for small inputs, but asymptotically O(n) grows more slowly."
  - q: "Recursive Fibonacci fib(n) = fib(n−1) + fib(n−2) without memoization runs in:"
    options: ["O(n)", "O(n²)", "O(2ⁿ) (more precisely Θ(φⁿ))", "O(n log n)"]
    answer: 2
    why: "The call tree roughly doubles at each level; memoization reduces it to O(n) time and O(n) space."
explain:
  prompt: "Explain to an interviewer what 'amortized O(1)' means using a dynamic array (ArrayList / Python list) as the example, and how it differs from 'average case'."
  rubric:
    - "Appending is usually O(1) but occasionally triggers a resize that copies all n elements (O(n))"
    - "Capacity grows geometrically (e.g. ×1.5 or ×2), so resizes become rarer as the array grows"
    - "Total cost of n appends is O(n) (geometric series), so the per-operation amortized cost is O(1)"
    - "Amortized is a worst-case guarantee over any sequence of operations, unlike average case, which assumes a distribution of inputs"
    - "Mentions a practical consequence, e.g. pre-sizing to avoid copies, or latency spikes on resize"
  model: "Appending to a dynamic array normally writes into a free slot, which is O(1). When the backing array is full, the array allocates a bigger one — typically 1.5× or 2× — and copies every element, which costs O(n) for that single append. Because capacity grows geometrically, these expensive copies happen at sizes 1, 2, 4, 8 … and their total cost over n appends is bounded by about 2n, so n appends cost O(n) in total, i.e. O(1) amortized per append. That is a guarantee over any sequence of operations, not an average over random inputs, which is what 'average case' means. Practically, if you know the final size you can pre-size the list to avoid the copies, and latency-sensitive code should remember that an individual append can still be slow."
cards:
  - q: "Rule of thumb: how many simple operations per second, and what does that imply for n = 10^5?"
    a: "Roughly 10^8–10^9; with n = 10^5, O(n²) ≈ 10^10 is too slow — target O(n log n) or better."
  - q: "Space complexity of recursion"
    a: "Count the maximum call-stack depth (e.g. O(h) for tree DFS) plus auxiliary data structures; output usually counted separately — say which."
  - q: "Amortized vs average case"
    a: "Amortized: worst-case total cost over a sequence divided by its length. Average: expected cost under an input distribution."
  - q: "Complexity of sorting + one pass"
    a: "O(n log n) time; sequential steps add and the dominant term wins."
---

## Explanation

### Why complexity matters in interviews

Interviewers ask about complexity for two reasons: to check you can **compare approaches before coding**, and to see whether you understand **what your code actually does**. A correct O(n²) solution with a clear explanation of why O(n) is possible is often better received than a buggy O(n) attempt — but the expectation is that you get there.

### Big-O, Θ and Ω — what you're actually claiming

- **O(f(n))**: an upper bound on growth (for large n, up to a constant factor).
- **Ω(f(n))**: a lower bound.
- **Θ(f(n))**: tight bound — both.

In interviews "O" is used loosely to mean "tight bound for the case I'm discussing". Be precise when it matters: "this is Θ(n log n) in every case" vs "O(n²) worst case, O(n log n) average".

### Deriving time complexity

1. **Sequential steps add**: O(n) + O(n log n) = O(n log n).
2. **Nested loops multiply** — but check whether inner bounds depend on outer variables:
   - `for i in 0..n: for j in 0..n` → n²
   - `for i in 0..n: for j in i..n` → n(n+1)/2 → still O(n²)
   - `for i in 0..n: j = i; while j < n: j *= 2` → O(n log n)
3. **Halving or doubling loops** are logarithmic: `while n > 1: n //= 2` → O(log n).
4. **Two-pointer / sliding-window loops** look nested but each pointer only moves forward: total O(n). Count *total pointer movement*, not nesting depth.
5. **Recursion**: write the recurrence or count nodes in the call tree.
   - Binary search: T(n) = T(n/2) + O(1) → O(log n)
   - Merge sort: T(n) = 2T(n/2) + O(n) → O(n log n)
   - Naive Fibonacci: two calls per level → exponential

### Space complexity

Count **auxiliary** space the algorithm allocates beyond the input:

- hash maps/sets, copies of arrays, queues, output buffers (say whether you count output),
- **recursion depth** — every active call frame costs memory. DFS on a degenerate tree with 10^5 nodes can overflow the default Java stack.

### Worst, average, best, amortized

| Term | Meaning | Example |
|---|---|---|
| Worst case | Max over all inputs of size n | Quicksort O(n²) on adversarial pivots |
| Average case | Expected cost under an input distribution | HashMap get O(1) assuming uniform hashing |
| Best case | Rarely useful — avoid quoting it alone | Insertion sort O(n) on sorted input |
| Amortized | Worst-case total cost over a sequence ÷ length | Dynamic array append O(1) |

### Using constraints to choose the target

Interview constraints are hints. With roughly 10^8 simple operations per second:

| n | Feasible complexity |
|---|---|
| ≤ 20 | O(2ⁿ), backtracking |
| ≤ 500 | O(n³) |
| ≤ 5·10³ | O(n²) |
| ≤ 10^5–10^6 | O(n log n), O(n) |
| ≥ 10^9 | O(log n) or O(1) math |

Saying "n is 10^5, so I need better than quadratic" out loud is a strong signal.

### Stating complexity well

- Name the variables: "O(n·k) where n is the number of words and k the max word length".
- Separate time and space, and mention recursion stack.
- Mention trade-offs: "O(n) time and O(n) space with a hash map, or O(n log n) time and O(1) extra space by sorting in place".

## Worked examples

### Example 1 — dependent nested loops

```java
int count = 0;
for (int i = 1; i < n; i *= 2)        // log n iterations
    for (int j = 0; j < i; j++)       // i iterations
        count++;
```
Total = 1 + 2 + 4 + … + n/2 < n → **O(n)**, not O(n log n). The inner bound grows geometrically, so the sum is dominated by the last term.

### Example 2 — sliding window looks nested but is linear

```python
left = 0
for right in range(n):
    while window_invalid():
        left += 1
```
`left` only moves forward and never exceeds `right`, so the `while` body runs at most n times **in total** → O(n).

### Example 3 — recursion with memoization

Naive `fib(n)` makes ~φⁿ calls. With a memo table, each `fib(k)` is computed once: O(n) time, O(n) space (memo + stack). Bottom-up with two variables: O(n) time, O(1) space. Walking through these three versions is a classic way to show you understand both time and space.

## Common misconceptions

- **"Two nested loops always mean O(n²)."** — Count actual iterations; two-pointer loops are linear, halving inner loops are logarithmic.
- **"O(1) means fast."** — It means independent of n; a hash computation over a long string key is still proportional to the key length.
- **"Space complexity ignores recursion."** — The call stack is real memory and the classic source of StackOverflowError.
- **"Average case is the same as amortized."** — Amortized holds for every sequence; average depends on input distribution.
- **"Big-O is all that matters."** — Constant factors and memory locality decide between two O(n log n) options; mention them when relevant.

## Practical exercises

1. Give the time and space complexity of: (a) checking if an array has duplicates using a set, (b) the same by sorting first, (c) by comparing all pairs. State which you would choose for n = 10^6 and why.
2. Derive the complexity of `for i in range(n): for j in range(i, n, i + 1)` (harmonic series → O(n log n)).
3. Solve **Two Sum** and **Binary Search** in the practice workspace and state complexity before running tests.
4. Write the recurrence for merge sort and solve it by drawing the recursion tree.
