---
slug: two-pointers
title: Two pointers
path: dsa
module: dsa-patterns
order: 1
minutes: 50
depth: full
practice: coding
summary: Move two indices through a sequence so each step eliminates candidates — opposite ends on sorted data, or slow/fast on linked structures.
prerequisites: [arrays-strings]
problems: [linked-list-cycle, merge-intervals]
objectives:
  - Recognize the three two-pointer shapes — converging, same-direction (read/write), and fast/slow
  - Justify why moving a pointer cannot skip a valid answer (the elimination argument)
  - Implement pair-sum on sorted arrays, palindrome checks and in-place filtering without off-by-one errors
readings:
  - title: "cp-algorithms — algorithms for competitive programming (search: two pointers / sorting)"
    url: https://cp-algorithms.com/
    kind: docs
  - title: "MIT 6.006 Introduction to Algorithms (Spring 2020)"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
interview:
  - q: "In sorted Two Sum (two pointers), why is it safe to move the left pointer when the sum is too small?"
    a: "The array is sorted, so pairing a[left] with any element left of `right` gives an even smaller sum; a[left] cannot be part of any valid pair with the remaining candidates, so discarding it loses nothing."
  - q: "How does 3Sum reduce to two pointers, and what is its complexity?"
    a: "Sort, fix each index i, run converging two pointers on the suffix for target −a[i]; skip duplicates. O(n²) time, O(1) extra space besides the sort."
  - q: "When would you use a hash map instead of two pointers for pair problems?"
    a: "When the input is unsorted and you need original indices or can't afford O(n log n) sorting; the hash map gives O(n) time but O(n) space."
selfAssessment:
  - I can state the elimination argument for converging pointers
  - I can write the fast/slow pattern without null-pointer bugs
  - I know when sorting first is acceptable
completion:
  - Score at least 70% on the quiz
  - Solve Linked List Cycle independently
quiz:
  - q: "Converging two pointers on a sorted array to find a pair with sum target runs in:"
    options: ["O(log n)", "O(n)", "O(n log n)", "O(n²)"]
    answer: 1
    why: "Each step moves one pointer inward; at most n steps."
  - q: "Checking whether a string is a palindrome ignoring non-alphanumerics, the cleanest approach is:"
    options: ["Reverse and compare after building a filtered copy", "Two pointers from both ends skipping non-alphanumerics", "Recursion on substrings", "A stack of all characters"]
    answer: 1
    why: "O(n) time and O(1) extra space; the copy approach is O(n) space."
  - q: "Fast/slow pointers find the middle of a linked list because:"
    options: ["fast moves two steps per slow step, so when fast reaches the end slow is halfway", "fast is always one node ahead", "slow restarts at the head", "It uses the list length"]
    answer: 0
    why: "Relative speed 2:1 means slow covers half the distance."
explain:
  prompt: "Explain the two-pointer technique for finding a pair with a given sum in a sorted array, including why it is correct."
  rubric:
    - "Starts with left at 0 and right at n−1"
    - "Moves left right when the sum is too small, right left when too large"
    - "Gives the elimination argument: the discarded element cannot form a valid pair with remaining candidates"
    - "States O(n) time and O(1) space and mentions the sorting requirement or cost"
  model: "Put one pointer at each end. If a[l] + a[r] equals the target we're done. If the sum is too small, a[l] paired with any remaining element — all at most a[r] — is also too small, so a[l] can't be in any answer and we move l right. Symmetrically, if the sum is too large, a[r] can't pair with anything ≥ a[l], so we move r left. Every step discards one element for good, so it's O(n) time and O(1) extra space. It requires sorted input; if the array isn't sorted, sorting costs O(n log n) and loses original indices, and a hash map gives O(n) time with O(n) space instead."
cards:
  - q: "Three two-pointer shapes"
    a: "Converging (sorted pair problems), read/write same direction (in-place filtering), fast/slow (cycles, middle of list)."
  - q: "Why converging pointers are correct"
    a: "Each move discards an element that cannot be part of any remaining valid pair."
  - q: "3Sum complexity"
    a: "O(n²) time after O(n log n) sort; skip duplicates at each pointer."
---

## Explanation

Two pointers is about **eliminating candidates without checking them explicitly**. Instead of examining all O(n²) pairs, each pointer move proves that a whole group of pairs can't be the answer.

### Shape 1 — converging (opposite ends)

Used on **sorted** arrays or symmetric checks:

```text
l = 0, r = n − 1
while l < r:
    if good(l, r): record / return
    elif need_bigger: l += 1
    else: r -= 1
```

Problems: pair with target sum, container with most water, palindromes, 3Sum (after sorting and fixing one element), squares of a sorted array.

### Shape 2 — same direction (read/write)

A **read** pointer scans every element; a **write** pointer marks where the next kept element goes. Classic for in-place filtering: remove duplicates, remove element, move zeros, merge two sorted arrays (from the back).

### Shape 3 — fast and slow

On linked lists or implicit sequences (e.g. `next = f(x)`):
- **Cycle detection** (Floyd) — fast moves 2, slow moves 1; they meet iff there's a cycle.
- **Middle of a list** — when fast reaches the end, slow is in the middle.
- **Nth from the end** — start fast n steps ahead, then move both.

### Correctness

Always be ready to explain **why a move can't skip the answer**. For converging pointers on sorted input, it's the monotonicity argument above. For fast/slow, it's the relative-speed argument (the gap shrinks by one each step inside a cycle).

## Worked examples

### Example 1 — container with most water

```java
int maxArea(int[] h) {
    int l = 0, r = h.length - 1, best = 0;
    while (l < r) {
        best = Math.max(best, Math.min(h[l], h[r]) * (r - l));
        if (h[l] < h[r]) l++; else r--;
    }
    return best;
}
```
Why move the shorter side? The area is limited by the shorter line; moving the taller one can only shrink the width without raising the limit, so no better container uses the shorter line with any remaining partner.

### Example 2 — merge sorted arrays in place (from the back)

```python
def merge(a, m, b, n):   # a has length m + n with free space at the end
    i, j, k = m - 1, n - 1, m + n - 1
    while j >= 0:
        if i >= 0 and a[i] > b[j]:
            a[k] = a[i]; i -= 1
        else:
            a[k] = b[j]; j -= 1
        k -= 1
```
Writing from the back avoids overwriting unread elements of `a`.

## Common misconceptions

- **"Two pointers works on unsorted arrays for pair sums."** — Converging pointers need sorted order (or another monotonic property).
- **"Moving either pointer is fine."** — The move must be justified; container-with-water moves the *shorter* side for a reason.
- **"`while (l <= r)` vs `<` doesn't matter."** — For pairs you need two distinct elements, so `l < r`.
- **"Fast/slow requires knowing the length."** — It doesn't; that's its point.

## Practical exercises

1. Solve **Linked List Cycle**, then extend it to return the node where the cycle starts.
2. Implement sorted Two Sum with pointers and compare with the hash-map solution: when would you prefer each?
3. Implement 3Sum with duplicate skipping in Java.
4. Solve **Merge Intervals** and identify where the sweep acts like a write pointer.
