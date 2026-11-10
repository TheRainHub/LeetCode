---
slug: graphs
title: Graph representations and modelling
path: dsa
module: dsa-trees-graphs
order: 3
minutes: 40
depth: concise
practice: coding
summary: Recognising graph problems in disguise, choosing a representation, and the core algorithms by problem type.
prerequisites: [hashmap-hashset, stack-queue]
problems: [number-of-islands]
objectives:
  - Model grids, dependencies and state spaces as graphs
  - Choose between adjacency lists, matrices and implicit graphs
  - Map problem types to algorithms (BFS, DFS, topological sort, Dijkstra, union-find)
readings:
  - title: "cp-algorithms — graph algorithms section"
    url: https://cp-algorithms.com/
    kind: docs
  - title: "MIT 6.006 — graph lectures"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
interview:
  - q: "Course schedule: can all courses be finished given prerequisites?"
    a: "Directed graph; it's possible iff there is no cycle. Kahn's algorithm (in-degree queue) or DFS with three colours. O(V + E)."
  - q: "When do you need Dijkstra instead of BFS?"
    a: "When edges have non-negative weights that differ. BFS finds shortest paths only in unweighted graphs (or 0/1 weights with a deque)."
selfAssessment:
  - I can build an adjacency list from an edge list in my language
  - I know which algorithm fits shortest path, cycle detection, ordering and connectivity
completion:
  - Score at least 70% on the quiz
  - Solve Number of Islands and explain the graph model
quiz:
  - q: "Adjacency list memory for V vertices and E edges:"
    options: ["O(V)", "O(E)", "O(V + E)", "O(V²)"]
    answer: 2
    why: "One list per vertex plus one entry per edge (two for undirected)."
  - q: "Ordering tasks so each comes after its dependencies is:"
    options: ["Minimum spanning tree", "Topological sort", "Dijkstra", "Union-find"]
    answer: 1
    why: "Valid only for DAGs; a cycle means no order exists."
  - q: "Dynamic connectivity ('are a and b connected after these unions?') is best served by:"
    options: ["BFS each query", "Union-find with path compression", "A heap", "Topological sort"]
    answer: 1
    why: "Near-constant amortized time per operation."
explain:
  prompt: "How do you recognise that a problem is a graph problem, and how do you choose the algorithm?"
  rubric:
    - "Identifies nodes and edges in the problem (cells, states, tasks, words)"
    - "Chooses a representation (adjacency list, matrix, implicit neighbours)"
    - "Maps the question to an algorithm: BFS for unweighted shortest path, DFS for exploration/components, topological sort for ordering, Dijkstra for weighted shortest path, union-find for connectivity"
    - "States complexity O(V + E) (or O(E log V) for Dijkstra)"
  model: "I look for entities with relationships: grid cells with neighbours, courses with prerequisites, words differing by one letter, or states connected by moves. Those are nodes and edges. If the graph is given as an edge list I build an adjacency list, O(V + E) memory; for grids I compute neighbours on the fly. Then the question picks the algorithm: fewest steps in an unweighted graph is BFS; exploring or counting components is DFS or BFS; ordering with dependencies is topological sort, which also detects cycles; weighted shortest path with non-negative weights is Dijkstra in O(E log V); and repeated connectivity questions are union-find."
cards:
  - q: "Shortest path, unweighted"
    a: "BFS — O(V + E)."
  - q: "Cycle in a directed graph"
    a: "DFS with white/gray/black colours, or Kahn's algorithm leaves nodes unprocessed."
  - q: "Weighted shortest path, non-negative weights"
    a: "Dijkstra with a min-heap — O(E log V)."
---

## Explanation

Many interview problems are graphs in disguise:

| Disguise | Nodes | Edges |
|---|---|---|
| Grid / map | cells | 4 (or 8) neighbours |
| Course schedule | courses | prerequisite → course |
| Word ladder | words | differ by one letter |
| Lock combinations | states "0000"… | one wheel turn |
| Social network | users | friendships |

### Representations

- **Adjacency list** — `Map<Integer, List<Integer>>` or `List<List<Integer>>`; O(V + E) memory; default choice.
- **Adjacency matrix** — O(V²) memory; O(1) edge checks; only for small dense graphs.
- **Implicit** — compute neighbours on demand (grids, state spaces); no explicit storage.

### Algorithm by question

| Question | Algorithm | Cost |
|---|---|---|
| Reachability / components | DFS or BFS | O(V + E) |
| Fewest edges | BFS | O(V + E) |
| Ordering with dependencies, cycle check | Topological sort | O(V + E) |
| Weighted shortest path (≥ 0) | Dijkstra | O(E log V) |
| Connectivity under unions | Union-find | ~O(α(n)) each |
| Bipartite check | BFS/DFS 2-colouring | O(V + E) |

Always track **visited** state; on grids you can mark cells in place if mutation is allowed.

## Worked examples

### Topological sort (Kahn)

```python
from collections import deque
def can_finish(n, prereqs):
    graph = [[] for _ in range(n)]
    indeg = [0] * n
    for course, pre in prereqs:
        graph[pre].append(course); indeg[course] += 1
    q = deque(i for i in range(n) if indeg[i] == 0)
    done = 0
    while q:
        u = q.popleft(); done += 1
        for v in graph[u]:
            indeg[v] -= 1
            if indeg[v] == 0: q.append(v)
    return done == n
```

## Common misconceptions

- **"BFS gives shortest paths in weighted graphs."** — Only if all weights are equal.
- **"Undirected edges need one entry."** — Add both directions.
- **"Visited can be marked when dequeuing."** — Mark on enqueue in BFS to avoid duplicates.

## Practical exercises

1. Solve **Number of Islands** with BFS and with union-find.
2. Implement course schedule with Kahn's algorithm and with DFS colours.
3. Model "open the lock" as BFS over 10⁴ states and estimate its complexity.
