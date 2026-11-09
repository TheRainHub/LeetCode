---
slug: hashmap-hashset
title: HashMap and HashSet
path: dsa
module: dsa-foundations
order: 3
minutes: 80
depth: full
practice: coding
summary: How hash tables give average O(1) lookups, what breaks them, and how to use Java's HashMap correctly under interview pressure.
prerequisites: [complexity, arrays-strings]
problems: [two-sum, group-anagrams, top-k-frequent-elements]
objectives:
  - Explain how a hash function, buckets and collision handling turn a key into a storage location
  - Reason about load factor, resizing, and why operations are O(1) on average but not in the worst case
  - Implement equals() and hashCode() correctly and explain what goes wrong when the contract is broken
  - Choose between HashMap, HashSet, TreeMap, LinkedHashMap and arrays based on requirements
  - Implement Two Sum in Java with a one-pass hash map and test it against edge cases
readings:
  - title: "Java SE 21 API — HashMap"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashMap.html
    kind: docs
    note: Read the class description on capacity, load factor and iteration order.
  - title: "Java SE 21 API — Object.hashCode() and equals()"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/lang/Object.html
    kind: docs
    note: The general contract you must preserve when overriding.
  - title: "Java SE 21 API — HashSet"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/HashSet.html
    kind: docs
  - title: "MIT 6.006 Introduction to Algorithms (Spring 2020) — hashing lectures"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
    note: Lecture 4 (Hashing) covers universal hashing and expected-time analysis.
  - title: "Python docs — dict and set (Mapping Types)"
    url: https://docs.python.org/3/library/stdtypes.html#mapping-types-dict
    kind: docs
interview:
  - q: "Why is HashMap lookup O(1) on average but O(n) (or O(log n)) in the worst case?"
    a: "Average case assumes the hash spreads keys evenly so each bucket holds O(1) entries (load factor bounded, e.g. 0.75). Adversarial or poor hashes put many keys in one bucket; a linked-list bucket costs O(n). Since Java 8, buckets exceeding 8 entries (with table ≥ 64) become red-black trees, bounding the bucket to O(log n) for Comparable keys."
  - q: "What happens if you override equals() but not hashCode()?"
    a: "Two equal objects may get different hash codes and land in different buckets, so map.get(equalKey) returns null and sets can contain 'duplicates'. The contract requires equal objects to have equal hash codes."
  - q: "What happens if you mutate a key after inserting it into a HashMap?"
    a: "If the mutation changes hashCode(), the entry stays in the old bucket; lookups with the same (mutated) object search the new bucket and miss it. Keys should be immutable (String, Integer, records)."
  - q: "When would you choose TreeMap over HashMap?"
    a: "When you need ordered iteration, range queries (floorKey, ceilingKey, subMap) or guaranteed O(log n) worst case without depending on hash quality. Costs: O(log n) per operation and Comparable/Comparator keys."
  - q: "How does resizing work and what does it cost?"
    a: "When size exceeds capacity × loadFactor, the table doubles and entries are redistributed. A single put can be O(n), but doubling makes the amortized cost O(1). Pre-sizing (new HashMap<>(expected / 0.75 + 1)) avoids repeated resizes."
selfAssessment:
  - I can draw a bucket array with two colliding keys and walk through get() step by step
  - I can explain load factor and amortized resizing without notes
  - I can write a correct equals()/hashCode() pair for a class with two fields
  - I can implement Two Sum with a hash map in Java in under 10 minutes without hints
completion:
  - Score at least 70% on the lesson quiz
  - Explain HashMap internals in interview mode with at least 70% rubric coverage
  - Solve Two Sum independently (no hints, no solution) in Java with all tests passing
quiz:
  - q: "Java's HashMap has default capacity 16 and load factor 0.75. On which insertion does the first resize happen?"
    options: ["The 12th", "The 13th", "The 16th", "The 17th"]
    answer: 1
    why: "The threshold is 16 × 0.75 = 12 entries. The resize happens when size exceeds the threshold, i.e. when the 13th entry is inserted."
  - q: "A class overrides equals() to compare `id` but inherits Object.hashCode(). What is the most likely result of `set.add(new User(1)); set.contains(new User(1));`?"
    options: ["true — equals() is enough", "false — the two instances most likely hash to different buckets", "A compile error", "An exception at runtime"]
    answer: 1
    why: "Object.hashCode() is identity-based, so equal-by-id objects usually have different hash codes and contains() looks in the wrong bucket."
  - q: "Which statement about HashMap iteration order is correct?"
    options: ["Insertion order", "Sorted by key", "Unspecified and may change after a resize", "Reverse insertion order"]
    answer: 2
    why: "HashMap makes no ordering guarantee. Use LinkedHashMap for insertion order or TreeMap for sorted order."
  - q: "In the one-pass Two Sum solution, why do we look up the complement BEFORE inserting the current element?"
    options: ["It is faster", "It prevents pairing an element with itself and still handles duplicates like [3,3]", "HashMap.put would throw otherwise", "It keeps the map sorted"]
    answer: 1
    why: "Checking first ensures the partner comes from an earlier index. With [3,3] and target 6 the first 3 is stored, and the second 3 finds it."
  - q: "What is the expected time to insert n keys into a HashMap that starts at capacity 16 and doubles when needed?"
    options: ["O(n log n) because of resizes", "O(n) amortized", "O(n²)", "O(log n)"]
    answer: 1
    why: "Each doubling rehashes all current entries, but the total work across all doublings is a geometric series bounded by O(n)."
explain:
  prompt: "An interviewer asks: 'Explain how a Java HashMap stores and finds a key, and what can make it slow.' Answer as you would out loud, in 2–4 minutes, without looking at the lesson."
  rubric:
    - "Hash function: hashCode() is computed and spread, then mapped to a bucket index (e.g. hash & (capacity − 1))"
    - "Collisions: multiple keys in a bucket, resolved by chaining (list, treeified to a red-black tree when large)"
    - "Lookup uses hashCode() to find the bucket and equals() to find the exact key"
    - "Load factor and resizing: table doubles past capacity × 0.75; resize is O(n) but amortized O(1)"
    - "Worst case: poor or adversarial hashes degrade to O(n) per operation (O(log n) with treeified buckets)"
    - "Correctness caveats: equals/hashCode contract, mutable keys"
  model: "A HashMap is an array of buckets. To insert or find a key, it calls key.hashCode(), mixes the high bits into the low bits, and masks with capacity − 1 to pick a bucket. Different keys can land in the same bucket — a collision — so each bucket holds a small linked list of entries, or a red-black tree once it grows past 8 entries. Lookup goes to the bucket and compares keys with equals(). If hashes spread keys evenly and the load factor stays bounded (0.75 by default, after which the table doubles and entries are redistributed), each bucket holds a constant number of entries, so get and put are O(1) on average; resizing is O(n) but amortized O(1). It gets slow when many keys collide — a bad hashCode or adversarial input — degrading to O(n), or O(log n) per bucket with treeification. Correctness requires that equal keys have equal hash codes and that keys aren't mutated while in the map."
cards:
  - q: "HashMap: how is the bucket index computed from a key in Java 8+?"
    a: "h = key.hashCode(); h ^ (h >>> 16) spreads high bits; index = h & (capacity − 1), capacity being a power of two."
  - q: "equals()/hashCode() contract in one sentence"
    a: "If a.equals(b) then a.hashCode() == b.hashCode(); equal hash codes do NOT imply equality."
  - q: "When does a Java HashMap bucket become a tree?"
    a: "When a bucket exceeds 8 entries and the table capacity is at least 64 (otherwise it resizes instead)."
  - q: "Average vs worst-case complexity of HashMap.get"
    a: "Average O(1); worst O(n) with chained lists, O(log n) for treeified buckets with Comparable keys."
  - q: "Two Sum one-pass invariant"
    a: "Before index i, the map holds every earlier value → index; check target − nums[i] before inserting nums[i]."
---

## Explanation

### The problem hash tables solve

Arrays give O(1) access **by index**. Most real lookups are **by key**: a username, a URL, a value you've seen before. A hash table converts a key into an index so key-based lookup behaves like array indexing — on average.

### 1. Hash functions

A hash function maps a key to an integer. A good one is:

- **Deterministic** — same key, same hash, every time.
- **Fast** — it runs on every operation.
- **Uniform** — keys spread evenly across the output range so buckets stay balanced.

Java calls `key.hashCode()` (a 32-bit `int`). Because the table size is a power of two, only the low bits would matter, so `HashMap` first **spreads** the high bits down:

```java
static int spread(Object key) {
    int h = key.hashCode();
    return h ^ (h >>> 16);          // mix high bits into low bits
}
int index = spread(key) & (table.length - 1);   // same as mod for powers of two
```

`String.hashCode()` is `s[0]·31^(n−1) + s[1]·31^(n−2) + … + s[n−1]` — cheap, cached in the String object, and reasonably well distributed.

### 2. Buckets and collisions

With far more possible keys than buckets, two different keys will eventually map to the same index — a **collision** (pigeonhole principle). Two classic strategies:

| Strategy | How it works | Used by |
|---|---|---|
| **Separate chaining** | Each bucket holds a list of entries | Java `HashMap` |
| **Open addressing** | On collision, probe other slots (linear/quadratic probing) | Python `dict`, Java `IdentityHashMap` |

Java's buckets start as singly linked lists. Since Java 8, a bucket with more than **8** entries is converted into a **red-black tree** (if the table has ≥ 64 buckets; otherwise the table is resized instead). This bounds a pathological bucket at O(log n).

A `get(key)` therefore does two different checks:
1. `hashCode()` → which bucket to look in;
2. `equals()` → which entry in that bucket is the right one (Java compares cached hashes first as a cheap filter).

### 3. Load factor and resizing

**Load factor** α = entries / buckets. With uniform hashing, the expected bucket length is α, so keeping α bounded keeps operations O(1).

- Java defaults: capacity **16**, load factor **0.75** → threshold 12.
- When `size > threshold`, the table **doubles** and every entry is moved to its new bucket. (Because capacity doubles, each entry either stays at index `i` or moves to `i + oldCapacity` — determined by one extra hash bit.)
- A single `put` that triggers a resize costs O(n), but doubling makes the **amortized** cost O(1): the total rehash work over n inserts is n + n/2 + n/4 + … < 2n.

If you know the size up front, pre-size the map: `new HashMap<>((int) (expected / 0.75f) + 1)` avoids repeated resizes.

### 4. Average versus worst case

| Operation | Average | Worst (list bucket) | Worst (tree bucket) |
|---|---|---|---|
| `get`, `put`, `remove`, `containsKey` | O(1) | O(n) | O(log n) |
| Iteration over all entries | O(n + capacity) | — | — |

"O(1)" is an **expected** bound under assumptions about the hash function and input. Adversarial inputs (hash-flooding attacks that send keys with identical hashes) are a real-world concern — that is precisely why Java added treeified buckets and Python randomizes string hashes per process.

### 5. HashMap operations in Java

```java
Map<String, Integer> counts = new HashMap<>();
counts.put("a", 1);                       // insert or overwrite; returns previous value or null
counts.get("missing");                    // null — ambiguous if null values are allowed
counts.getOrDefault("missing", 0);        // 0
counts.merge("a", 1, Integer::sum);       // counting idiom: a → 2
counts.computeIfAbsent("g", k -> new ArrayList<>()).add(x); // multimap idiom (with Map<String, List<...>>)
counts.containsKey("a");
for (Map.Entry<String, Integer> e : counts.entrySet()) { /* iterate entries, not keySet + get */ }
```

`HashSet<E>` is a `HashMap<E, Object>` wrapper: same hashing, same complexity, stores only keys. Use it for "have I seen this?" and de-duplication.

`HashMap` is **not thread-safe**; concurrent writes can corrupt it. Use `ConcurrentHashMap` for shared mutable maps.

### 6. equals() and hashCode()

The contract (see `Object` docs):

1. `a.equals(b)` ⇒ `a.hashCode() == b.hashCode()`.
2. Equal hash codes do **not** imply equality (collisions are allowed).
3. `hashCode()` must be consistent while the fields used by `equals()` don't change.

```java
final class Point {
    private final int x, y;
    Point(int x, int y) { this.x = x; this.y = y; }

    @Override public boolean equals(Object o) {
        if (this == o) return true;
        if (!(o instanceof Point p)) return false;
        return x == p.x && y == p.y;
    }
    @Override public int hashCode() { return Objects.hash(x, y); }
}
// Or simply: record Point(int x, int y) {}  — records generate both correctly.
```

Breaking the contract causes silent bugs: lookups miss, sets hold duplicates. **Mutable keys** are the other trap: change a field used in `hashCode()` after insertion and the entry is stranded in the wrong bucket.

### 7. When a HashMap is appropriate

Use it when you need fast membership/lookup by key and **don't** need order. Consider alternatives:

- **Array / `int[26]`** when keys are small dense integers (letter counts): faster, no boxing, less memory.
- **`TreeMap`** for sorted iteration, `floorKey`/`ceilingKey`, range queries, or guaranteed O(log n).
- **`LinkedHashMap`** for insertion (or access) order — the basis of a simple LRU cache via `removeEldestEntry`.
- **`EnumMap`** for enum keys.
- **Sorting + two pointers** when memory is tight and O(n log n) is acceptable.

### 8. Memory trade-offs

A `HashMap<Integer, Integer>` entry is far more than 8 bytes: a node object (hash, key ref, value ref, next ref, header) plus two boxed `Integer` objects, plus the bucket array slot — commonly **40–60+ bytes per entry** on a 64-bit JVM. For a million entries that's tens of megabytes. Hash maps trade memory for speed; say this explicitly when an interviewer asks about scale, and mention primitive-specialised maps or arrays as alternatives.

## Worked examples

### Example 1 — Two Sum, from brute force to one pass

**Problem:** return indices `i ≠ j` with `nums[i] + nums[j] == target`.

1. *Brute force*: two nested loops, O(n²) time, O(1) space. Say it, then improve it.
2. *Observation*: for each `x`, we need to know whether `target − x` appeared **earlier**. "Have I seen value v, and where?" is exactly a map from value → index.
3. *One pass*:

```java
public int[] twoSum(int[] nums, int target) {
    Map<Integer, Integer> seen = new HashMap<>();      // value → index
    for (int i = 0; i < nums.length; i++) {
        int need = target - nums[i];
        Integer j = seen.get(need);                    // Integer, not int: null means "absent"
        if (j != null) return new int[]{j, i};
        seen.put(nums[i], i);                          // insert AFTER checking
    }
    throw new IllegalArgumentException("no solution");
}
```

**Trace** `nums = [3, 2, 4]`, `target = 6`:

| i | nums[i] | need | seen before | action |
|---|---|---|---|---|
| 0 | 3 | 3 | {} | store 3→0 |
| 1 | 2 | 4 | {3:0} | store 2→1 |
| 2 | 4 | 2 | {3:0, 2:1} | found 2 at index 1 → return [1, 2] |

Notice that at i = 0 we did **not** pair 3 with itself — because we checked before inserting.

### Example 2 — Testing edge cases deliberately

Before declaring Two Sum done, run through a checklist out loud:

| Case | Input | Expected | What it tests |
|---|---|---|---|
| Duplicates form the answer | `[3,3]`, 6 | `[0,1]` | check-before-insert ordering |
| Negatives | `[-1,-2,-3,-4,-5]`, −8 | `[2,4]` | no assumption of positivity |
| Zeros | `[0,4,3,0]`, 0 | `[0,3]` | `0` key, value `0` index |
| Answer at the end | `[1,5,9,13,21]`, 34 | `[3,4]` | loop bounds |

In TypeScript, a classic bug hides in `if (seen.get(need))` — index `0` is falsy. Compare with `!== undefined`.

### Example 3 — Frequency counting with merge

Count words and find the most frequent:

```java
Map<String, Integer> freq = new HashMap<>();
for (String w : words) freq.merge(w, 1, Integer::sum);
String best = null; int bestCount = 0;
for (var e : freq.entrySet()) {
    if (e.getValue() > bestCount) { best = e.getKey(); bestCount = e.getValue(); }
}
```

O(n) time, O(d) space for d distinct words — compare with sorting (O(n log n)).

## Common misconceptions

- **"HashMap operations are always O(1)."** — They are O(1) *on average* under good hashing. Worst case is O(n) for list buckets, O(log n) for treeified buckets. Resizing makes individual puts O(n), amortized O(1).
- **"Overriding equals() is enough."** — Hash-based collections use hashCode() first. Equal objects with different hash codes are effectively invisible to each other.
- **"Same hashCode means equal."** — Collisions are normal; equals() decides equality.
- **"HashMap preserves insertion order."** — It doesn't, and the order can change after a resize. Small maps in tests often *look* ordered, which hides bugs.
- **"HashSet stores elements in a sorted way."** — No; that's TreeSet.
- **"A HashMap is always the fastest option."** — For small dense integer keys, an array is faster and uses a fraction of the memory.
- **"get() returning null means the key is absent."** — Not if null values are stored; use containsKey() or avoid null values.

## Practical exercises

1. **Implement Two Sum** in Java without hints using the practice workspace. Record the attempt with your complexity analysis.
2. **Write equals()/hashCode()** for `final class Version(int major, int minor)` by hand, then replace it with a `record`. Write a test that `new HashSet<>(List.of(new Version(1,2), new Version(1,2))).size() == 1`.
3. **Break it on purpose:** remove `hashCode()` from your class and observe the set size. Then mutate a key after insertion and observe `containsKey` return false. Explain each result in one sentence.
4. **Resize arithmetic:** for capacity 64 and load factor 0.75, at which insertion does the table resize, and to what capacity?
5. **Design question (5 minutes, out loud):** you need to deduplicate 500 million user IDs (64-bit) on one machine with 8 GB RAM. Why might a `HashSet<Long>` fail, and what would you use instead (sort + scan, bitmap, Bloom filter with false positives, external sort)?
