---
slug: sliding-window
title: Sliding window
path: dsa
module: dsa-patterns
order: 2
minutes: 55
depth: full
practice: coding
summary: Maintain a contiguous window and its summary state incrementally, growing the right edge and shrinking the left only as far as needed.
prerequisites: [two-pointers, hashmap-hashset]
problems: [longest-substring-without-repeating-characters, best-time-to-buy-and-sell-stock]
objectives:
  - Identify problems where a contiguous window with a monotonic validity condition applies
  - Implement fixed-size and variable-size windows with O(1) incremental state updates
  - Explain why the total work is O(n) even with a nested while loop
  - Know when sliding window fails (e.g. negative numbers for sum constraints)
readings:
  - title: "MDN — Map (useful for window state in TypeScript)"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map
    kind: docs
  - title: "Open Data Structures"
    url: https://opendatastructures.org/
    kind: book
interview:
  - q: "Why is a variable-size sliding window O(n) if it has a while loop inside a for loop?"
    a: "Both pointers only move forward and each moves at most n times, so the total number of iterations of both loops combined is at most 2n."
  - q: "What property must the window condition have for the shrinking approach to work?"
    a: "Monotonicity: if a window is invalid, every larger window containing it is also invalid (or, for 'at least' problems, every larger window stays valid). That lets you shrink greedily."
  - q: "Longest substring with at most k distinct characters — outline it."
    a: "Expand right, count characters in a map; while the map has more than k keys, decrement left's count and remove zero entries; track max(right − left + 1). O(n) time, O(k) space."
selfAssessment:
  - I can tell fixed and variable windows apart from the problem statement
  - I can explain the monotonicity requirement
  - I implement shrink conditions without off-by-one errors
completion:
  - Score at least 70% on the quiz
  - Solve Longest Substring Without Repeating Characters independently
  - Explain the O(n) argument in interview mode
quiz:
  - q: "Maximum sum of any subarray of exactly k elements is a:"
    options: ["Variable window", "Fixed window: add the entering element, subtract the leaving one", "Binary search problem", "DP over all subarrays"]
    answer: 1
    why: "The window size never changes; O(n) with O(1) updates."
  - q: "Minimum length subarray with sum ≥ target works with sliding window when:"
    options: ["Values may be negative", "All values are positive", "The array is sorted", "Target is zero"]
    answer: 1
    why: "Positivity makes the sum monotonic in the window size, so shrinking is safe."
  - q: "In 'longest substring without repeats', what goes wrong if you reset left to right+1 on a duplicate?"
    options: ["Nothing", "You skip valid windows such as in 'dvdf'", "It becomes O(n²)", "It fails on empty strings only"]
    answer: 1
    why: "The new window should start right after the previous occurrence of the duplicate, not after the current index."
explain:
  prompt: "Explain the variable-size sliding window pattern using 'longest substring without repeating characters', including the invariant and complexity."
  rubric:
    - "Window [left, right] always contains no duplicates (the invariant)"
    - "Expand right each step; on a duplicate, move left past the previous occurrence"
    - "Uses a map/array of last-seen indices or counts to update in O(1)"
    - "Handles stale occurrences left of the window (e.g. 'abba')"
    - "Total work O(n) because pointers only move forward; space O(alphabet)"
  model: "I keep a window s[left..right] that never contains a repeated character. For each new right, if s[right] was last seen at an index inside the window, I move left to one past that index; otherwise the window just grows. A map from character to last index makes that O(1), and I check the stored index is ≥ left so stale occurrences, like the first 'a' in 'abba', don't move left backwards. After each step the window is valid, so I update the best length. Both pointers only move forward, so it's O(n) time, and the map holds at most one entry per distinct character."
cards:
  - q: "Sliding window prerequisite"
    a: "Contiguous range + monotonic validity (invalid windows stay invalid when extended)."
  - q: "Why sliding window is O(n)"
    a: "Each pointer moves forward at most n times; total 2n moves."
  - q: "Subarray sum = k with negatives"
    a: "Not a sliding window — use prefix sums + hash map."
---

## Explanation

A **window** is a contiguous range `[left, right]`. Instead of recomputing state for every subarray (O(n²) or worse), you **update state incrementally** as edges move.

### Fixed-size window

```text
state = summary of first k elements
for right in k..n-1:
    state += a[right]; state -= a[right - k]
    answer = best(answer, state)
```
Examples: max sum of k consecutive elements, averages, anagram occurrence (permutation in string) with a 26-count array.

### Variable-size window

```text
left = 0
for right in 0..n-1:
    add a[right] to state
    while window is invalid:      # or "while window is still valid" for minimum problems
        remove a[left] from state; left += 1
    update answer with window [left, right]
```

- **Longest valid window**: shrink while invalid, then record.
- **Shortest valid window**: while valid, record, then shrink.

### The monotonicity requirement

Shrinking greedily is correct only if validity is monotonic. "Sum ≥ target" is monotonic for positive numbers (a larger window has a larger sum). With negative numbers, it isn't — use prefix sums instead.

### State choices

| State | Use |
|---|---|
| running sum | sum constraints |
| `int[26]` / `int[128]` counts | character problems over a small alphabet |
| hash map of counts | general values; track number of distinct keys |
| last-seen index map | jump `left` directly instead of shrinking step by step |
| monotonic deque | sliding-window maximum/minimum in O(n) |

## Worked examples

### Example 1 — minimum window with sum ≥ target (positive values)

```java
int minSubArrayLen(int target, int[] nums) {
    int left = 0, sum = 0, best = Integer.MAX_VALUE;
    for (int right = 0; right < nums.length; right++) {
        sum += nums[right];
        while (sum >= target) {
            best = Math.min(best, right - left + 1);
            sum -= nums[left++];
        }
    }
    return best == Integer.MAX_VALUE ? 0 : best;
}
```

### Example 2 — permutation in string (fixed window with counts)

```python
def check_inclusion(p: str, s: str) -> bool:
    if len(p) > len(s): return False
    need, have = [0] * 26, [0] * 26
    for c in p: need[ord(c) - 97] += 1
    for i, c in enumerate(s):
        have[ord(c) - 97] += 1
        if i >= len(p): have[ord(s[i - len(p)]) - 97] -= 1
        if have == need: return True
    return False
```
Comparing two 26-element arrays is O(26) = O(1) per step.

### Example 3 — sliding window maximum (monotonic deque)

Keep indices in a deque with decreasing values; pop from the back while the new value is larger, pop from the front when it falls out of the window. Each index is pushed and popped once → O(n).

## Common misconceptions

- **"The inner while makes it O(n²)."** — Count total pointer moves.
- **"Sliding window handles any sum constraint."** — Not with negative numbers.
- **"Shrink one step at a time is required."** — With a last-seen map you can jump `left` directly; just never move it backwards.
- **"Record the answer anywhere in the loop."** — For "longest" record after restoring validity; for "shortest" record while valid, before shrinking.

## Practical exercises

1. Solve **Longest Substring Without Repeating Characters** in two ways: shrinking with a set, and jumping with last-seen indices.
2. Solve "longest substring with at most k distinct characters" and test with k = 0.
3. Implement sliding-window maximum with a deque in Java (`ArrayDeque<Integer>`).
4. Explain why **Best Time to Buy and Sell Stock** is a degenerate window (min-so-far as the left edge).
