---
slug: arrays-strings
title: Arrays and strings
path: dsa
module: dsa-foundations
order: 2
minutes: 60
depth: full
practice: coding
summary: Memory layout, the cost of common operations, immutability of strings, and the in-place techniques interviewers expect.
prerequisites: [complexity]
problems: [best-time-to-buy-and-sell-stock, group-anagrams, merge-intervals]
objectives:
  - Explain why indexed access is O(1) and insertion/removal in the middle is O(n)
  - Avoid accidental O(n²) string building in Java, Python and TypeScript
  - Apply prefix sums, frequency counting and in-place overwrite techniques
  - Handle edge cases deliberately — empty input, single element, duplicates, negative values
readings:
  - title: "Java SE 21 API — java.util.Arrays"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/Arrays.html
    kind: docs
  - title: "Java SE 21 API — StringBuilder"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/StringBuilder.html
    kind: docs
  - title: "MDN — Array (JavaScript reference)"
    url: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Array
    kind: docs
interview:
  - q: "Why is s = s + c inside a loop slow in Java, and what do you use instead?"
    a: "Strings are immutable, so each concatenation copies the whole string: O(n²) total. Use StringBuilder (amortized O(1) append), then toString() once."
  - q: "How do you remove duplicates from a sorted array in place?"
    a: "Two indices: a write pointer and a read pointer. Copy nums[read] to nums[write] when it differs from nums[write−1]. O(n) time, O(1) extra space; return the new length."
  - q: "What is a prefix sum and when does it help?"
    a: "prefix[i] = sum of the first i elements; any range sum is prefix[r+1] − prefix[l] in O(1) after O(n) preprocessing. Combined with a hash map it counts subarrays with a given sum in O(n)."
selfAssessment:
  - I know the cost of insert, delete, search and access for arrays and dynamic arrays
  - I can build strings efficiently in all three interview languages
  - I can apply prefix sums to range-sum and subarray-sum problems
completion:
  - Score at least 70% on the quiz
  - Solve Best Time to Buy and Sell Stock independently with passing tests
  - Explain prefix sums in interview mode
quiz:
  - q: "Inserting an element at index 0 of an ArrayList of size n costs:"
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"]
    answer: 2
    why: "Every existing element shifts one position to the right."
  - q: "Which is the idiomatic O(n) way to build a large string in Python?"
    options: ["s += part in a loop", "''.join(parts)", "s = s.__add__(part)", "Using f-strings in a loop"]
    answer: 1
    why: "join computes the final size once and copies each part once. CPython sometimes optimizes +=, but you cannot rely on it."
  - q: "Number of subarrays summing to k (with negative numbers allowed) is best solved with:"
    options: ["Sliding window", "Prefix sums + hash map of counts", "Sorting + two pointers", "Binary search"]
    answer: 1
    why: "Negatives break the sliding-window monotonicity. Count how many earlier prefix sums equal current − k."
  - q: "In Java, what does Arrays.asList(intArray) return for an int[]?"
    options: ["A List<Integer> of the elements", "A List<int[]> with a single element", "A compile error", "An IntStream"]
    answer: 1
    why: "Generics don't work with primitives, so the int[] itself becomes the single element. Use Arrays.stream(a).boxed() instead."
explain:
  prompt: "Explain prefix sums: what they are, how you build them, and how they let you answer 'sum of subarray [l, r]' and 'count subarrays with sum k' efficiently."
  rubric:
    - "Defines prefix[i] as the sum of the first i elements (with prefix[0] = 0)"
    - "Range sum [l, r] = prefix[r+1] − prefix[l] in O(1) after O(n) build"
    - "For 'sum equals k', looks for earlier prefix sums equal to current − k"
    - "Uses a hash map of prefix-sum counts initialized with {0: 1}"
    - "States O(n) time and O(n) space and why sliding window fails with negatives"
  model: "A prefix-sum array stores running totals: prefix[0] = 0 and prefix[i+1] = prefix[i] + a[i]. Building it is O(n). Then the sum of a[l..r] is prefix[r+1] − prefix[l], O(1) per query. To count subarrays summing to k, walk the array keeping the running sum s and a hash map from prefix sums to how often they occurred, starting with {0: 1}. A subarray ending here sums to k exactly when some earlier prefix equals s − k, so add count[s − k] to the answer, then record s. That is O(n) time and O(n) space. A sliding window doesn't work here because with negative numbers, extending the window can decrease the sum, so you can't decide which pointer to move."
cards:
  - q: "Cost of ArrayList insert at the front / middle"
    a: "O(n) — elements shift."
  - q: "Subarray sum equals k (negatives allowed): technique"
    a: "Prefix sums + hash map of counts, initialised {0: 1}; O(n) time and space."
  - q: "Efficient string building in Java / Python / JS"
    a: "StringBuilder / ''.join(list) / array.join('') — avoid repeated concatenation."
---

## Explanation

### Memory layout

An array is a **contiguous block of memory**. Element `i` lives at `base + i × elementSize`, so indexed access is O(1) and iteration is cache-friendly. The price: inserting or removing anywhere except the end shifts elements — O(n).

A **dynamic array** (Java `ArrayList`, Python `list`, JS `Array`) wraps a fixed array with spare capacity and grows geometrically, giving amortized O(1) append.

| Operation | Static array | Dynamic array |
|---|---|---|
| Access `a[i]` | O(1) | O(1) |
| Append | — | O(1) amortized |
| Insert/delete at i | O(n) | O(n) |
| Search unsorted | O(n) | O(n) |
| Search sorted | O(log n) | O(log n) |

In Java, `int[]` stores primitives inline, while `ArrayList<Integer>` stores references to boxed `Integer` objects — more memory, worse locality. Prefer primitive arrays in performance-sensitive code.

### Strings

Strings are **immutable** in Java, Python and JavaScript. Every "modification" creates a new string, so building a string with repeated concatenation is O(n²).

- Java: `StringBuilder`; convert `char[]` ↔ `String` with `toCharArray()` / `new String(chars)`.
- Python: collect parts in a list and `''.join(parts)`.
- TypeScript: push to an array and `join("")`.

Character counting: for lowercase English letters use `int[26]` indexed by `c - 'a'` — faster and smaller than a hash map. For Unicode use a map.

### Core techniques

1. **Frequency counting** — anagrams, first unique character, majority element.
2. **Prefix sums** — range queries and subarray-sum counting.
3. **In-place overwrite with a write pointer** — remove duplicates, move zeros, filter elements, all in O(1) extra space.
4. **Running state in one pass** — keep min-so-far / max-so-far (stock profit, Kadane's maximum subarray).
5. **Sorting first** — groups equal elements and enables two pointers (intervals, 3Sum), at O(n log n).

### Edge-case checklist

Empty array/string, single element, all equal elements, negative numbers and zero, very large values (overflow in Java `int` sums — use `long`), already sorted / reverse sorted input.

## Worked examples

### Example 1 — move zeros in place

```java
void moveZeroes(int[] nums) {
    int write = 0;
    for (int read = 0; read < nums.length; read++)
        if (nums[read] != 0) nums[write++] = nums[read];
    while (write < nums.length) nums[write++] = 0;
}
```
Invariant: `nums[0..write)` holds the non-zero elements seen so far, in order. O(n) time, O(1) space.

### Example 2 — Kadane's algorithm (maximum subarray)

```python
def max_subarray(nums):
    best = cur = nums[0]
    for x in nums[1:]:
        cur = max(x, cur + x)   # extend or restart
        best = max(best, cur)
    return best
```
At each index decide: does the best subarray ending here extend the previous one or start fresh? O(n), O(1). Initialising with `nums[0]` (not 0) handles all-negative arrays.

### Example 3 — count subarrays with sum k

```typescript
function subarraySum(nums: number[], k: number): number {
  const seen = new Map<number, number>([[0, 1]]);
  let sum = 0, count = 0;
  for (const x of nums) {
    sum += x;
    count += seen.get(sum - k) ?? 0;
    seen.set(sum, (seen.get(sum) ?? 0) + 1);
  }
  return count;
}
```

## Common misconceptions

- **"Arrays.asList(int[]) gives a list of ints."** — It gives a list containing one `int[]`.
- **"String concatenation in a loop is fine."** — It is O(n²) in general.
- **"Sliding window solves every subarray-sum problem."** — Only when values are non-negative (monotonic window sums).
- **"Sorting is free."** — It is O(n log n) and destroys original indices; keep (value, index) pairs if you need them.
- **"int is big enough."** — Sum of 10^5 values up to 10^9 overflows a 32-bit int.

## Practical exercises

1. Solve **Best Time to Buy and Sell Stock** and explain the one-pass invariant.
2. Solve **Group Anagrams** with both the sorted-key and the count-key approach; compare complexities.
3. Solve **Merge Intervals** and explain why sorting by start is enough.
4. Implement `moveZeroes` and `removeDuplicates` (sorted array) in Java without looking at the examples.
