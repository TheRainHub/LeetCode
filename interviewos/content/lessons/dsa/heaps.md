---
slug: heaps
title: Heaps and priority queues
path: dsa
module: dsa-trees-graphs
order: 2
minutes: 50
depth: full
practice: coding
summary: Binary heaps give O(log n) insert and extract-min — the tool for top-k, merging sorted streams and scheduling.
prerequisites: [trees, complexity]
problems: [top-k-frequent-elements]
objectives:
  - Explain the heap property, array representation and sift-up/sift-down
  - Know the complexity of insert, extract, peek and heapify (O(n) build)
  - Apply a size-k heap for top-k problems and a heap of iterators for k-way merge
  - Use PriorityQueue (Java), heapq (Python) correctly, including comparators
readings:
  - title: "Java SE 21 API — PriorityQueue"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/PriorityQueue.html
    kind: docs
  - title: "Python docs — heapq"
    url: https://docs.python.org/3/library/heapq.html
    kind: docs
  - title: "Open Data Structures — heaps chapter"
    url: https://opendatastructures.org/
    kind: book
interview:
  - q: "Why use a min-heap of size k to find the k largest elements?"
    a: "The root is the smallest of the current top-k, i.e. the one to evict when a larger element arrives. Each operation is O(log k), total O(n log k) with O(k) memory — good for streams."
  - q: "What is the complexity of building a heap from n elements?"
    a: "O(n) with bottom-up heapify: most nodes are near the leaves and sift down only a few levels; the sum is bounded by 2n."
  - q: "How do you find the median of a data stream?"
    a: "Two heaps: a max-heap for the lower half and a min-heap for the upper half, balanced so sizes differ by at most one. Insert O(log n), median O(1)."
selfAssessment:
  - I can draw sift-down on an array-backed heap
  - I can write a Java PriorityQueue comparator without overflow bugs
  - I can explain the two-heap median approach
completion:
  - Score at least 70% on the quiz
  - Solve Top K Frequent Elements independently
quiz:
  - q: "In an array-based binary heap, the children of index i are at:"
    options: ["i+1 and i+2", "2i+1 and 2i+2", "i/2 and i/2+1", "2i and 2i−1"]
    answer: 1
    why: "Zero-based layout: parent (i−1)/2, children 2i+1 and 2i+2."
  - q: "PriorityQueue.remove(Object o) in Java costs:"
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"]
    answer: 2
    why: "It must first find the element linearly; only poll()/offer() are O(log n)."
  - q: "Merging k sorted lists with a heap costs (N total elements):"
    options: ["O(N k)", "O(N log k)", "O(N log N)", "O(k log N)"]
    answer: 1
    why: "The heap holds at most k heads; each of N pops/pushes costs O(log k)."
  - q: "Python's heapq is a:"
    options: ["Max-heap", "Min-heap", "Balanced BST", "Fibonacci heap"]
    answer: 1
    why: "Negate keys (or use tuples) to simulate a max-heap."
explain:
  prompt: "Explain how a binary heap works and why a min-heap of size k solves 'k largest elements' efficiently."
  rubric:
    - "Heap property: parent ≤ children (min-heap); root is the minimum"
    - "Complete tree stored in an array with index arithmetic"
    - "Insert sifts up, extract-min sifts down: O(log n)"
    - "Size-k min-heap: push each element, pop when size exceeds k; root is the weakest of the top-k"
    - "Complexity O(n log k) time, O(k) space; contrast with sorting O(n log n)"
  model: "A binary min-heap is a complete binary tree where each parent is ≤ its children, so the root is the minimum. Because it's complete, it lives in an array: children of i are 2i+1 and 2i+2. Insert appends and sifts up; extract-min moves the last element to the root and sifts down; both are O(log n), and peek is O(1). For the k largest elements I keep a min-heap of at most k items: push each element, and when the size exceeds k pop the root. The root is always the smallest of the current top k, exactly the one to discard. That's O(n log k) time and O(k) memory, better than sorting when k is much smaller than n, and it works on streams."
cards:
  - q: "Heap operation costs"
    a: "insert/extract O(log n), peek O(1), build O(n), arbitrary remove O(n)."
  - q: "Top-k largest"
    a: "Min-heap of size k: O(n log k)."
  - q: "Median of a stream"
    a: "Max-heap (low half) + min-heap (high half), sizes balanced."
---

## Explanation

A **binary heap** is a complete binary tree with the heap property (min-heap: each parent ≤ its children). It's stored in an array without pointers:

```text
parent(i) = (i − 1) / 2     left(i) = 2i + 1     right(i) = 2i + 2
```

| Operation | Cost | How |
|---|---|---|
| peek | O(1) | root |
| insert (offer/push) | O(log n) | append, sift up |
| extract (poll/pop) | O(log n) | move last to root, sift down |
| build from n items | O(n) | sift down from the last parent to the root |
| remove arbitrary / contains | O(n) | linear search |

A heap is **not sorted** — only the root is guaranteed. Iterating a `PriorityQueue` doesn't give sorted order.

### Patterns

1. **Top-k** with a size-k heap (opposite polarity: min-heap for largest).
2. **K-way merge** — heap of (value, source, index) for k sorted lists/files.
3. **Scheduling** — next event/deadline first (meeting rooms II with end times, task scheduler).
4. **Two heaps** — running median.
5. **Dijkstra** — min-heap of (distance, node).

### Language specifics

```java
PriorityQueue<int[]> pq = new PriorityQueue<>((a, b) -> Integer.compare(a[0], b[0]));
PriorityQueue<Integer> max = new PriorityQueue<>(Comparator.reverseOrder());
```
Avoid `(a, b) -> a - b` — it overflows for large magnitudes.

```python
import heapq
heapq.heappush(h, (priority, tiebreak, item))   # tuples; add a counter to avoid comparing items
largest = heapq.nlargest(k, nums)
```

## Worked examples

### Example 1 — meeting rooms II

Sort meetings by start. Keep a min-heap of end times for rooms in use. For each meeting, if the earliest-ending room is free (`heap[0] ≤ start`), pop it; push this meeting's end. Answer = maximum heap size (or final size). O(n log n).

### Example 2 — merge k sorted lists

```java
ListNode mergeKLists(ListNode[] lists) {
    PriorityQueue<ListNode> pq = new PriorityQueue<>(Comparator.comparingInt(n -> n.val));
    for (ListNode l : lists) if (l != null) pq.offer(l);
    ListNode dummy = new ListNode(0), tail = dummy;
    while (!pq.isEmpty()) {
        ListNode n = pq.poll();
        tail.next = n; tail = n;
        if (n.next != null) pq.offer(n.next);
    }
    return dummy.next;
}
```

## Common misconceptions

- **"A heap is sorted."** — Only the root is known.
- **"Building a heap is O(n log n)."** — Bottom-up heapify is O(n).
- **"Use a max-heap for the k largest."** — Works but costs O(n + k log n) memory-wise O(n); the size-k min-heap is the streaming solution.
- **"PriorityQueue.remove(x) is O(log n)."** — It's O(n).

## Practical exercises

1. Solve **Top K Frequent Elements** with a heap and with bucket sort; compare.
2. Implement meeting rooms II and "k closest points to origin".
3. Implement the two-heap running median and test with an even number of elements.
4. Implement sift-down by hand on a small array to make sure you understand it.
