---
slug: collections
title: The Java Collections Framework
path: java
module: java-language
order: 1
minutes: 50
depth: full
practice: coding
summary: Choosing the right collection by operation costs and ordering guarantees — and the iteration, equality and concurrency pitfalls.
prerequisites: [hashmap-hashset]
problems: [two-sum, top-k-frequent-elements]
objectives:
  - Choose between List, Set, Map, Queue and Deque implementations by complexity and ordering
  - Explain fail-fast iterators and ConcurrentModificationException
  - Use Comparable vs Comparator and the Map convenience methods idiomatically
  - Pick thread-safe alternatives (ConcurrentHashMap, CopyOnWriteArrayList) appropriately
readings:
  - title: "The Java Tutorials — Collections trail"
    url: https://docs.oracle.com/javase/tutorial/collections/index.html
    kind: docs
  - title: "Java SE 21 API — java.util package summary"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/package-summary.html
    kind: docs
  - title: "Java SE 21 API — ConcurrentHashMap"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/concurrent/ConcurrentHashMap.html
    kind: docs
interview:
  - q: "ArrayList vs LinkedList?"
    a: "ArrayList: O(1) indexed access, amortized O(1) append, O(n) middle insert, cache-friendly. LinkedList: O(n) access, O(1) insert/remove at ends or via iterator, high per-node memory. ArrayList (or ArrayDeque for queues) is almost always better."
  - q: "What causes ConcurrentModificationException and how do you avoid it?"
    a: "Structurally modifying a collection while iterating it with a fail-fast iterator (e.g. list.remove inside a for-each). Use iterator.remove(), removeIf, collect changes and apply after, or use a concurrent collection."
  - q: "HashMap vs LinkedHashMap vs TreeMap?"
    a: "HashMap: O(1) average, no order. LinkedHashMap: insertion (or access) order, slightly more memory; basis of LRU caches. TreeMap: sorted by key, O(log n), navigation methods like floorKey/ceilingKey."
selfAssessment:
  - I can justify a collection choice in one sentence
  - I know which collections allow null and which are thread-safe
  - I can implement an LRU cache with LinkedHashMap
completion:
  - Score at least 70% on the quiz
  - Explain HashMap vs TreeMap vs LinkedHashMap in interview mode
quiz:
  - q: "Which collection gives O(log n) floor/ceiling queries on keys?"
    options: ["HashMap", "LinkedHashMap", "TreeMap", "ArrayList"]
    answer: 2
    why: "TreeMap is a red-black tree with NavigableMap methods."
  - q: "for (String s : list) if (s.isEmpty()) list.remove(s); most likely:"
    options: ["Works fine", "Throws ConcurrentModificationException", "Removes only the first element", "Doesn't compile"]
    answer: 1
    why: "Structural modification during fail-fast iteration. Use list.removeIf(String::isEmpty)."
  - q: "ConcurrentHashMap differs from Collections.synchronizedMap by:"
    options: ["Allowing null keys", "Fine-grained concurrency and atomic compute/merge operations without a global lock", "Being sorted", "Being immutable"]
    answer: 1
    why: "It avoids a single lock for all operations and rejects null keys/values."
  - q: "Arrays.asList(1, 2, 3).add(4) results in:"
    options: ["[1, 2, 3, 4]", "UnsupportedOperationException", "Compile error", "A new list"]
    answer: 1
    why: "It's a fixed-size view backed by the array."
explain:
  prompt: "How do you choose between HashMap, LinkedHashMap and TreeMap? Include complexity and a use case for each."
  rubric:
    - "HashMap: O(1) average, no ordering guarantees"
    - "LinkedHashMap: predictable insertion/access order; LRU cache via removeEldestEntry"
    - "TreeMap: sorted keys, O(log n), navigation methods"
    - "Mentions memory/constant-factor or hashing (equals/hashCode) vs comparator requirements"
  model: "HashMap is the default: average O(1) get and put, but iteration order is unspecified and can change after resizes. LinkedHashMap adds a linked list through the entries, so iteration follows insertion order, or access order if configured, which makes an LRU cache a few lines with removeEldestEntry; it costs a bit more memory. TreeMap is a red-black tree: O(log n) operations, keys kept sorted by Comparable or a Comparator, and NavigableMap methods like floorKey, ceilingKey and subMap, which I'd use for range queries or time-based lookups. HashMap and LinkedHashMap rely on equals and hashCode; TreeMap relies on a comparison consistent with equals."
cards:
  - q: "Default list / queue / map in Java"
    a: "ArrayList / ArrayDeque / HashMap."
  - q: "LRU cache in Java"
    a: "LinkedHashMap(capacity, 0.75f, true) with removeEldestEntry returning size() > capacity."
  - q: "Avoid ConcurrentModificationException"
    a: "iterator.remove(), removeIf, or modify after iteration."
---

## Explanation

### The interfaces

`Collection` → `List` (ordered, indexed), `Set` (unique), `Queue`/`Deque` (ends); `Map` (key → value) is separate.

### Implementation cheat sheet

| Need | Use | Notes |
|---|---|---|
| Indexed list | `ArrayList` | amortized O(1) append; O(n) insert in middle |
| Stack / queue / deque | `ArrayDeque` | no nulls; faster than `LinkedList` and `Stack` |
| Priority order | `PriorityQueue` | O(log n) offer/poll; not sorted iteration |
| Membership | `HashSet` | O(1) average |
| Sorted set / ranges | `TreeSet` | O(log n), `floor/ceiling/headSet` |
| Key → value | `HashMap` | O(1) average, one null key allowed |
| Ordered map | `LinkedHashMap` | insertion or access order |
| Sorted map | `TreeMap` | O(log n), navigation API |
| Enum keys | `EnumMap` / `EnumSet` | array/bit-vector backed, very fast |
| Concurrent map | `ConcurrentHashMap` | no null keys/values; atomic `compute`, `merge` |
| Read-mostly concurrent list | `CopyOnWriteArrayList` | copies on every write |

### Immutable and unmodifiable

`List.of`, `Set.of`, `Map.of`, `List.copyOf` create unmodifiable collections that reject nulls. `Arrays.asList` is a fixed-size **view** of an array (set works, add/remove throw).

### Iteration and fail-fast iterators

Most `java.util` iterators are **fail-fast**: a structural modification not made through the iterator triggers `ConcurrentModificationException` on the next step (best effort, not a concurrency guarantee). Use `Iterator.remove`, `Collection.removeIf`, or `Map.entrySet().removeIf`.

### Ordering: Comparable vs Comparator

`Comparable<T>` defines a natural order inside the class (`compareTo`); `Comparator<T>` defines external orders: `Comparator.comparing(User::lastName).thenComparing(User::firstName).reversed()`. Keep comparisons consistent with `equals` for `TreeSet`/`TreeMap`, or "duplicates" disappear.

### Map idioms

```java
counts.merge(word, 1, Integer::sum);
index.computeIfAbsent(key, k -> new ArrayList<>()).add(value);
cache.putIfAbsent(key, value);
map.getOrDefault(key, 0);
```

## Worked examples

### LRU cache with LinkedHashMap

```java
class LruCache<K, V> extends LinkedHashMap<K, V> {
    private final int capacity;
    LruCache(int capacity) { super(16, 0.75f, true); this.capacity = capacity; }   // access order
    @Override protected boolean removeEldestEntry(Map.Entry<K, V> eldest) { return size() > capacity; }
}
```
In an interview you may be asked to build it from scratch: a `HashMap<K, Node>` plus a doubly linked list for O(1) move-to-front and eviction.

### Word frequency, top 3

```java
Map<String, Integer> freq = new HashMap<>();
for (String w : words) freq.merge(w, 1, Integer::sum);
List<String> top = freq.entrySet().stream()
    .sorted(Map.Entry.<String, Integer>comparingByValue().reversed().thenComparing(Map.Entry.comparingByKey()))
    .limit(3).map(Map.Entry::getKey).toList();
```

## Common misconceptions

- **"LinkedList is better for queues."** — `ArrayDeque` is faster and leaner.
- **"Collections.synchronizedMap is as good as ConcurrentHashMap."** — It uses one lock and compound actions still need external locking.
- **"Arrays.asList returns an ArrayList."** — It returns a fixed-size view (a different, private class).
- **"Iterating a PriorityQueue is sorted."** — Only `poll` order is.

## Practical exercises

1. Implement an LRU cache both with `LinkedHashMap` and with `HashMap` + doubly linked list.
2. Rewrite a loop that removes items during iteration using `removeIf`.
3. Solve **Top K Frequent Elements** using `merge` and a `PriorityQueue` with a safe comparator.
