import type { ProblemDef } from "@/lib/content/defs";

export const twoSum: ProblemDef = {
  slug: "two-sum",
  title: "Two Sum",
  difficulty: "easy",
  order: 1,
  pattern: "Hash map lookup (complement search)",
  tags: ["array", "hash-map"],
  topics: ["hashmap-hashset", "arrays-strings"],
  targetMinutes: 15,
  summary: "Find the indices of two numbers that add up to a target, in one pass with a hash map.",
  statement: `Given an array of integers \`nums\` and an integer \`target\`, return the **indices** of the two numbers that add up to \`target\`.

You may assume that each input has **exactly one** solution, and you may not use the same element twice. You can return the answer in any order.`,
  constraints: [
    "2 ≤ nums.length ≤ 10⁴",
    "−10⁹ ≤ nums[i] ≤ 10⁹",
    "−10⁹ ≤ target ≤ 10⁹",
    "Exactly one valid answer exists",
  ],
  examples: [
    { input: "nums = [2,7,11,15], target = 9", output: "[0,1]", explanation: "nums[0] + nums[1] = 2 + 7 = 9" },
    { input: "nums = [3,2,4], target = 6", output: "[1,2]" },
    { input: "nums = [3,3], target = 6", output: "[0,1]" },
  ],
  hints: [
    "For a fixed element x, which other value would complete the pair? Can you check for it faster than scanning the whole array?",
    "A hash map gives average O(1) lookups. What should the key be and what should the value be?",
    "Iterate once. Before inserting nums[i], look up target − nums[i] among the elements you have already seen. Checking before inserting also handles duplicates like [3,3] and prevents using the same element twice.",
  ],
  approach: `### 1. Brute force — O(n²) time, O(1) space
Check every pair \`(i, j)\` with \`i < j\`. Correct and a fine thing to *say* first in an interview, but 10⁴ elements means ~5·10⁷ pair checks.

### 2. Sort + two pointers — O(n log n) time, O(n) space
Sorting destroys the original indices, so you must sort *(value, index)* pairs. It works, but it is more code and slower than necessary.

### 3. One-pass hash map — O(n) time, O(n) space ✅
Walk the array once. For each \`nums[i]\`, the partner we need is \`complement = target − nums[i]\`.
- If \`complement\` is already in the map, we have seen its index earlier → return \`[map[complement], i]\`.
- Otherwise store \`nums[i] → i\` and continue.

**Why look up before inserting?** It guarantees the partner has a *different* index, and it naturally handles duplicates: for \`[3,3]\` with target 6, the first 3 is stored, and the second 3 finds it.

**Invariant:** after processing index \`i\`, the map contains every value from \`nums[0..i]\` mapped to its (latest) index. Any valid pair \`(j, i)\` with \`j < i\` is therefore detected exactly when we reach \`i\`.

### Talking points
- Java's \`HashMap.get\` relies on \`hashCode()\`/\`equals()\` of \`Integer\` — boxing costs allocations, but that's fine here.
- Worst-case HashMap operations can degrade (Java 8+ treeifies large buckets to O(log n)); average case is O(1).
- If the input were already sorted, two pointers would give O(1) extra space — mention this trade-off.`,
  solutions: {
    java: `import java.util.*;

class Solution {
    public int[] twoSum(int[] nums, int target) {
        Map<Integer, Integer> seen = new HashMap<>();
        for (int i = 0; i < nums.length; i++) {
            int complement = target - nums[i];
            Integer j = seen.get(complement);
            if (j != null) return new int[]{j, i};
            seen.put(nums[i], i);
        }
        throw new IllegalArgumentException("no solution");
    }
}
`,
    typescript: `function twoSum(nums: number[], target: number): number[] {
  const seen = new Map<number, number>();
  for (let i = 0; i < nums.length; i++) {
    const j = seen.get(target - nums[i]);
    if (j !== undefined) return [j, i];
    seen.set(nums[i], i);
  }
  throw new Error("no solution");
}
`,
    python: `from typing import *

class Solution:
    def twoSum(self, nums: List[int], target: int) -> List[int]:
        seen: dict[int, int] = {}
        for i, x in enumerate(nums):
            j = seen.get(target - x)
            if j is not None:
                return [j, i]
            seen[x] = i
        raise ValueError("no solution")
`,
  },
  edgeCases: [
    "Duplicates that form the answer: [3,3], target 6",
    "Negative numbers and a negative target",
    "Zeros: [0,4,3,0], target 0",
    "The answer uses the last element",
    "Values near ±10⁹ — target − x stays within 32-bit range here, but mention overflow awareness",
  ],
  expectedTime: "O(n)",
  expectedSpace: "O(n)",
  complexityNotes:
    "One pass with average O(1) map operations. The map stores at most n entries. Worst-case hash collisions are mitigated in Java 8+ by treeified buckets (O(log n) per operation).",
  commonMistakes: [
    "Inserting before checking, which lets an element pair with itself (e.g. target 6 with a single 3).",
    "Returning values instead of indices.",
    "Sorting the array and losing the original indices.",
    "Using `if (seen.get(x))` in TypeScript — index 0 is falsy; compare against undefined.",
  ],
  signature: {
    method: "twoSum",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returns: "int[]",
  },
  comparator: "unorderedList",
  tests: [
    { name: "example 1", args: [[2, 7, 11, 15], 9], expected: [0, 1] },
    { name: "example 2", args: [[3, 2, 4], 6], expected: [1, 2] },
    { name: "duplicates", args: [[3, 3], 6], expected: [0, 1] },
    { name: "negatives", args: [[-1, -2, -3, -4, -5], -8], expected: [2, 4] },
    { name: "zeros", args: [[0, 4, 3, 0], 0], expected: [0, 3] },
    { name: "last two", args: [[1, 5, 9, 13, 21], 34], expected: [3, 4] },
    { name: "middle and last", args: [[5, 75, 25], 100], expected: [1, 2] },
  ],
  externalLinks: [{ title: "LeetCode 1 — Two Sum", url: "https://leetcode.com/problems/two-sum/" }],
};

export const validParentheses: ProblemDef = {
  slug: "valid-parentheses",
  title: "Valid Parentheses",
  difficulty: "easy",
  order: 2,
  pattern: "Stack for nested structure",
  tags: ["string", "stack"],
  topics: ["stack-queue"],
  targetMinutes: 15,
  summary: "Decide whether brackets are correctly nested and closed using a stack.",
  statement: `Given a string \`s\` containing only the characters \`'('\`, \`')'\`, \`'{'\`, \`'}'\`, \`'['\` and \`']'\`, determine whether the input is valid.

A string is valid if:
1. Every opening bracket is closed by a bracket of the same type.
2. Brackets are closed in the correct order.
3. Every closing bracket has a corresponding opening bracket.`,
  constraints: ["1 ≤ s.length ≤ 10⁴", "s consists of parentheses only: ()[]{}"],
  examples: [
    { input: 's = "()"', output: "true" },
    { input: 's = "()[]{}"', output: "true" },
    { input: 's = "(]"', output: "false" },
    { input: 's = "([)]"', output: "false", explanation: "The brackets are closed in the wrong order." },
  ],
  hints: [
    "When you meet a closing bracket, which opening bracket must it match?",
    "The most recent unmatched opening bracket must be closed first — last in, first out.",
    "Push opening brackets on a stack. On a closing bracket, the stack must be non-empty and its top must be the matching opener. At the end the stack must be empty.",
  ],
  approach: `### Why a stack?
Brackets nest: the bracket opened **last** must be closed **first**. That's exactly LIFO order.

### Algorithm — O(n) time, O(n) space
1. Map each closer to its opener: \`) → (\`, \`] → [\`, \`} → {\`.
2. For each character:
   - opener → push it.
   - closer → if the stack is empty or the top is not the matching opener → **invalid**; otherwise pop.
3. Valid iff the stack is empty at the end (no unclosed openers).

### Quick rejections worth mentioning
- Odd length can never be valid.
- A counter-based approach works only for **one** bracket type; with three types, \`([)]\` has balanced counts but is invalid — a good counterexample to bring up.

### Java detail
Prefer \`ArrayDeque<Character>\` over the legacy synchronized \`Stack\` class.`,
  solutions: {
    java: `import java.util.*;

class Solution {
    public boolean isValid(String s) {
        if (s.length() % 2 == 1) return false;
        Deque<Character> stack = new ArrayDeque<>();
        for (char c : s.toCharArray()) {
            switch (c) {
                case '(', '[', '{' -> stack.push(c);
                case ')' -> { if (stack.isEmpty() || stack.pop() != '(') return false; }
                case ']' -> { if (stack.isEmpty() || stack.pop() != '[') return false; }
                case '}' -> { if (stack.isEmpty() || stack.pop() != '{') return false; }
                default -> { return false; }
            }
        }
        return stack.isEmpty();
    }
}
`,
    typescript: `function isValid(s: string): boolean {
  const pairs: Record<string, string> = { ")": "(", "]": "[", "}": "{" };
  const stack: string[] = [];
  for (const c of s) {
    if (c === "(" || c === "[" || c === "{") stack.push(c);
    else if (stack.pop() !== pairs[c]) return false;
  }
  return stack.length === 0;
}
`,
    python: `from typing import *

class Solution:
    def isValid(self, s: str) -> bool:
        pairs = {")": "(", "]": "[", "}": "{"}
        stack: list[str] = []
        for c in s:
            if c in "([{":
                stack.append(c)
            elif not stack or stack.pop() != pairs[c]:
                return False
        return not stack
`,
  },
  edgeCases: [
    'Only openers: "((" → false (stack not empty at the end)',
    'Starts with a closer: "]" → false (pop from empty stack)',
    'Interleaved types: "([)]" → false',
    'Deep nesting: "(([]){})" → true',
  ],
  expectedTime: "O(n)",
  expectedSpace: "O(n)",
  complexityNotes: "Each character is pushed and popped at most once. In the worst case (all openers) the stack holds n characters.",
  commonMistakes: [
    "Forgetting the final emptiness check.",
    "Popping from an empty stack (exception in Java, undefined in TS).",
    "Using three counters, which cannot detect wrong ordering.",
    "Using java.util.Stack (synchronized, legacy) instead of ArrayDeque.",
  ],
  signature: { method: "isValid", params: [{ name: "s", type: "string" }], returns: "boolean" },
  comparator: "exact",
  tests: [
    { name: "single pair", args: ["()"], expected: true },
    { name: "sequence", args: ["()[]{}"], expected: true },
    { name: "mismatch", args: ["(]"], expected: false },
    { name: "wrong order", args: ["([)]"], expected: false },
    { name: "nested", args: ["{[]}"], expected: true },
    { name: "unclosed", args: ["(("], expected: false },
    { name: "starts with closer", args: ["]"], expected: false },
    { name: "deep nesting", args: ["(([]){})"], expected: true },
  ],
  externalLinks: [{ title: "LeetCode 20 — Valid Parentheses", url: "https://leetcode.com/problems/valid-parentheses/" }],
};

export const bestTimeToBuyAndSellStock: ProblemDef = {
  slug: "best-time-to-buy-and-sell-stock",
  title: "Best Time to Buy and Sell Stock",
  difficulty: "easy",
  order: 3,
  pattern: "Running minimum (one pass)",
  tags: ["array", "greedy", "dynamic-programming"],
  topics: ["arrays-strings", "greedy"],
  targetMinutes: 15,
  summary: "Maximize profit from one buy and one later sell by tracking the cheapest price so far.",
  statement: `You are given an array \`prices\` where \`prices[i]\` is the price of a stock on day \`i\`.

You want to maximize your profit by choosing **one day to buy** and a **different, later day to sell**. Return the maximum profit you can achieve. If no profit is possible, return \`0\`.`,
  constraints: ["1 ≤ prices.length ≤ 10⁵", "0 ≤ prices[i] ≤ 10⁴"],
  examples: [
    { input: "prices = [7,1,5,3,6,4]", output: "5", explanation: "Buy on day 1 (price 1), sell on day 4 (price 6)." },
    { input: "prices = [7,6,4,3,1]", output: "0", explanation: "Prices only fall; do not trade." },
  ],
  hints: [
    "If you sell on day i, what is the best possible day to have bought?",
    "The best buy day for selling on day i is the minimum price among days 0..i−1.",
    "Scan left to right keeping minSoFar; at each day update best = max(best, price − minSoFar), then minSoFar = min(minSoFar, price).",
  ],
  approach: `### Reframe the question
For every possible **sell day** \`i\`, the best buy is the cheapest price **before** \`i\`. So the answer is
\`max over i of (prices[i] − min(prices[0..i−1]))\`, clamped at 0.

### One pass — O(n) time, O(1) space
Keep \`minSoFar\` (cheapest price seen) and \`best\` (best profit seen):
\`\`\`
for price in prices:
    best = max(best, price - minSoFar)
    minSoFar = min(minSoFar, price)
\`\`\`
Updating \`best\` before \`minSoFar\` enforces "sell after buy"; with the opposite order you'd compute \`price − price = 0\`, which is harmless here but worth reasoning about out loud.

### Connection to dynamic programming
This is Kadane's algorithm on the array of daily differences: the max subarray sum of \`prices[i] − prices[i−1]\` equals the best single transaction. Mentioning this shows pattern recognition.

### Why not "global min and global max"?
The global max may occur **before** the global min (\`[7,6,4,3,1]\`), so order matters.`,
  solutions: {
    java: `class Solution {
    public int maxProfit(int[] prices) {
        int minSoFar = Integer.MAX_VALUE;
        int best = 0;
        for (int price : prices) {
            if (minSoFar != Integer.MAX_VALUE) best = Math.max(best, price - minSoFar);
            minSoFar = Math.min(minSoFar, price);
        }
        return best;
    }
}
`,
    typescript: `function maxProfit(prices: number[]): number {
  let minSoFar = Infinity;
  let best = 0;
  for (const price of prices) {
    best = Math.max(best, price - minSoFar);
    minSoFar = Math.min(minSoFar, price);
  }
  return best;
}
`,
    python: `from typing import *

class Solution:
    def maxProfit(self, prices: List[int]) -> int:
        min_so_far = float("inf")
        best = 0
        for price in prices:
            best = max(best, price - min_so_far)
            min_so_far = min(min_so_far, price)
        return int(best)
`,
  },
  edgeCases: [
    "Single day → 0 (no transaction possible)",
    "Strictly decreasing prices → 0",
    "Minimum occurs after the maximum: [2,4,1] → 2",
    "All prices equal → 0",
  ],
  expectedTime: "O(n)",
  expectedSpace: "O(1)",
  complexityNotes: "One linear scan with two scalar variables.",
  commonMistakes: [
    "Returning globalMax − globalMin without checking order.",
    "Integer overflow when initializing min with MAX_VALUE and subtracting in Java (price − MAX_VALUE is negative, fine, but be explicit).",
    "O(n²) nested loops — too slow for 10⁵ elements.",
  ],
  signature: { method: "maxProfit", params: [{ name: "prices", type: "int[]" }], returns: "int" },
  comparator: "exact",
  tests: [
    { name: "example 1", args: [[7, 1, 5, 3, 6, 4]], expected: 5 },
    { name: "falling", args: [[7, 6, 4, 3, 1]], expected: 0 },
    { name: "single day", args: [[1]], expected: 0 },
    { name: "min after max", args: [[2, 4, 1]], expected: 2 },
    { name: "late recovery", args: [[3, 2, 6, 5, 0, 3]], expected: 4 },
    { name: "two days rising", args: [[1, 2]], expected: 1 },
    { name: "flat", args: [[5, 5, 5]], expected: 0 },
  ],
  externalLinks: [
    { title: "LeetCode 121 — Best Time to Buy and Sell Stock", url: "https://leetcode.com/problems/best-time-to-buy-and-sell-stock/" },
  ],
};

export const binarySearch: ProblemDef = {
  slug: "binary-search",
  title: "Binary Search",
  difficulty: "easy",
  order: 4,
  pattern: "Binary search with a loop invariant",
  tags: ["array", "binary-search"],
  topics: ["binary-search"],
  targetMinutes: 10,
  summary: "Find a target in a sorted array in O(log n) with correct boundaries.",
  statement: `Given an array of integers \`nums\` sorted in **ascending order** and an integer \`target\`, return the index of \`target\` if it exists, otherwise return \`-1\`.

You must write an algorithm with **O(log n)** runtime complexity.`,
  constraints: ["1 ≤ nums.length ≤ 10⁴", "−10⁴ < nums[i], target < 10⁴", "All integers in nums are unique", "nums is sorted ascending"],
  examples: [
    { input: "nums = [-1,0,3,5,9,12], target = 9", output: "4" },
    { input: "nums = [-1,0,3,5,9,12], target = 2", output: "-1" },
  ],
  hints: [
    "Compare the target with the middle element. Which half can you discard?",
    "Decide on an invariant before coding, e.g. 'if the target exists, it is inside [lo, hi]'. Every update must preserve it.",
    "With the closed interval [lo, hi]: loop while lo <= hi; mid = lo + (hi − lo) / 2; move lo = mid + 1 or hi = mid − 1. Return −1 when the interval becomes empty.",
  ],
  approach: `### The invariant is the algorithm
Pick one convention and keep it consistent. **Closed interval** \`[lo, hi]\`:
- Invariant: if \`target\` exists, its index is in \`[lo, hi]\`.
- Loop while the interval is non-empty: \`lo <= hi\`.
- \`mid = lo + (hi - lo) / 2\` (avoids \`(lo + hi)\` overflow in Java/C++ for large indices).
- \`nums[mid] < target\` → target is right of mid → \`lo = mid + 1\`.
- \`nums[mid] > target\` → \`hi = mid - 1\`.
- Equal → return \`mid\`.

Each iteration removes at least one element (mid itself), so the loop terminates; the interval halves, so it runs ⌊log₂ n⌋ + 1 times at most.

### Half-open alternative
\`[lo, hi)\` with \`while (lo < hi)\` and \`hi = mid\`. Equally correct — mixing the two conventions is where off-by-one bugs and infinite loops come from.

### Generalization (very common in interviews)
"Find the first index where \`predicate(i)\` becomes true" (lower bound) solves: first bad version, insert position, search in rotated array, minimum capacity problems. Practise writing the lower-bound template from memory.`,
  solutions: {
    java: `class Solution {
    public int search(int[] nums, int target) {
        int lo = 0, hi = nums.length - 1;
        while (lo <= hi) {
            int mid = lo + (hi - lo) / 2;
            if (nums[mid] == target) return mid;
            if (nums[mid] < target) lo = mid + 1;
            else hi = mid - 1;
        }
        return -1;
    }
}
`,
    typescript: `function search(nums: number[], target: number): number {
  let lo = 0;
  let hi = nums.length - 1;
  while (lo <= hi) {
    const mid = lo + ((hi - lo) >> 1);
    if (nums[mid] === target) return mid;
    if (nums[mid] < target) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}
`,
    python: `from typing import *

class Solution:
    def search(self, nums: List[int], target: int) -> int:
        lo, hi = 0, len(nums) - 1
        while lo <= hi:
            mid = (lo + hi) // 2
            if nums[mid] == target:
                return mid
            if nums[mid] < target:
                lo = mid + 1
            else:
                hi = mid - 1
        return -1
`,
  },
  edgeCases: [
    "Single element equal / not equal to target",
    "Target at index 0 or at the last index",
    "Target smaller than all elements or larger than all elements",
    "Two elements (mid rounding behaviour)",
  ],
  expectedTime: "O(log n)",
  expectedSpace: "O(1)",
  complexityNotes: "The search interval halves each iteration; iterative implementation uses constant extra space (a recursive one would use O(log n) stack).",
  commonMistakes: [
    "while (lo < hi) with hi = mid − 1 — skips the last candidate.",
    "lo = mid instead of mid + 1 — infinite loop when hi = lo + 1.",
    "(lo + hi) / 2 overflow for very large arrays in Java.",
    "Mixing closed and half-open conventions in one implementation.",
  ],
  signature: {
    method: "search",
    params: [
      { name: "nums", type: "int[]" },
      { name: "target", type: "int" },
    ],
    returns: "int",
  },
  comparator: "exact",
  tests: [
    { name: "found", args: [[-1, 0, 3, 5, 9, 12], 9], expected: 4 },
    { name: "missing", args: [[-1, 0, 3, 5, 9, 12], 2], expected: -1 },
    { name: "single hit", args: [[5], 5], expected: 0 },
    { name: "single miss", args: [[5], -5], expected: -1 },
    { name: "two elements, right", args: [[1, 3], 3], expected: 1 },
    { name: "first index", args: [[1, 3, 5, 7, 9, 11], 1], expected: 0 },
    { name: "last index", args: [[2, 4, 6, 8], 8], expected: 3 },
    { name: "larger than all", args: [[2, 4, 6, 8], 9], expected: -1 },
  ],
  externalLinks: [{ title: "LeetCode 704 — Binary Search", url: "https://leetcode.com/problems/binary-search/" }],
};

export const linkedListCycle: ProblemDef = {
  slug: "linked-list-cycle",
  title: "Linked List Cycle",
  difficulty: "easy",
  order: 5,
  pattern: "Fast & slow pointers (Floyd)",
  tags: ["linked-list", "two-pointers", "hash-set"],
  topics: ["linked-lists", "two-pointers"],
  targetMinutes: 15,
  summary: "Detect a cycle in a singly linked list with O(1) extra memory.",
  statement: `Given \`head\`, the head of a singly linked list, determine whether the list contains a **cycle**.

A cycle exists if some node can be reached again by continuously following \`next\` pointers.

**Test input format (internal):** tests describe the list as \`values\` plus \`pos\` — the index the tail's \`next\` points to, or \`-1\` for no cycle. \`pos\` is **not** passed to your function; you only receive \`head\`.`,
  constraints: ["0 ≤ number of nodes ≤ 10⁴", "−10⁵ ≤ Node.val ≤ 10⁵", "Follow-up: O(1) extra memory"],
  examples: [
    { input: "head = [3,2,0,-4], pos = 1", output: "true", explanation: "The tail connects back to the node with value 2." },
    { input: "head = [1,2], pos = 0", output: "true" },
    { input: "head = [1], pos = -1", output: "false" },
  ],
  hints: [
    "A simple solution remembers every visited node. Which data structure gives O(1) membership checks? What does it cost in memory?",
    "For O(1) memory: imagine two runners on a circular track moving at different speeds.",
    "Move slow by 1 and fast by 2. If fast reaches null, there is no cycle. If there is a cycle, fast eventually lands on slow — the gap shrinks by one node every step.",
  ],
  approach: `### Option A — visited set: O(n) time, O(n) space
Store node **references** (not values — values can repeat) in a hash set; seeing a node twice means a cycle.

### Option B — Floyd's tortoise and hare: O(n) time, O(1) space ✅
\`slow\` advances one node, \`fast\` two nodes per step.
- No cycle → \`fast\` (or \`fast.next\`) hits \`null\` → return false.
- Cycle → once both are inside the cycle, the distance from \`fast\` to \`slow\` (measured forward) **decreases by exactly 1** each step, so it must reach 0: they meet. It can't "jump over" because the gap shrinks by one, not two.

Once both are in a cycle of length \`L\`, they meet within \`L\` steps, so total work is O(n).

### Follow-up you may get
*"Return the node where the cycle begins."* After meeting, reset one pointer to \`head\` and move both one step at a time; they meet at the cycle start. Be ready to sketch why: if the tail has length \`a\` and they met \`b\` steps into a cycle of length \`L\`, then \`a ≡ L − b (mod L)\`.

### Null-safety
The loop condition \`fast != null && fast.next != null\` must be checked **before** advancing \`fast.next.next\`.`,
  solutions: {
    java: `class Solution {
    public boolean hasCycle(ListNode head) {
        ListNode slow = head, fast = head;
        while (fast != null && fast.next != null) {
            slow = slow.next;
            fast = fast.next.next;
            if (slow == fast) return true;
        }
        return false;
    }
}
`,
    typescript: `function hasCycle(head: ListNode | null): boolean {
  let slow = head;
  let fast = head;
  while (fast !== null && fast.next !== null) {
    slow = slow!.next;
    fast = fast.next.next;
    if (slow === fast) return true;
  }
  return false;
}
`,
    python: `from typing import *

class Solution:
    def hasCycle(self, head: Optional[ListNode]) -> bool:
        slow = fast = head
        while fast is not None and fast.next is not None:
            slow = slow.next
            fast = fast.next.next
            if slow is fast:
                return True
        return False
`,
  },
  edgeCases: [
    "Empty list (head = null) → false",
    "Single node without cycle → false",
    "Single node pointing to itself → true",
    "Cycle at the tail (last node points to itself)",
    "Long acyclic list",
  ],
  expectedTime: "O(n)",
  expectedSpace: "O(1)",
  complexityNotes: "Fast pointer either reaches the end in ≤ n/2 steps or both pointers enter the cycle and meet within one cycle length.",
  commonMistakes: [
    "Comparing node values instead of node identity.",
    "Dereferencing fast.next.next without checking fast.next.",
    "Checking slow == fast before the first move (they start equal).",
  ],
  signature: { method: "hasCycle", params: [{ name: "head", type: "linkedListWithCycle" }], returns: "boolean" },
  comparator: "exact",
  tests: [
    { name: "example 1", args: [{ values: [3, 2, 0, -4], pos: 1 }], expected: true },
    { name: "two nodes cycle", args: [{ values: [1, 2], pos: 0 }], expected: true },
    { name: "single node", args: [{ values: [1], pos: -1 }], expected: false },
    { name: "empty list", args: [{ values: [], pos: -1 }], expected: false },
    { name: "no cycle", args: [{ values: [1, 2, 3, 4, 5], pos: -1 }], expected: false },
    { name: "self loop", args: [{ values: [1], pos: 0 }], expected: true },
    { name: "tail self loop", args: [{ values: [1, 2, 3, 4, 5, 6], pos: 5 }], expected: true },
    { name: "repeated values, no cycle", args: [{ values: [1, 1, 1, 1], pos: -1 }], expected: false },
  ],
  externalLinks: [{ title: "LeetCode 141 — Linked List Cycle", url: "https://leetcode.com/problems/linked-list-cycle/" }],
};
