---
slug: trees
title: Trees and binary search trees
path: dsa
module: dsa-trees-graphs
order: 1
minutes: 60
depth: full
practice: coding
summary: Traversals, recursive tree reasoning, BST invariants and balanced trees — the most common interview data structure after arrays.
prerequisites: [recursion, stack-queue]
problems: []
objectives:
  - Implement pre-, in-, post-order and level-order traversals recursively and iteratively
  - Solve tree problems by defining what each recursive call returns
  - Validate and use the BST invariant with min/max bounds
  - Explain why balanced trees (red-black, AVL) guarantee O(log n) and what TreeMap offers
readings:
  - title: "Java SE 21 API — TreeMap"
    url: https://docs.oracle.com/en/java/javase/21/docs/api/java.base/java/util/TreeMap.html
    kind: docs
  - title: "Open Data Structures — binary trees, BSTs and balanced trees"
    url: https://opendatastructures.org/
    kind: book
  - title: "MIT 6.006 — binary trees and AVL lectures"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
interview:
  - q: "How do you validate a BST?"
    a: "Recurse with an allowed (min, max) range: the left subtree must be within (min, node.val) and the right within (node.val, max). Comparing only with direct children is wrong. Alternatively, an in-order traversal must be strictly increasing."
  - q: "What is the maximum depth of a binary tree and how do you compute it?"
    a: "depth(null) = 0; depth(node) = 1 + max(depth(left), depth(right)). O(n) time, O(h) stack; BFS counting levels avoids deep recursion."
  - q: "Lowest common ancestor in a BST vs a general binary tree?"
    a: "BST: walk from the root — go left if both values are smaller, right if both larger, otherwise the current node is the LCA (O(h)). General tree: recurse; if both subtrees return non-null, the node is the LCA (O(n))."
selfAssessment:
  - I can write all four traversals without notes
  - I always decide what my recursive helper returns before coding
  - I can explain why a skewed BST degrades to O(n)
completion:
  - Score at least 70% on the quiz
  - Explain BST validation in interview mode
  - Implement level-order traversal in your interview language
quiz:
  - q: "In-order traversal of a BST visits nodes in:"
    options: ["Insertion order", "Sorted order", "Level order", "Reverse sorted order"]
    answer: 1
    why: "Left subtree < node < right subtree, recursively."
  - q: "Search in an unbalanced BST built from sorted input costs:"
    options: ["O(1)", "O(log n)", "O(n)", "O(n log n)"]
    answer: 2
    why: "Sorted insertions produce a chain; height becomes n."
  - q: "Which traversal is natural for deleting/freeing a tree?"
    options: ["Pre-order", "In-order", "Post-order", "Level-order"]
    answer: 2
    why: "Children are processed before their parent."
  - q: "BFS on a tree uses memory proportional to:"
    options: ["The height", "The maximum width of a level", "Always n", "log n"]
    answer: 1
    why: "The queue holds at most one or two levels at a time."
explain:
  prompt: "Explain how to validate that a binary tree is a binary search tree, and why the naive approach fails."
  rubric:
    - "States the BST property for whole subtrees, not just children"
    - "Gives a counterexample to the parent-child-only check"
    - "Passes (low, high) bounds down the recursion and narrows them"
    - "Handles duplicates / strictness and extreme values (e.g. Long or nullable bounds)"
    - "States O(n) time and O(h) space"
  model: "A BST requires every node in the left subtree to be smaller than the node and every node in the right subtree larger — not just the immediate children. Checking only children fails for a tree like 5 with right child 6 whose left child is 3: 3 < 6 locally, but 3 is in 5's right subtree. So I recurse with an allowed open interval: the root gets (−∞, +∞), a left child gets (low, node.val) and a right child (node.val, high). If any value falls outside its interval, return false. I use nullable bounds or long to avoid problems with Integer.MIN_VALUE, and decide whether duplicates are allowed. Each node is visited once: O(n) time, O(h) recursion depth."
cards:
  - q: "BST validation"
    a: "Recurse with (low, high) bounds; or in-order must be strictly increasing."
  - q: "Height of a balanced vs skewed tree"
    a: "O(log n) vs O(n) — determines BST operation cost."
  - q: "TreeMap guarantees"
    a: "Red-black tree: O(log n) get/put/remove, sorted iteration, floorKey/ceilingKey/subMap."
---

## Explanation

### Vocabulary

Root, children, leaf, **height** (edges on the longest root-to-leaf path), **depth** of a node, subtree. A binary tree with n nodes has height between ⌊log₂ n⌋ (balanced) and n − 1 (degenerate chain).

### Traversals

| Traversal | Order | Typical use |
|---|---|---|
| Pre-order | node, left, right | copy/serialize a tree |
| In-order | left, node, right | sorted output of a BST |
| Post-order | left, right, node | compute from children (heights, sums), delete |
| Level-order (BFS) | level by level | shortest depth, right-side view, per-level aggregates |

Recursive versions are 4 lines; iterative in-order with an explicit stack is a classic follow-up:

```java
List<Integer> inorder(TreeNode root) {
    List<Integer> out = new ArrayList<>();
    Deque<TreeNode> stack = new ArrayDeque<>();
    TreeNode cur = root;
    while (cur != null || !stack.isEmpty()) {
        while (cur != null) { stack.push(cur); cur = cur.left; }
        cur = stack.pop();
        out.add(cur.val);
        cur = cur.right;
    }
    return out;
}
```

### The recursive-return mindset

Most tree problems become easy once you define **what the helper returns for a subtree**:

- Max depth → returns the height.
- Balanced check → returns height, or −1 if unbalanced (avoids O(n²) recomputation).
- Diameter → returns height; updates a global best with `leftHeight + rightHeight`.
- Path sum → passes the remaining target down.

### Binary search trees

Invariant: all keys in the left subtree < node < all keys in the right subtree. Search, insert and delete are O(h). Deletion with two children: replace with the in-order successor (minimum of the right subtree), then delete that node.

**Balanced BSTs** (AVL, red-black) keep h = O(log n) via rotations. Java's `TreeMap`/`TreeSet` are red-black trees offering `floorKey`, `ceilingKey`, `headMap`, `tailMap` — very handy for interval and scheduling problems.

## Worked examples

### Example 1 — level-order traversal

```python
from collections import deque
def level_order(root):
    if not root: return []
    out, q = [], deque([root])
    while q:
        level = []
        for _ in range(len(q)):          # snapshot the level size
            node = q.popleft()
            level.append(node.val)
            if node.left: q.append(node.left)
            if node.right: q.append(node.right)
        out.append(level)
    return out
```

### Example 2 — diameter of a binary tree

```typescript
function diameterOfBinaryTree(root: TreeNode | null): number {
  let best = 0;
  const height = (n: TreeNode | null): number => {
    if (!n) return 0;
    const l = height(n.left), r = height(n.right);
    best = Math.max(best, l + r);     // longest path through n (in edges)
    return 1 + Math.max(l, r);
  };
  height(root);
  return best;
}
```
One pass, O(n). The naive version computing heights separately for every node is O(n²).

## Common misconceptions

- **"Check only parent/child for BST validity."** — Must hold for whole subtrees.
- **"Trees are always balanced."** — Plain BSTs degrade with sorted input.
- **"Height = number of nodes on the path."** — Clarify: edges vs nodes. Say which you use.
- **"Recursion depth is log n."** — Only for balanced trees.

## Practical exercises

1. Implement all four traversals iteratively and recursively.
2. Solve: max depth, validate BST, LCA (BST and general), level order, right side view.
3. Compute the diameter in one pass and explain why the naive approach is O(n²).
4. Use `TreeMap.floorKey` to find the latest meeting that starts before a given time.
