/**
 * Curated mappings for the problem bank. The bank itself is imported from
 * external open datasets by `npm run bank:import` (never committed here);
 * this file only says how that data connects to InterviewOS lessons and
 * company tracks, and which algorithm-visualizer.org pages fit each lesson.
 */

export interface BankSourceDef {
  key: "company-lists" | "coding-patterns";
  name: string;
  repoUrl: string;
  /** Directory name under the sources folder. */
  dir: string;
  description: string;
}

export const BANK_SOURCES: BankSourceDef[] = [
  {
    key: "company-lists",
    name: "LeetCode company-wise problem lists",
    repoUrl: "https://github.com/liquidslr/leetcode-company-wise-problems",
    dir: "leetcode-company-wise-problems",
    description:
      "Per-company LeetCode lists for five time windows with a relative frequency (100 = most frequent in that list).",
  },
  {
    key: "coding-patterns",
    name: "Coding patterns notes",
    repoUrl:
      "https://github.com/Chanda-Abdul/Several-Coding-Patterns-for-Solving-Data-Structures-and-Algorithms-Problems-during-Interviews",
    dir: "coding-patterns",
    description: "16 interview patterns, each with the LeetCode problems used to practise it.",
  },
];

/** LeetCode topic tag → InterviewOS lesson slug. Tags not listed have no matching lesson. */
export const TAG_TO_LESSON: Record<string, string> = {
  Array: "arrays-strings",
  String: "arrays-strings",
  Matrix: "arrays-strings",
  "Prefix Sum": "arrays-strings",
  Simulation: "arrays-strings",
  Enumeration: "arrays-strings",
  "String Matching": "arrays-strings",
  "Hash Table": "hashmap-hashset",
  Counting: "hashmap-hashset",
  "Hash Function": "hashmap-hashset",
  "Two Pointers": "two-pointers",
  "Sliding Window": "sliding-window",
  "Binary Search": "binary-search",
  Sorting: "sorting",
  "Merge Sort": "sorting",
  Quicksort: "sorting",
  Quickselect: "sorting",
  "Counting Sort": "sorting",
  "Bucket Sort": "sorting",
  "Radix Sort": "sorting",
  "Linked List": "linked-lists",
  "Doubly-Linked List": "linked-lists",
  "Floyd's Cycle Finding Algorithm": "linked-lists",
  Stack: "stack-queue",
  Queue: "stack-queue",
  "Monotonic Stack": "stack-queue",
  "Monotonic Queue": "stack-queue",
  "Heap (Priority Queue)": "heaps",
  Tree: "trees",
  "Binary Tree": "trees",
  "Binary Search Tree": "trees",
  Trie: "trees",
  "Depth-First Search": "bfs-dfs",
  "Breadth-First Search": "bfs-dfs",
  "Graph Theory": "graphs",
  "Topological Sort": "graphs",
  "Union-Find": "graphs",
  "Shortest Path": "graphs",
  "Dijkstra's Algorithm": "graphs",
  "Minimum Spanning Tree": "graphs",
  "Dynamic Programming": "dynamic-programming",
  Memoization: "dynamic-programming",
  "Knapsack Problem": "dynamic-programming",
  "Longest Increasing Subsequence": "dynamic-programming",
  "Longest Common Subsequence": "dynamic-programming",
  Greedy: "greedy",
  Recursion: "recursion",
  Backtracking: "recursion",
  "Divide and Conquer": "recursion",
  Database: "sql-queries",
  Concurrency: "java-concurrency",
  Shell: "shell-bash",
};

/** Pattern number in the coding-patterns notes → InterviewOS lesson slug. */
export const PATTERN_TO_LESSON: Record<number, string | null> = {
  1: "sliding-window",
  2: "two-pointers",
  3: "linked-lists",
  4: "sorting",
  5: "sorting",
  6: "linked-lists",
  7: "bfs-dfs",
  8: "trees",
  9: "heaps",
  10: "recursion",
  11: "binary-search",
  12: null,
  13: "heaps",
  14: "heaps",
  15: "dynamic-programming",
  16: "graphs",
};

/** InterviewOS company track → company folder names in the company-wise dataset. */
export const COMPANY_DATASET_NAMES: Record<string, string[]> = {
  microsoft: ["Microsoft"],
  apple: ["Apple"],
};

/**
 * algorithm-visualizer.org pages per lesson: [category, algorithm] exactly as
 * named in github.com/algorithm-visualizer/algorithms. Checked against that
 * repository with `npm run bank:verify-visualizations`.
 */
export const VISUALIZATIONS: Record<string, [string, string][]> = {
  sorting: [
    ["Brute Force", "Bubble Sort"],
    ["Brute Force", "Insertion Sort"],
    ["Brute Force", "Selection Sort"],
    ["Divide and Conquer", "Merge Sort"],
    ["Divide and Conquer", "Quicksort"],
    ["Brute Force", "Heapsort"],
    ["Divide and Conquer", "Counting Sort"],
    ["Divide and Conquer", "Radix Sort"],
  ],
  "binary-search": [["Branch and Bound", "Binary Search"]],
  trees: [
    ["Brute Force", "Binary Tree Traversal"],
    ["Branch and Bound", "Binary Search Tree"],
    ["Brute Force", "Lowest Common Ancestor"],
  ],
  "bfs-dfs": [
    ["Brute Force", "Breadth-First Search"],
    ["Brute Force", "Depth-First Search"],
    ["Brute Force", "Flood Fill"],
  ],
  graphs: [
    ["Greedy", "Dijkstra's Shortest Path"],
    ["Dynamic Programming", "Bellman-Ford's Shortest Path"],
    ["Dynamic Programming", "Floyd-Warshall's Shortest Path"],
    ["Branch and Bound", "Topological Sort"],
    ["Greedy", "Kruskal's Minimum Spanning Tree"],
    ["Greedy", "Prim's Minimum Spanning Tree"],
    ["Brute Force", "Tarjan's Strongly Connected Components"],
    ["Brute Force", "Bipartiteness Test"],
  ],
  heaps: [["Brute Force", "Heapsort"]],
  "dynamic-programming": [
    ["Dynamic Programming", "Fibonacci Sequence"],
    ["Dynamic Programming", "Knapsack Problem"],
    ["Dynamic Programming", "Longest Common Subsequence"],
    ["Dynamic Programming", "Longest Increasing Subsequence"],
    ["Dynamic Programming", "Levenshtein's Edit Distance"],
    ["Dynamic Programming", "Maximum Subarray"],
  ],
  "sliding-window": [["Dynamic Programming", "Sliding Window"]],
  "linked-lists": [["Simple Recursive", "Cycle Detection"]],
  "two-pointers": [["Simple Recursive", "Cycle Detection"]],
  greedy: [
    ["Greedy", "Job Scheduling Problem"],
    ["Greedy", "Boyer–Moore's Majority Vote"],
  ],
  recursion: [
    ["Backtracking", "N-Queens Problem"],
    ["Backtracking", "Sum of subsets"],
    ["Backtracking", "Knight's Tour Problem"],
    ["Simple Recursive", "Euclidean Greatest Common Divisor"],
  ],
  "arrays-strings": [
    ["Brute Force", "Rabin-Karp's String Search"],
    ["Dynamic Programming", "Knuth-Morris-Pratt's String Search"],
  ],
};
