---
slug: linked-lists
title: Linked lists
path: dsa
module: dsa-linear
order: 1
minutes: 50
depth: full
practice: coding
summary: Pointer manipulation without losing nodes — dummy heads, reversal, merging and fast/slow pointers.
prerequisites: [two-pointers]
problems: [linked-list-cycle]
objectives:
  - Compare linked lists with arrays in terms of operations and memory locality
  - Reverse, merge and split singly linked lists iteratively without losing references
  - Use a dummy (sentinel) head to remove special cases at the head
  - Detect cycles and find the middle with fast/slow pointers
readings:
  - title: "Java SE 21 API — LinkedList"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/LinkedList.html
    kind: docs
  - title: "Open Data Structures — linked lists chapter"
    url: https://opendatastructures.org/
    kind: book
interview:
  - q: "Reverse a singly linked list iteratively — what three references do you track?"
    a: "prev (starts null), curr (starts head), and next saved before rewiring: next = curr.next; curr.next = prev; prev = curr; curr = next. Return prev. O(n) time, O(1) space."
  - q: "Why use a dummy head node?"
    a: "It gives every real node a predecessor, so deleting or inserting at the head needs no special case; return dummy.next at the end."
  - q: "When is java.util.LinkedList a good choice?"
    a: "Rarely: only for frequent insertions/removals at both ends or via an iterator at known positions. ArrayDeque is usually faster for queues/stacks because of memory locality; ArrayList for indexed access."
selfAssessment:
  - I can reverse a list on a whiteboard without drawing help
  - I use dummy heads by default when the head may change
  - I can explain Floyd's cycle detection
completion:
  - Score at least 70% on the quiz
  - Solve Linked List Cycle independently with passing tests
quiz:
  - q: "Accessing the k-th element of a singly linked list costs:"
    options: ["O(1)", "O(log k)", "O(k)", "O(n²)"]
    answer: 2
    why: "You must follow k next pointers."
  - q: "Merging two sorted linked lists iteratively uses how much extra space?"
    options: ["O(1)", "O(n)", "O(n + m)", "O(log n)"]
    answer: 0
    why: "You relink existing nodes behind a dummy head; no new nodes are needed."
  - q: "To remove the n-th node from the end in one pass you:"
    options: ["Reverse the list first", "Advance a fast pointer n steps ahead, then move both until fast reaches the end", "Store all nodes in an array", "Use recursion only"]
    answer: 1
    why: "The gap of n nodes places slow just before the target when fast hits the end (use a dummy head for the 'remove head' case)."
explain:
  prompt: "Walk an interviewer through reversing a singly linked list iteratively, including the pointer updates and edge cases."
  rubric:
    - "Tracks prev, curr and a saved next reference"
    - "Saves next before overwriting curr.next (otherwise the rest of the list is lost)"
    - "Returns prev as the new head"
    - "Handles empty and single-node lists naturally"
    - "States O(n) time and O(1) space, and mentions the recursive variant's O(n) stack"
  model: "I keep prev = null and curr = head. In each step I first save next = curr.next, because I'm about to overwrite curr.next and would otherwise lose the rest of the list. Then I point curr.next back to prev, and advance: prev = curr, curr = next. When curr becomes null, prev is the old tail and the new head, so I return it. An empty list returns null immediately and a single node just points to null, so no special cases. It's O(n) time and O(1) space; the recursive version is shorter but uses O(n) call-stack depth."
cards:
  - q: "Iterative list reversal (3 lines)"
    a: "next = curr.next; curr.next = prev; prev = curr; curr = next — return prev."
  - q: "Why a dummy head?"
    a: "Removes head special cases for insert/delete; return dummy.next."
  - q: "Find middle of a list"
    a: "slow 1 step, fast 2 steps; when fast ends, slow is the middle."
---

## Explanation

A singly linked list is a chain of nodes `{ val, next }`. You trade O(1) indexed access for O(1) insertion/removal **once you hold a reference** to the right node.

| Operation | Array | Singly linked list |
|---|---|---|
| Access k-th | O(1) | O(k) |
| Insert/delete at head | O(n) | O(1) |
| Insert/delete after known node | O(n) | O(1) |
| Memory | contiguous, cache-friendly | per-node object + pointer, scattered |

In practice arrays usually win because of CPU caches; linked lists matter in interviews because they test careful **pointer manipulation**.

### Core techniques

1. **Dummy head** — `ListNode dummy = new ListNode(0, head)`; operate on `dummy.next`; return `dummy.next`.
2. **Save before rewiring** — always store `next` before changing `curr.next`.
3. **Fast/slow pointers** — middle, cycle detection, n-th from end.
4. **Split and merge** — find middle, cut, sort/reverse halves, merge (merge sort on lists, palindrome check, reorder list).

### Null-safety checklist

Before `x.next.next`, ensure `x != null && x.next != null`. Test with: empty list, one node, two nodes, odd/even lengths, and (for cycles) self-loops.

## Worked examples

### Example 1 — merge two sorted lists

```java
ListNode merge(ListNode a, ListNode b) {
    ListNode dummy = new ListNode(0), tail = dummy;
    while (a != null && b != null) {
        if (a.val <= b.val) { tail.next = a; a = a.next; }
        else { tail.next = b; b = b.next; }
        tail = tail.next;
    }
    tail.next = (a != null) ? a : b;
    return dummy.next;
}
```

### Example 2 — palindrome linked list in O(1) space

1. Find the middle with fast/slow.
2. Reverse the second half.
3. Compare the halves node by node.
4. (Optional but polite) reverse the second half back to restore the input.

### Example 3 — remove n-th node from the end

```python
def remove_nth_from_end(head, n):
    dummy = ListNode(0, head)
    fast = slow = dummy
    for _ in range(n + 1): fast = fast.next
    while fast:
        fast, slow = fast.next, slow.next
    slow.next = slow.next.next
    return dummy.next
```

## Common misconceptions

- **"Linked lists are faster for insertion in practice."** — Only if you already hold the node; finding it is O(n), and cache misses are expensive.
- **"Recursion is fine for list problems."** — Lists with 10^5 nodes can overflow the stack.
- **"Compare values to detect cycles."** — Compare node identity; values can repeat.
- **"java.util.LinkedList is a good default queue."** — Prefer `ArrayDeque`.

## Practical exercises

1. Solve **Linked List Cycle**, then return the cycle's starting node.
2. Reverse a list iteratively and recursively; state the space difference.
3. Implement "reorder list" (L0 → Ln → L1 → Ln−1 …) using split, reverse and merge.
4. Write a test list for null-safety: empty, 1, 2, 3 nodes.
