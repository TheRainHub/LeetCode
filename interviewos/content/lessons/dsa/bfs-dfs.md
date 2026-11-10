---
slug: bfs-dfs
title: BFS and DFS
path: dsa
module: dsa-trees-graphs
order: 4
minutes: 55
depth: full
practice: coding
summary: The two fundamental traversals — when to use each, how to implement them iteratively, and the visited-state bugs that break them.
prerequisites: [graphs, stack-queue]
problems: [number-of-islands]
objectives:
  - Implement BFS and DFS on adjacency lists and grids, iteratively and recursively
  - Choose BFS for shortest unweighted paths and DFS for exhaustive exploration, components and cycle detection
  - Place visited marking correctly to avoid duplicate work and infinite loops
  - Run multi-source BFS and reason about its complexity
readings:
  - title: "cp-algorithms — Breadth-first search"
    url: https://cp-algorithms.com/graph/breadth-first-search.html
    kind: docs
  - title: "cp-algorithms — Depth-first search"
    url: https://cp-algorithms.com/graph/depth-first-search.html
    kind: docs
  - title: "MIT 6.006 — BFS and DFS lectures"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
interview:
  - q: "Why does BFS find shortest paths in an unweighted graph?"
    a: "It processes nodes in non-decreasing distance order: all nodes at distance d are dequeued before any at distance d+1, so the first time a node is reached is via a shortest path."
  - q: "What is multi-source BFS? Give an example."
    a: "Start BFS with all sources in the queue at distance 0. Example: rotting oranges or 'distance to nearest gate' — each cell gets its distance to the closest source in one O(V+E) pass."
  - q: "Recursive DFS on a 1000×1000 grid — any concern?"
    a: "Depth can reach 10^6 for a snake-shaped region, overflowing the call stack in Java/Python. Use an explicit stack or BFS."
selfAssessment:
  - I mark visited on enqueue in BFS without thinking about it
  - I can write grid BFS with a direction array and bounds checks quickly
  - I can explain why BFS is shortest-path for unweighted graphs
completion:
  - Score at least 70% on the quiz
  - Solve Number of Islands independently with passing tests
  - Explain BFS vs DFS in interview mode
quiz:
  - q: "In BFS, marking a node visited when it is dequeued (instead of enqueued) causes:"
    options: ["Wrong answers always", "Nodes may be enqueued many times, wasting time/memory", "Nothing — both are equivalent", "Stack overflow"]
    answer: 1
    why: "Several neighbours can enqueue the same node before it's processed."
  - q: "Time complexity of BFS/DFS on an adjacency list:"
    options: ["O(V)", "O(E)", "O(V + E)", "O(V·E)"]
    answer: 2
    why: "Every vertex is processed once and every edge examined once (twice if undirected)."
  - q: "Shortest path in a grid where some moves cost 0 and others 1:"
    options: ["Plain BFS", "0-1 BFS with a deque", "DFS", "Topological sort"]
    answer: 1
    why: "Push 0-cost neighbours to the front and 1-cost to the back; still O(V + E)."
  - q: "Which traversal naturally detects a cycle in a directed graph?"
    options: ["BFS with a visited set", "DFS with recursion-stack (gray) state", "Level-order", "Union-find"]
    answer: 1
    why: "An edge to a node currently on the DFS stack is a back edge, i.e. a cycle."
explain:
  prompt: "Compare BFS and DFS: how each works, what each is good for, and the common implementation pitfalls."
  rubric:
    - "BFS uses a queue and explores by distance layers; DFS uses a stack/recursion and goes deep first"
    - "BFS gives shortest paths in unweighted graphs; DFS suits components, exhaustive search, cycle detection, topological sort"
    - "Both are O(V + E) time; memory is frontier width (BFS) vs depth (DFS)"
    - "Visited marking on enqueue/push to avoid duplicates and infinite loops"
    - "Mentions recursion depth risk and iterative alternatives"
  model: "BFS uses a FIFO queue, so it visits nodes in layers of increasing distance from the start; the first time it reaches a node is along a shortest path in an unweighted graph. DFS uses a stack or recursion and follows one path as deep as possible before backtracking, which suits exploring whole components, exhaustive searches, cycle detection with gray/black states, and topological ordering. Both are O(V + E). BFS memory is the width of the frontier; DFS memory is the depth, which can be the whole graph for a long path, so recursive DFS can overflow the stack on large grids — I'd use an explicit stack or BFS. The classic bug is marking visited too late: in BFS I mark a node when I enqueue it, otherwise the same node can be queued many times."
cards:
  - q: "BFS shortest path guarantee"
    a: "Unweighted (or equal-weight) graphs only; nodes dequeued in distance order."
  - q: "Where to mark visited in BFS"
    a: "When enqueuing."
  - q: "Multi-source BFS"
    a: "Enqueue all sources at distance 0; one pass gives distance to the nearest source."
---

## Explanation

### BFS — breadth first

```text
queue = [start]; visited = {start}; dist[start] = 0
while queue:
    u = queue.pop_front()
    for v in neighbours(u):
        if v not in visited:
            visited.add(v); dist[v] = dist[u] + 1
            queue.push_back(v)
```
- Explores in **layers**; `dist` is the shortest number of edges.
- Memory: the frontier (can be wide).
- To process level by level, snapshot `len(queue)` at the start of each layer.

### DFS — depth first

Recursive:
```text
def dfs(u):
    visited.add(u)
    for v in neighbours(u):
        if v not in visited: dfs(v)
```
Iterative (explicit stack) avoids recursion limits. For **pre/post timing** (topological order, cycle detection) keep three states: unvisited (white), on the stack (gray), finished (black). An edge to a gray node is a back edge → cycle.

### Choosing

| Need | Use |
|---|---|
| Fewest steps / minimum moves | BFS |
| Count/label components, flood fill | either (BFS avoids deep recursion) |
| Detect cycles (directed), topological order | DFS colours or Kahn's BFS |
| All paths / backtracking | DFS |
| Distance to nearest of many sources | multi-source BFS |

### Grid template

```java
int[][] DIRS = {{1,0},{-1,0},{0,1},{0,-1}};
for (int[] d : DIRS) {
    int nr = r + d[0], nc = c + d[1];
    if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || seen[nr][nc] || grid[nr][nc] == '#') continue;
    seen[nr][nc] = true;
    queue.add(new int[]{nr, nc});
}
```

## Worked examples

### Example 1 — rotting oranges (multi-source BFS)

All rotten oranges start in the queue at minute 0. Each BFS layer is one minute. Track the count of fresh oranges; if any remain at the end, return −1. O(rows × cols).

### Example 2 — word ladder (BFS on an implicit graph)

Nodes are words; edges connect words differing by one letter. For each word, try replacing each position with 'a'..'z' and check a dictionary set: O(N · L · 26) where N words of length L. BFS gives the minimum number of transformations.

### Example 3 — clone graph (DFS with a map)

```python
def clone(node, copies=None):
    if node is None: return None
    copies = {} if copies is None else copies
    if node in copies: return copies[node]
    copy = Node(node.val); copies[node] = copy
    for nb in node.neighbors: copy.neighbors.append(clone(nb, copies))
    return copy
```
The map doubles as the visited set and handles cycles.

## Common misconceptions

- **"DFS finds shortest paths."** — Not in general; it finds *a* path.
- **"Visited sets are optional on trees, so on graphs too."** — Graphs with cycles loop forever without them.
- **"BFS uses less memory than DFS."** — It depends on width vs depth.
- **"Recursive DFS is always fine."** — Not on 10^5+ depth.

## Practical exercises

1. Solve **Number of Islands** with BFS, iterative DFS and recursive DFS; note which risks stack overflow.
2. Solve rotting oranges with multi-source BFS.
3. Solve word ladder and estimate its complexity before coding.
4. Implement directed cycle detection with white/gray/black states.
