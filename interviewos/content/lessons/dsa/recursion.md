---
slug: recursion
title: Recursion and backtracking
path: dsa
module: dsa-linear
order: 3
minutes: 45
depth: concise
practice: coding
summary: Base case, recursive case and trust — plus backtracking for enumerating subsets, permutations and combinations.
prerequisites: [complexity]
problems: []
objectives:
  - Write recursive functions with explicit base cases and a shrinking problem size
  - Analyse recursion with recurrences and call-tree counting, including stack depth
  - Use the choose / explore / un-choose template for backtracking
readings:
  - title: "MIT 6.006 Introduction to Algorithms (Spring 2020)"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
  - title: "Python docs — sys.getrecursionlimit"
    url: https://docs.python.org/3/library/sys.html#sys.getrecursionlimit
    kind: docs
interview:
  - q: "How many subsets and permutations does an n-element set have, and what does that imply?"
    a: "2ⁿ subsets and n! permutations; generating them costs at least that much (times n to copy each), so these approaches only work for small n (≈ 20 for subsets, ≈ 10 for permutations)."
  - q: "When would you convert recursion to iteration?"
    a: "When depth can be large (deep lists/trees, 10^5 levels) and risks stack overflow, or in languages without tail-call optimisation (Java, Python, most JS engines). Use an explicit stack."
selfAssessment:
  - I can write subsets and permutations with backtracking from memory
  - I can state the stack depth of my recursive solutions
completion:
  - Score at least 70% on the quiz
  - Explain the backtracking template in interview mode
quiz:
  - q: "A recursive function without a reachable base case will:"
    options: ["Return null", "Recurse until the stack overflows", "Be optimised away by the JVM", "Loop forever without errors"]
    answer: 1
    why: "Each call adds a frame; Java throws StackOverflowError, Python RecursionError."
  - q: "Generating all subsets of n elements with backtracking takes:"
    options: ["O(n)", "O(n²)", "O(n·2ⁿ)", "O(n!)"]
    answer: 2
    why: "There are 2ⁿ subsets and copying each costs up to O(n)."
  - q: "In backtracking, the 'un-choose' step exists to:"
    options: ["Free memory", "Restore shared state before trying the next option", "Speed up recursion", "Avoid duplicates automatically"]
    answer: 1
    why: "The same mutable path/visited structure is reused across branches."
explain:
  prompt: "Explain the backtracking template using 'generate all subsets' as the example, including complexity."
  rubric:
    - "Recursive function takes the current index and the current partial path"
    - "At each element, choose to include or exclude it (or loop over remaining candidates)"
    - "Un-chooses (pops) after exploring so the shared path is restored"
    - "Copies the path when recording a result"
    - "States O(n·2ⁿ) time and O(n) recursion depth"
  model: "I write backtrack(start, path). Every call records a copy of path as one subset. Then for each index i from start to n−1, I choose nums[i] by appending it, explore with backtrack(i + 1, path), and un-choose by popping it so the shared list is back to its previous state for the next option. Starting from i + 1 ensures each subset is produced once in increasing index order. There are 2ⁿ subsets and copying each costs up to n, so it's O(n·2ⁿ) time, and the recursion depth and path size are O(n)."
cards:
  - q: "Backtracking template"
    a: "Choose → explore (recurse) → un-choose; record copies of the path."
  - q: "Feasible n for subsets / permutations"
    a: "About 20 for 2ⁿ, about 10 for n!."
  - q: "Recursion space cost"
    a: "Maximum call depth × frame size, plus any shared structures."
---

## Explanation

A recursive solution needs three things:

1. **Base case** — the smallest input you answer directly.
2. **Recursive case** — express the problem in terms of strictly smaller subproblems.
3. **Trust** — assume the recursive call works for smaller input (induction) instead of tracing every level.

**Complexity** comes from the call tree: (number of calls) × (work per call). Space is the **maximum depth** of the call stack plus shared structures. Java's default thread stack handles roughly 10^4–10^5 frames depending on frame size; Python's default recursion limit is 1000.

### Backtracking

Backtracking explores a decision tree and prunes branches that can't lead to a solution:

```text
def backtrack(state):
    if is_solution(state): record(copy(state)); return
    for choice in candidates(state):
        if not valid(choice): continue
        apply(choice)          # choose
        backtrack(state)       # explore
        undo(choice)           # un-choose
```

Typical problems: subsets, permutations, combination sum, N-queens, word search on a grid, generating balanced parentheses.

**Duplicates**: sort first and skip `nums[i] == nums[i-1]` at the same depth (`i > start`).

## Worked examples

### Permutations

```java
void permute(int[] nums, List<Integer> path, boolean[] used, List<List<Integer>> out) {
    if (path.size() == nums.length) { out.add(new ArrayList<>(path)); return; }
    for (int i = 0; i < nums.length; i++) {
        if (used[i]) continue;
        used[i] = true; path.add(nums[i]);
        permute(nums, path, used, out);
        path.remove(path.size() - 1); used[i] = false;
    }
}
```
O(n·n!) time, O(n) depth. Forgetting `new ArrayList<>(path)` stores the same mutable list n! times.

### Generate balanced parentheses

Add `(` while `open < n`, add `)` while `close < open`. The constraints prune invalid prefixes, so only valid strings are built.

## Common misconceptions

- **"Recursion is always slower."** — Same complexity as an explicit stack; constant factors differ slightly.
- **"Record `path` directly."** — You record a reference that later changes; copy it.
- **"Memoization fixes any recursion."** — Only when subproblems overlap; backtracking over permutations has no overlap.

## Practical exercises

1. Write subsets, subsets-with-duplicates and permutations in Java.
2. Solve "combination sum" and explain how you avoid counting `[2,3]` and `[3,2]` twice.
3. Convert a recursive in-order tree traversal into an iterative one with an explicit stack.
