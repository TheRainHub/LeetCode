---
slug: binary-search
title: Binary search
path: dsa
module: dsa-patterns
order: 3
minutes: 55
depth: full
practice: coding
summary: Search any monotonic predicate in O(log n) with one consistent interval convention — the template behind dozens of interview problems.
prerequisites: [complexity, arrays-strings]
problems: [binary-search]
objectives:
  - Write exact-match binary search and lower/upper-bound searches without off-by-one errors
  - Reformulate problems as 'first index where a monotonic predicate becomes true'
  - Apply binary search on the answer space (capacity, speed, minimum maximum)
  - Prove termination and correctness with a loop invariant
readings:
  - title: "cp-algorithms — Binary search"
    url: https://cp-algorithms.com/num_methods/binary_search.html
    kind: docs
  - title: "Java SE 21 API — Arrays.binarySearch"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html
    kind: docs
  - title: "Python docs — bisect module"
    url: https://docs.python.org/3/library/bisect.html
    kind: docs
interview:
  - q: "How do you find the first occurrence of a target in a sorted array with duplicates?"
    a: "Lower bound: find the first index with a[i] ≥ target using a half-open [lo, hi) search (hi = mid when a[mid] ≥ target, else lo = mid + 1), then check a[lo] == target."
  - q: "What is 'binary search on the answer'?"
    a: "When feasibility is monotonic in a parameter (e.g. 'can we ship in D days with capacity c' is true for all c ≥ some threshold), binary-search that parameter, calling a feasibility check each step: O(log(range) × cost(check))."
  - q: "Search in a rotated sorted array — key idea?"
    a: "At each mid, one half is sorted; check whether the target lies within the sorted half's range to decide which half to keep. O(log n) for distinct values."
selfAssessment:
  - I can write lower bound from memory in my interview language
  - I can explain the invariant of my chosen interval convention
  - I can recognise 'minimise the maximum' problems as binary search on the answer
completion:
  - Score at least 70% on the quiz
  - Solve Binary Search independently and explain the invariant
quiz:
  - q: "With a closed interval [lo, hi], the loop condition should be:"
    options: ["lo < hi", "lo <= hi", "lo + 1 < hi", "hi - lo > 1"]
    answer: 1
    why: "The interval is non-empty while lo ≤ hi; with lo < hi the last candidate is never checked."
  - q: "Why write mid = lo + (hi − lo) / 2 instead of (lo + hi) / 2 in Java?"
    options: ["It's faster", "It avoids int overflow when lo + hi exceeds 2^31 − 1", "It rounds up", "Style only"]
    answer: 1
    why: "lo + hi can overflow for large indices (a famous JDK bug)."
  - q: "Koko eating bananas (minimum speed to finish in h hours) is solved by:"
    options: ["Greedy sorting", "Binary search over speed with a feasibility check", "DP over piles", "Heap of piles"]
    answer: 1
    why: "Feasibility is monotonic: any speed above a feasible speed is feasible."
  - q: "In the half-open template [lo, hi) for lower bound, when a[mid] ≥ target you set:"
    options: ["hi = mid − 1", "hi = mid", "lo = mid", "lo = mid + 1"]
    answer: 1
    why: "mid itself might be the answer, so it must stay in [lo, hi)."
explain:
  prompt: "Explain how you'd find the first position where a monotonic condition becomes true (lower bound), and why your loop terminates and is correct."
  rubric:
    - "Defines the predicate as false…false true…true over the search space"
    - "Chooses a convention (e.g. half-open [lo, hi)) and states its invariant"
    - "Updates: predicate(mid) true → hi = mid, false → lo = mid + 1"
    - "Termination: interval strictly shrinks each iteration; ends with lo == hi as the answer"
    - "Mentions overflow-safe mid and handling 'no true value' (lo == n)"
  model: "I treat the search space as a predicate that is false for a prefix and true for the rest, and I want the first true index. I use a half-open interval [lo, hi) with lo = 0 and hi = n, and the invariant that the answer is always inside [lo, hi], where hi = n means 'not found'. While lo < hi I compute mid = lo + (hi − lo) / 2. If the predicate holds at mid, the first true index is mid or earlier, so hi = mid; otherwise it's after mid, so lo = mid + 1. Each step strictly shrinks the interval, so the loop ends with lo == hi, which is the first true index, or n if none is true. That's O(log n) predicate evaluations."
cards:
  - q: "Lower-bound template (half-open)"
    a: "lo=0, hi=n; while lo<hi: mid; if pred(mid) hi=mid else lo=mid+1; return lo."
  - q: "Binary search on the answer: requirement"
    a: "Feasibility must be monotonic in the parameter."
  - q: "Overflow-safe midpoint"
    a: "mid = lo + (hi − lo) / 2."
---

## Explanation

Binary search finds a boundary in a **monotonic** search space in O(log n) steps by halving the candidate range each time. "Sorted array" is just the most common monotonic space.

### Pick one convention and stick to it

**Closed interval `[lo, hi]`** (exact match):
```text
lo = 0, hi = n − 1
while lo <= hi:
    mid = lo + (hi − lo) / 2
    if a[mid] == t: return mid
    if a[mid] < t: lo = mid + 1 else hi = mid − 1
return −1
```

**Half-open `[lo, hi)`** (boundaries: first index with `a[i] ≥ t`):
```text
lo = 0, hi = n
while lo < hi:
    mid = lo + (hi − lo) / 2
    if a[mid] >= t: hi = mid else lo = mid + 1
return lo        # n if every element < t
```

Mixing the two is the #1 cause of infinite loops (`lo = mid` with `mid` rounding down) and skipped candidates.

### The predicate view

Most binary-search problems become: *find the first x where `ok(x)` is true*, where `ok` is false…false true…true.

| Problem | Search space | Predicate |
|---|---|---|
| First bad version | versions | `isBad(v)` |
| Insert position | indices | `a[i] ≥ target` |
| Sqrt(x) floor | integers 0..x | `m·m > x` (then answer − 1) |
| Ship packages in D days | capacity | `canShip(c, D)` |
| Rotated array minimum | indices | `a[i] ≤ a[n−1]` |

### Binary search on the answer

When asked to *minimise the maximum* or find the *smallest value that works*, search the answer range `[low, high]` and check feasibility with a greedy O(n) scan: total O(n log(range)).

### Language tools

Java `Arrays.binarySearch` returns `-(insertionPoint) − 1` when not found and gives no guarantee about which duplicate it finds. Python `bisect_left`/`bisect_right` are lower/upper bounds. Know them, but be able to write the loop yourself.

## Worked examples

### Example 1 — first and last position of target

```java
int lower(int[] a, int t) {           // first index with a[i] >= t
    int lo = 0, hi = a.length;
    while (lo < hi) { int mid = lo + (hi - lo) / 2; if (a[mid] >= t) hi = mid; else lo = mid + 1; }
    return lo;
}
int[] searchRange(int[] a, int t) {
    int first = lower(a, t);
    if (first == a.length || a[first] != t) return new int[]{-1, -1};
    return new int[]{first, lower(a, t + 1) - 1};
}
```

### Example 2 — capacity to ship within D days

```python
def ship_within_days(weights, days):
    def feasible(cap):
        need, cur = 1, 0
        for w in weights:
            if cur + w > cap:
                need, cur = need + 1, 0
            cur += w
        return need <= days
    lo, hi = max(weights), sum(weights)
    while lo < hi:
        mid = (lo + hi) // 2
        if feasible(mid): hi = mid
        else: lo = mid + 1
    return lo
```
Lower bound is `max(weights)` (every package must fit), upper bound is the total.

## Common misconceptions

- **"Binary search only works on sorted arrays."** — It works on any monotonic predicate, including answer spaces.
- **"`lo = mid` is fine."** — With `mid` rounding down and `hi = lo + 1`, the loop never ends.
- **"Java's binarySearch finds the first duplicate."** — It finds *some* matching index.
- **"Recursion is cleaner."** — Iterative avoids O(log n) stack frames and is what most interviewers expect.

## Practical exercises

1. Solve **Binary Search** with the closed convention, then rewrite it with half-open and compare.
2. Implement `searchRange` using two lower-bound calls.
3. Solve "find minimum in rotated sorted array" and explain why comparing with `a[hi]` is safe.
4. Solve "Koko eating bananas": write the feasibility function first, then the search.
