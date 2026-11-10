---
slug: sorting
title: Sorting algorithms and when they matter
path: dsa
module: dsa-techniques
order: 1
minutes: 40
depth: concise
practice: coding
summary: What the library sort guarantees, the classic algorithms' trade-offs, and sorting as a preprocessing step that unlocks simpler solutions.
prerequisites: [complexity, arrays-strings]
problems: [merge-intervals]
objectives:
  - Compare merge sort, quicksort, heapsort and counting sort by time, space and stability
  - Know what Java, Python and JavaScript sorts guarantee
  - Use sorting with custom comparators to simplify interval and greedy problems
readings:
  - title: "Java SE 21 API — Arrays.sort"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html
    kind: docs
  - title: "Python docs — Sorting HOW TO"
    url: https://docs.python.org/3/howto/sorting.html
    kind: docs
  - title: "MDN — Array.prototype.sort"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array/sort
    kind: docs
interview:
  - q: "What is a stable sort and when does it matter?"
    a: "Equal keys keep their original relative order. It matters when sorting by multiple keys in passes (sort by secondary, then stable-sort by primary) or when records carry other data."
  - q: "Why can quicksort be O(n²) and how is that avoided?"
    a: "Bad pivots (e.g. first element on sorted input) split n into n−1 and 0. Randomised or median-of-three pivots, or introsort (switch to heapsort), avoid it in practice."
selfAssessment:
  - I can implement merge sort from memory
  - I know which built-in sorts are stable
completion:
  - Score at least 70% on the quiz
  - Solve Merge Intervals with a correct comparator
quiz:
  - q: "Java's Arrays.sort on an int[] uses:"
    options: ["Stable merge sort", "Dual-pivot quicksort (not stable)", "Heapsort", "Counting sort"]
    answer: 1
    why: "Primitives use dual-pivot quicksort; object arrays use TimSort, which is stable."
  - q: "JavaScript [10, 9, 1].sort() returns:"
    options: ["[1, 9, 10]", "[1, 10, 9]", "[10, 9, 1]", "An error"]
    answer: 1
    why: "The default comparator compares strings. Use sort((a, b) => a - b)."
  - q: "Counting sort is O(n + k) and beats O(n log n) when:"
    options: ["Keys are arbitrary strings", "Keys are integers in a small range k", "The data is already sorted", "Never"]
    answer: 1
    why: "It indexes an array by key value."
explain:
  prompt: "Explain merge sort and quicksort: how they work, their complexity, space usage and stability."
  rubric:
    - "Merge sort: split in half, sort recursively, merge — O(n log n) always"
    - "Merge sort needs O(n) extra space and is stable"
    - "Quicksort: partition around a pivot, recurse — O(n log n) average, O(n²) worst"
    - "Quicksort is in place (O(log n) stack) and not stable; pivot choice matters"
  model: "Merge sort splits the array in half, sorts both halves recursively and merges them in linear time, so T(n) = 2T(n/2) + O(n) = O(n log n) in every case. Merging needs an O(n) buffer, and taking from the left half on ties makes it stable. Quicksort partitions around a pivot so smaller elements go left and larger right, then recurses on both parts. With good pivots that's O(n log n) on average, but consistently bad pivots — like the first element of sorted input — give O(n²), which randomised or median-of-three pivots avoid. It sorts in place using O(log n) stack on average and isn't stable, which is why Java uses it for primitives but stable TimSort for objects."
cards:
  - q: "Stable built-in sorts"
    a: "Java object sort (TimSort), Python sorted/list.sort, JS Array.sort (ES2019+). Java primitive sort is not stable."
  - q: "Merge sort vs quicksort space"
    a: "Merge O(n) extra; quicksort O(log n) stack, in place."
  - q: "JS numeric sort"
    a: "arr.sort((a, b) => a - b) — the default compares strings."
---

## Explanation

| Algorithm | Best | Average | Worst | Extra space | Stable |
|---|---|---|---|---|---|
| Merge sort | n log n | n log n | n log n | O(n) | yes |
| Quicksort | n log n | n log n | n² | O(log n) | no |
| Heapsort | n log n | n log n | n log n | O(1) | no |
| Insertion sort | n | n² | n² | O(1) | yes |
| Counting/radix | n + k | n + k | n + k | O(n + k) | yes |

Comparison sorts can't beat Ω(n log n) in the worst case; counting and radix sort escape the bound by exploiting the key structure.

**Built-ins**: Java `Arrays.sort(int[])` → dual-pivot quicksort; `Arrays.sort(Object[])`/`Collections.sort` → TimSort (stable, O(n) on nearly sorted input). Python → TimSort. JS `Array.prototype.sort` → stable since ES2019, but compares **strings** by default.

### Sorting as a preprocessing step

Sorting often turns a hard problem into a scan: merge intervals, meeting rooms, 3Sum, deduplication, grouping anagrams (sort characters), greedy scheduling (sort by end time). Mention the O(n log n) cost and whether you may mutate the input.

### Comparators without bugs

- Java: `Comparator.comparingInt(a -> a[0]).thenComparingInt(a -> a[1])`, or `Integer.compare(x, y)` — never `x - y` for arbitrary ints.
- Python: `key=lambda iv: (iv[0], -iv[1])`.

## Worked examples

### Merge sort

```python
def merge_sort(a):
    if len(a) <= 1: return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]: out.append(left[i]); i += 1     # <= keeps it stable
        else: out.append(right[j]); j += 1
    return out + left[i:] + right[j:]
```

### Quickselect (k-th smallest in O(n) average)

Partition around a random pivot; recurse only into the side containing index k. Average O(n), worst O(n²); useful for "k-th largest" and "top k" without full sorting.

## Common misconceptions

- **"All library sorts are stable."** — Not Java's primitive sort.
- **"Quicksort is always O(n log n)."** — Average only.
- **"`(a, b) -> a - b` is a safe comparator."** — Overflows for large magnitudes.

## Practical exercises

1. Implement merge sort and quicksort (Lomuto or Hoare partition) in Java.
2. Solve **Merge Intervals** and "meeting rooms" (can a person attend all meetings?).
3. Implement quickselect for "k-th largest element".
