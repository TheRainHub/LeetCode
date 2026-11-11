import type { ProblemDef } from "@/lib/content/defs";

export const longestSubstring: ProblemDef = {
  slug: "longest-substring-without-repeating-characters",
  title: "Longest Substring Without Repeating Characters",
  difficulty: "medium",
  order: 6,
  pattern: "Sliding window with last-seen index",
  tags: ["string", "sliding-window", "hash-map"],
  topics: ["sliding-window", "hashmap-hashset"],
  targetMinutes: 25,
  summary: "Find the longest substring with all-distinct characters using a variable-size window.",
  statement: `Given a string \`s\`, find the length of the **longest substring** without repeating characters.

A substring is a contiguous, non-empty sequence of characters (the empty string has answer 0).`,
  constraints: ["0 ≤ s.length ≤ 5·10⁴", "s consists of English letters, digits, symbols and spaces"],
  examples: [
    { input: 's = "abcabcbb"', output: "3", explanation: 'The answer is "abc".' },
    { input: 's = "bbbbb"', output: "1" },
    {
      input: 's = "pwwkew"',
      output: "3",
      explanation: '"wke" — note "pwke" is a subsequence, not a substring.',
    },
  ],
  hints: [
    "Brute force checks every substring. Once s[i..j] contains a duplicate, can any longer substring starting at i be valid?",
    "Maintain a window [left, right] that never contains duplicates. Extend right one character at a time. What must happen to left when s[right] is already inside the window?",
    "Store each character's last index. When s[right] was last seen at index p ≥ left, jump left to p + 1. The answer is max(right − left + 1).",
  ],
  approach: `### Window invariant
Keep \`s[left..right]\` free of duplicates. Move \`right\` forward one step at a time; when the new character breaks the invariant, move \`left\` just far enough to restore it.

### Version 1 — set + shrinking loop, O(n)
Add \`s[right]\` to a set; while it's already present, remove \`s[left]\` and increment \`left\`. Each index enters and leaves the window once → O(n) amortized.

### Version 2 — last-seen index, O(n) single pass ✅
\`last[c]\` = most recent index of character \`c\`.
\`\`\`
left = 0
for right in 0..n-1:
    c = s[right]
    if c in last and last[c] >= left:
        left = last[c] + 1        # jump past the previous occurrence
    last[c] = right
    best = max(best, right - left + 1)
\`\`\`
The \`last[c] >= left\` check matters: an old occurrence **outside** the window must not move \`left\` backwards (\`"abba"\`: at the final \`a\`, its previous index 0 is already left of the window).

### Space
O(min(n, Σ)) where Σ is the alphabet size — an \`int[128]\` array for ASCII is a nice constant-space variant in Java.`,
  solutions: {
    java: `import java.util.*;

class Solution {
    public int lengthOfLongestSubstring(String s) {
        Map<Character, Integer> last = new HashMap<>();
        int left = 0, best = 0;
        for (int right = 0; right < s.length(); right++) {
            char c = s.charAt(right);
            Integer prev = last.get(c);
            if (prev != null && prev >= left) left = prev + 1;
            last.put(c, right);
            best = Math.max(best, right - left + 1);
        }
        return best;
    }
}
`,
    typescript: `function lengthOfLongestSubstring(s: string): number {
  const last = new Map<string, number>();
  let left = 0;
  let best = 0;
  for (let right = 0; right < s.length; right++) {
    const prev = last.get(s[right]);
    if (prev !== undefined && prev >= left) left = prev + 1;
    last.set(s[right], right);
    best = Math.max(best, right - left + 1);
  }
  return best;
}
`,
    python: `from typing import *

class Solution:
    def lengthOfLongestSubstring(self, s: str) -> int:
        last: dict[str, int] = {}
        left = best = 0
        for right, c in enumerate(s):
            if c in last and last[c] >= left:
                left = last[c] + 1
            last[c] = right
            best = max(best, right - left + 1)
        return best
`,
  },
  edgeCases: [
    "Empty string → 0",
    'Single space " " → 1',
    '"abba" — stale index must not move left backwards',
    '"dvdf" → 3 ("vdf") — restarting from scratch after a duplicate is wrong',
    "All identical characters",
  ],
  expectedTime: "O(n)",
  expectedSpace: "O(min(n, Σ))",
  complexityNotes:
    "Each character is processed once; the map holds at most one entry per distinct character.",
  commonMistakes: [
    "Resetting the window to start after `right` instead of after the previous occurrence ('dvdf').",
    "Moving left backwards when the previous occurrence is outside the window ('abba').",
    "Confusing substring with subsequence.",
  ],
  signature: { method: "lengthOfLongestSubstring", params: [{ name: "s", type: "string" }], returns: "int" },
  comparator: "exact",
  tests: [
    { name: "example 1", args: ["abcabcbb"], expected: 3 },
    { name: "all same", args: ["bbbbb"], expected: 1 },
    { name: "example 3", args: ["pwwkew"], expected: 3 },
    { name: "empty", args: [""], expected: 0 },
    { name: "space", args: [" "], expected: 1 },
    { name: "dvdf", args: ["dvdf"], expected: 3 },
    { name: "abba", args: ["abba"], expected: 2 },
    { name: "tmmzuxt", args: ["tmmzuxt"], expected: 5 },
  ],
  externalLinks: [
    {
      title: "LeetCode 3 — Longest Substring Without Repeating Characters",
      url: "https://leetcode.com/problems/longest-substring-without-repeating-characters/",
    },
  ],
};

export const groupAnagrams: ProblemDef = {
  slug: "group-anagrams",
  title: "Group Anagrams",
  difficulty: "medium",
  order: 7,
  pattern: "Canonical key → bucket in a hash map",
  tags: ["array", "string", "hash-map", "sorting"],
  topics: ["hashmap-hashset", "arrays-strings"],
  targetMinutes: 20,
  summary: "Group words that are anagrams by mapping each to a canonical key.",
  statement: `Given an array of strings \`strs\`, group the **anagrams** together. You can return the groups in any order, and the words inside each group in any order.

An anagram is a word formed by rearranging all the letters of another word exactly once.`,
  constraints: [
    "1 ≤ strs.length ≤ 10⁴",
    "0 ≤ strs[i].length ≤ 100",
    "strs[i] consists of lowercase English letters",
  ],
  examples: [
    {
      input: 'strs = ["eat","tea","tan","ate","nat","bat"]',
      output: '[["bat"],["nat","tan"],["ate","eat","tea"]]',
    },
    { input: 'strs = [""]', output: '[[""]]' },
    { input: 'strs = ["a"]', output: '[["a"]]' },
  ],
  hints: [
    "Two words are anagrams iff they have the same multiset of characters. What single value could represent that multiset?",
    "Use that value as a hash-map key and append each word to the list stored under its key.",
    "Key options: the sorted word (O(k log k)) or a 26-count signature such as '1#0#2#…' (O(k)). Make sure the count key is unambiguous — use a separator.",
  ],
  approach: `### Canonical form
Map every word to a **key that is equal for all anagrams and different otherwise**, then bucket words by key in a hash map.

| Key | Cost per word (length k) | Notes |
|---|---|---|
| Sorted characters | O(k log k) | Simplest to write and explain |
| 26 letter counts | O(k) | Faster asymptotically; needs a separator (\`"1#12#…"\`) so counts like 1,12 and 11,2 don't collide |

Total: O(n·k log k) or O(n·k) time, O(n·k) space for the map.

### Java specifics
- \`char[] a = s.toCharArray(); Arrays.sort(a); String key = new String(a);\`
- \`map.computeIfAbsent(key, x -> new ArrayList<>()).add(s);\`
- Arrays can't be map keys directly (\`int[]\` uses identity \`hashCode\`) — convert to a \`String\` or use \`Arrays.toString\`. This is a great place to talk about \`equals()\`/\`hashCode()\` contracts.

### Follow-ups
Unicode input → use a \`Map<Character, Integer>\` signature or sort code points; very long words → the count key wins.`,
  solutions: {
    java: `import java.util.*;

class Solution {
    public List<List<String>> groupAnagrams(String[] strs) {
        Map<String, List<String>> groups = new HashMap<>();
        for (String s : strs) {
            char[] chars = s.toCharArray();
            Arrays.sort(chars);
            groups.computeIfAbsent(new String(chars), k -> new ArrayList<>()).add(s);
        }
        return new ArrayList<>(groups.values());
    }
}
`,
    typescript: `function groupAnagrams(strs: string[]): string[][] {
  const groups = new Map<string, string[]>();
  for (const s of strs) {
    const counts = new Array<number>(26).fill(0);
    for (const ch of s) counts[ch.charCodeAt(0) - 97]++;
    const key = counts.join("#");
    const bucket = groups.get(key);
    if (bucket) bucket.push(s);
    else groups.set(key, [s]);
  }
  return [...groups.values()];
}
`,
    python: `from typing import *
from collections import defaultdict

class Solution:
    def groupAnagrams(self, strs: List[str]) -> List[List[str]]:
        groups: dict[str, list[str]] = defaultdict(list)
        for s in strs:
            groups["".join(sorted(s))].append(s)
        return list(groups.values())
`,
  },
  edgeCases: [
    'Empty strings group together: ["",""] → [["",""]]',
    "Single word",
    "Same letters with different counts are NOT anagrams: 'ddddddddddg' vs 'dgggggggggg'",
    "No anagrams at all → every word alone",
  ],
  expectedTime: "O(n·k log k)",
  expectedSpace: "O(n·k)",
  complexityNotes:
    "n words of max length k. Sorting each word costs O(k log k); the counting key reduces it to O(n·k). The map stores every word once.",
  commonMistakes: [
    "Using int[] or char[] directly as a HashMap key in Java (identity hashCode).",
    "Count keys without separators ('1,12' vs '11,2' collide when concatenated as '112').",
    "Comparing every pair of words — O(n²·k).",
  ],
  signature: { method: "groupAnagrams", params: [{ name: "strs", type: "string[]" }], returns: "string[][]" },
  comparator: "unorderedNested",
  tests: [
    {
      name: "example 1",
      args: [["eat", "tea", "tan", "ate", "nat", "bat"]],
      expected: [["bat"], ["nat", "tan"], ["ate", "eat", "tea"]],
    },
    { name: "single empty", args: [[""]], expected: [[""]] },
    { name: "single letter", args: [["a"]], expected: [["a"]] },
    {
      name: "mixed",
      args: [["ab", "ba", "abc", "cab", "bca", "x"]],
      expected: [["ab", "ba"], ["abc", "bca", "cab"], ["x"]],
    },
    { name: "two empties", args: [["", ""]], expected: [["", ""]] },
    {
      name: "same letters, different counts",
      args: [["ddddddddddg", "dgggggggggg"]],
      expected: [["ddddddddddg"], ["dgggggggggg"]],
    },
  ],
  externalLinks: [
    { title: "LeetCode 49 — Group Anagrams", url: "https://leetcode.com/problems/group-anagrams/" },
  ],
};

export const mergeIntervals: ProblemDef = {
  slug: "merge-intervals",
  title: "Merge Intervals",
  difficulty: "medium",
  order: 8,
  pattern: "Sort by start, then sweep",
  tags: ["array", "sorting", "intervals"],
  topics: ["sorting", "arrays-strings"],
  targetMinutes: 20,
  summary: "Merge all overlapping intervals after sorting by start time.",
  statement: `Given an array of \`intervals\` where \`intervals[i] = [start_i, end_i]\`, merge all overlapping intervals and return an array of the non-overlapping intervals that cover all the intervals in the input.

Intervals that touch (e.g. \`[1,4]\` and \`[4,5]\`) are considered overlapping.`,
  constraints: ["1 ≤ intervals.length ≤ 10⁴", "intervals[i].length == 2", "0 ≤ start_i ≤ end_i ≤ 10⁴"],
  examples: [
    { input: "intervals = [[1,3],[2,6],[8,10],[15,18]]", output: "[[1,6],[8,10],[15,18]]" },
    { input: "intervals = [[1,4],[4,5]]", output: "[[1,5]]" },
  ],
  hints: [
    "If the intervals were sorted by start, where could an overlapping interval appear relative to the current one?",
    "After sorting, each interval either overlaps the last merged interval or starts a new one.",
    "Sort by start. Keep the last merged interval; if next.start ≤ last.end, set last.end = max(last.end, next.end); otherwise append next.",
  ],
  approach: `### Key insight
After sorting by start, any interval that overlaps the current merged block must come **immediately** after it — there's no need to look back further than the last merged interval.

### Algorithm — O(n log n) time
1. Sort by \`start\`.
2. Sweep: compare each interval with the **last interval in the output**.
   - \`cur.start <= last.end\` → overlap → \`last.end = max(last.end, cur.end)\`.
   - otherwise → append \`cur\`.

The \`max\` is essential: \`[1,10]\` followed by \`[2,3]\` must keep end 10 (containment).

### Complexity
Sorting dominates: O(n log n). Output and sort buffer: O(n). Java's \`Arrays.sort\` on objects is a stable TimSort; \`Comparator.comparingInt(a -> a[0])\` avoids subtraction overflow that \`(a, b) -> a[0] - b[0]\` could hit for large values.

### Variants to know
Insert interval (O(n) without sorting), meeting rooms (can a person attend all? → check adjacent overlaps), meeting rooms II (min rooms → min-heap of end times or sweep line).`,
  solutions: {
    java: `import java.util.*;

class Solution {
    public int[][] merge(int[][] intervals) {
        int[][] sorted = intervals.clone();
        Arrays.sort(sorted, Comparator.comparingInt(a -> a[0]));
        List<int[]> out = new ArrayList<>();
        for (int[] cur : sorted) {
            if (!out.isEmpty() && cur[0] <= out.get(out.size() - 1)[1]) {
                int[] last = out.get(out.size() - 1);
                last[1] = Math.max(last[1], cur[1]);
            } else {
                out.add(new int[]{cur[0], cur[1]});
            }
        }
        return out.toArray(new int[0][]);
    }
}
`,
    typescript: `function merge(intervals: number[][]): number[][] {
  const sorted = [...intervals].sort((a, b) => a[0] - b[0]);
  const out: number[][] = [];
  for (const [start, end] of sorted) {
    const last = out[out.length - 1];
    if (last && start <= last[1]) last[1] = Math.max(last[1], end);
    else out.push([start, end]);
  }
  return out;
}
`,
    python: `from typing import *

class Solution:
    def merge(self, intervals: List[List[int]]) -> List[List[int]]:
        out: list[list[int]] = []
        for start, end in sorted(intervals, key=lambda iv: iv[0]):
            if out and start <= out[-1][1]:
                out[-1][1] = max(out[-1][1], end)
            else:
                out.append([start, end])
        return out
`,
  },
  edgeCases: [
    "Touching intervals [1,4],[4,5] merge",
    "Containment [1,4],[2,3] → [1,4]",
    "Unsorted input",
    "One interval covering all others: [[2,3],[4,5],[6,7],[8,9],[1,10]]",
    "Single interval",
  ],
  expectedTime: "O(n log n)",
  expectedSpace: "O(n)",
  complexityNotes: "Sorting dominates; the sweep is linear. Output can contain up to n intervals.",
  commonMistakes: [
    "Forgetting max() when extending — breaks on contained intervals.",
    "Using < instead of <= so touching intervals are not merged.",
    "Mutating the input array when the caller does not expect it (mention it in interviews).",
    "Comparator a[0] − b[0] overflow with extreme values.",
  ],
  signature: { method: "merge", params: [{ name: "intervals", type: "int[][]" }], returns: "int[][]" },
  comparator: "unorderedList",
  tests: [
    {
      name: "example 1",
      args: [
        [
          [1, 3],
          [2, 6],
          [8, 10],
          [15, 18],
        ],
      ],
      expected: [
        [1, 6],
        [8, 10],
        [15, 18],
      ],
    },
    {
      name: "touching",
      args: [
        [
          [1, 4],
          [4, 5],
        ],
      ],
      expected: [[1, 5]],
    },
    {
      name: "same end",
      args: [
        [
          [1, 4],
          [0, 4],
        ],
      ],
      expected: [[0, 4]],
    },
    {
      name: "contained",
      args: [
        [
          [1, 4],
          [2, 3],
        ],
      ],
      expected: [[1, 4]],
    },
    { name: "single", args: [[[1, 4]]], expected: [[1, 4]] },
    {
      name: "unsorted disjoint",
      args: [
        [
          [5, 6],
          [1, 2],
          [3, 4],
        ],
      ],
      expected: [
        [1, 2],
        [3, 4],
        [5, 6],
      ],
    },
    {
      name: "one covers all",
      args: [
        [
          [2, 3],
          [4, 5],
          [6, 7],
          [8, 9],
          [1, 10],
        ],
      ],
      expected: [[1, 10]],
    },
  ],
  externalLinks: [
    { title: "LeetCode 56 — Merge Intervals", url: "https://leetcode.com/problems/merge-intervals/" },
  ],
};

export const numberOfIslands: ProblemDef = {
  slug: "number-of-islands",
  title: "Number of Islands",
  difficulty: "medium",
  order: 9,
  pattern: "Grid traversal (BFS/DFS flood fill)",
  tags: ["graph", "bfs", "dfs", "matrix", "union-find"],
  topics: ["bfs-dfs", "graphs"],
  targetMinutes: 25,
  summary: "Count connected components of land cells in a grid with flood fill.",
  statement: `Given an \`m × n\` 2D grid of characters where \`'1'\` is land and \`'0'\` is water, return the number of **islands**.

An island is a group of land cells connected **horizontally or vertically** (not diagonally). All four edges of the grid are surrounded by water.`,
  constraints: ["1 ≤ m, n ≤ 300", "grid[i][j] is '0' or '1'"],
  examples: [
    {
      input:
        'grid = [["1","1","1","1","0"],["1","1","0","1","0"],["1","1","0","0","0"],["0","0","0","0","0"]]',
      output: "1",
    },
    {
      input:
        'grid = [["1","1","0","0","0"],["1","1","0","0","0"],["0","0","1","0","0"],["0","0","0","1","1"]]',
      output: "3",
    },
  ],
  hints: [
    "Model the grid as a graph: each land cell is a node with edges to its 4 neighbours. What are you counting?",
    "You're counting connected components. Whenever you find unvisited land, explore its whole component and increase the counter once.",
    "Scan every cell; on an unvisited '1', run BFS (queue) or DFS (stack) marking reached land as visited (e.g. set it to '0'). Each cell is visited at most once.",
  ],
  approach: `### Graph framing
Cells are vertices; edges connect 4-directionally adjacent land cells. The answer is the number of **connected components** among land cells.

### Flood fill — O(m·n) time
Scan every cell. When you find land that hasn't been visited:
1. \`count++\`
2. Explore the entire island and mark each cell visited.

Exploration options:
- **BFS** with a queue — iterative, bounded memory by the frontier (O(min(m, n)) for a full grid).
- **Iterative DFS** with an explicit stack.
- **Recursive DFS** — shortest code, but recursion depth can reach m·n = 90 000 → \`StackOverflowError\` risk in Java with default stack. Say this out loud; interviewers love it.

Marking visited: overwrite \`'1'\` with \`'0'\` (mutates input — ask if allowed) or keep a \`boolean[m][n]\`.

Mark a cell visited **when you enqueue it**, not when you dequeue it, to avoid enqueuing the same cell multiple times.

### Alternative: Union-Find
Union adjacent land cells; count distinct roots. Useful when land arrives incrementally (Number of Islands II).`,
  solutions: {
    java: `import java.util.*;

class Solution {
    private static final int[][] DIRS = {{1, 0}, {-1, 0}, {0, 1}, {0, -1}};

    public int numIslands(char[][] grid) {
        int rows = grid.length, cols = grid[0].length, islands = 0;
        ArrayDeque<int[]> queue = new ArrayDeque<>();
        for (int r = 0; r < rows; r++) {
            for (int c = 0; c < cols; c++) {
                if (grid[r][c] != '1') continue;
                islands++;
                grid[r][c] = '0';
                queue.add(new int[]{r, c});
                while (!queue.isEmpty()) {
                    int[] cell = queue.poll();
                    for (int[] d : DIRS) {
                        int nr = cell[0] + d[0], nc = cell[1] + d[1];
                        if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] == '1') {
                            grid[nr][nc] = '0';
                            queue.add(new int[]{nr, nc});
                        }
                    }
                }
            }
        }
        return islands;
    }
}
`,
    typescript: `function numIslands(grid: string[][]): number {
  const rows = grid.length;
  const cols = grid[0].length;
  let islands = 0;
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (grid[r][c] !== "1") continue;
      islands++;
      grid[r][c] = "0";
      const stack: [number, number][] = [[r, c]];
      while (stack.length > 0) {
        const [cr, cc] = stack.pop()!;
        for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nr = cr + dr;
          const nc = cc + dc;
          if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] === "1") {
            grid[nr][nc] = "0";
            stack.push([nr, nc]);
          }
        }
      }
    }
  }
  return islands;
}
`,
    python: `from typing import *
from collections import deque

class Solution:
    def numIslands(self, grid: List[List[str]]) -> int:
        rows, cols = len(grid), len(grid[0])
        islands = 0
        for r in range(rows):
            for c in range(cols):
                if grid[r][c] != "1":
                    continue
                islands += 1
                grid[r][c] = "0"
                queue = deque([(r, c)])
                while queue:
                    cr, cc = queue.popleft()
                    for nr, nc in ((cr + 1, cc), (cr - 1, cc), (cr, cc + 1), (cr, cc - 1)):
                        if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] == "1":
                            grid[nr][nc] = "0"
                            queue.append((nr, nc))
        return islands
`,
  },
  edgeCases: [
    "All water → 0",
    "Single cell land / water",
    "Diagonal land cells are separate islands",
    "One row or one column grids",
    "Large all-land grid (recursion depth for recursive DFS)",
  ],
  expectedTime: "O(m·n)",
  expectedSpace: "O(m·n)",
  complexityNotes:
    "Each cell is visited a constant number of times. Worst-case auxiliary space is the queue/stack (or recursion depth) — O(m·n) for DFS on a snake-shaped island, O(min(m, n)) frontier for BFS on a full grid.",
  commonMistakes: [
    "Marking visited on dequeue instead of enqueue (duplicate work, can blow up the queue).",
    "Counting diagonal neighbours.",
    "Recursive DFS overflowing the stack on 300×300 grids in Java.",
    "Off-by-one bounds checks (r <= rows).",
  ],
  signature: { method: "numIslands", params: [{ name: "grid", type: "char[][]" }], returns: "int" },
  comparator: "exact",
  tests: [
    {
      name: "one big island",
      args: [
        [
          ["1", "1", "1", "1", "0"],
          ["1", "1", "0", "1", "0"],
          ["1", "1", "0", "0", "0"],
          ["0", "0", "0", "0", "0"],
        ],
      ],
      expected: 1,
    },
    {
      name: "three islands",
      args: [
        [
          ["1", "1", "0", "0", "0"],
          ["1", "1", "0", "0", "0"],
          ["0", "0", "1", "0", "0"],
          ["0", "0", "0", "1", "1"],
        ],
      ],
      expected: 3,
    },
    { name: "single land", args: [[["1"]]], expected: 1 },
    { name: "single water", args: [[["0"]]], expected: 0 },
    { name: "one row", args: [[["1", "0", "1", "0", "1"]]], expected: 3 },
    {
      name: "diagonal",
      args: [
        [
          ["1", "0"],
          ["0", "1"],
        ],
      ],
      expected: 2,
    },
    {
      name: "full block",
      args: [
        [
          ["1", "1"],
          ["1", "1"],
        ],
      ],
      expected: 1,
    },
  ],
  externalLinks: [
    { title: "LeetCode 200 — Number of Islands", url: "https://leetcode.com/problems/number-of-islands/" },
  ],
};

export const topKFrequent: ProblemDef = {
  slug: "top-k-frequent-elements",
  title: "Top K Frequent Elements",
  difficulty: "medium",
  order: 10,
  pattern: "Count + heap / bucket sort",
  tags: ["array", "hash-map", "heap", "bucket-sort"],
  topics: ["heaps", "hashmap-hashset"],
  targetMinutes: 20,
  summary: "Return the k most frequent values using counting plus a size-k heap or buckets.",
  statement: `Given an integer array \`nums\` and an integer \`k\`, return the \`k\` most frequent elements. You may return the answer in **any order**.

It is guaranteed that the answer is unique.`,
  constraints: [
    "1 ≤ nums.length ≤ 10⁵",
    "−10⁴ ≤ nums[i] ≤ 10⁴",
    "1 ≤ k ≤ number of distinct elements",
    "Follow-up: better than O(n log n)",
  ],
  examples: [
    { input: "nums = [1,1,1,2,2,3], k = 2", output: "[1,2]" },
    { input: "nums = [1], k = 1", output: "[1]" },
  ],
  hints: [
    "First compute how often each value occurs. Which structure does that in O(n)?",
    "Now you need the k largest counts. Sorting all distinct values works — can you avoid sorting everything?",
    "Keep a min-heap of size k keyed by frequency (pop when size > k) → O(n log k). Or bucket by frequency: index i holds values that occur i times; scan buckets from high to low → O(n).",
  ],
  approach: `### Step 1 — count: O(n)
\`HashMap<value, count>\`.

### Step 2 — select the k largest counts
| Approach | Time | Space | When to choose |
|---|---|---|---|
| Sort distinct values by count | O(d log d) | O(d) | Simplest baseline |
| **Min-heap of size k** | O(d log k) | O(k) extra | Streams, k ≪ d — explain why a *min*-heap: the root is the weakest of the current top-k and is the one to evict |
| **Bucket sort by frequency** | O(n) | O(n) | Meets the "better than n log n" follow-up; frequencies are bounded by n |
| Quickselect | O(d) average, O(d²) worst | O(d) | Mention as an option; tricky to implement under pressure |

(\`d\` = number of distinct values.)

### Bucket sort details
\`buckets[f]\` holds values with frequency \`f\` (1 ≤ f ≤ n). Walk \`f\` from n down to 1, collecting values until you have k.

### Java heap snippet
\`new PriorityQueue<>((a, b) -> Integer.compare(count.get(a), count.get(b)))\` — use \`Integer.compare\`, not subtraction, to avoid overflow habits.`,
  solutions: {
    java: `import java.util.*;

class Solution {
    public int[] topKFrequent(int[] nums, int k) {
        Map<Integer, Integer> count = new HashMap<>();
        for (int x : nums) count.merge(x, 1, Integer::sum);
        PriorityQueue<Integer> heap = new PriorityQueue<>((a, b) -> Integer.compare(count.get(a), count.get(b)));
        for (int value : count.keySet()) {
            heap.offer(value);
            if (heap.size() > k) heap.poll();
        }
        int[] out = new int[k];
        for (int i = k - 1; i >= 0; i--) out[i] = heap.poll();
        return out;
    }
}
`,
    typescript: `function topKFrequent(nums: number[], k: number): number[] {
  const count = new Map<number, number>();
  for (const x of nums) count.set(x, (count.get(x) ?? 0) + 1);
  const buckets: number[][] = Array.from({ length: nums.length + 1 }, () => []);
  for (const [value, freq] of count) buckets[freq].push(value);
  const out: number[] = [];
  for (let f = buckets.length - 1; f > 0 && out.length < k; f--) {
    for (const value of buckets[f]) {
      out.push(value);
      if (out.length === k) break;
    }
  }
  return out;
}
`,
    python: `from typing import *
from collections import Counter
import heapq

class Solution:
    def topKFrequent(self, nums: List[int], k: int) -> List[int]:
        count = Counter(nums)
        return heapq.nlargest(k, count.keys(), key=count.__getitem__)
`,
  },
  edgeCases: [
    "k equals the number of distinct values",
    "Single element",
    "Negative numbers",
    "One value dominates (k = 1)",
  ],
  expectedTime: "O(n log k)",
  expectedSpace: "O(n)",
  complexityNotes:
    "Counting is O(n). A size-k min-heap makes selection O(d log k); bucket sort achieves O(n). The count map needs O(d) ≤ O(n) space.",
  commonMistakes: [
    "Using a max-heap of all elements and popping k times when a size-k min-heap is expected (fine but explain the cost).",
    "Forgetting that frequencies range from 1..n when sizing buckets.",
    "Returning counts instead of values.",
  ],
  signature: {
    method: "topKFrequent",
    params: [
      { name: "nums", type: "int[]" },
      { name: "k", type: "int" },
    ],
    returns: "int[]",
  },
  comparator: "unorderedList",
  tests: [
    { name: "example 1", args: [[1, 1, 1, 2, 2, 3], 2], expected: [1, 2] },
    { name: "single", args: [[1], 1], expected: [1] },
    { name: "negatives", args: [[4, 1, -1, 2, -1, 2, 3], 2], expected: [-1, 2] },
    { name: "k equals distinct", args: [[1, 2], 2], expected: [1, 2] },
    { name: "dominant", args: [[5, 5, 5, 6, 6, 7, 7, 7, 7], 1], expected: [7] },
    { name: "zeros", args: [[3, 0, 1, 0], 1], expected: [0] },
  ],
  externalLinks: [
    {
      title: "LeetCode 347 — Top K Frequent Elements",
      url: "https://leetcode.com/problems/top-k-frequent-elements/",
    },
  ],
};
