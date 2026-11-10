---
slug: dynamic-programming
title: Dynamic programming fundamentals
path: dsa
module: dsa-techniques
order: 3
minutes: 70
depth: full
practice: coding
summary: Define the state, write the transition, order the computation — a repeatable method instead of memorised solutions.
prerequisites: [recursion, greedy]
problems: [best-time-to-buy-and-sell-stock]
objectives:
  - Recognise overlapping subproblems and optimal substructure
  - Define a DP state precisely and derive its recurrence and base cases
  - Convert memoized recursion into bottom-up tabulation and reduce space
  - Solve the 1D, 2D and knapsack-style families that dominate interviews
readings:
  - title: "MIT 6.006 — dynamic programming lectures (SRTBOT framework)"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
  - title: "cp-algorithms — dynamic programming section"
    url: https://cp-algorithms.com/
    kind: docs
  - title: "Python docs — functools.cache"
    url: https://docs.python.org/3/library/functools.html#functools.cache
    kind: docs
interview:
  - q: "How do you decide whether a problem is DP?"
    a: "It asks for an optimum or a count over choices, a naive recursion recomputes the same subproblems (overlapping), and the answer for a state can be built from answers for smaller states (optimal substructure)."
  - q: "Coin change (min coins for an amount) — state and transition?"
    a: "dp[a] = min coins to make amount a; dp[0] = 0; dp[a] = 1 + min(dp[a − c]) over coins c ≤ a with dp[a − c] reachable. O(amount × coins) time, O(amount) space."
  - q: "Top-down vs bottom-up — trade-offs?"
    a: "Top-down (memoized recursion) is closer to the recurrence and computes only reachable states but has recursion overhead/depth limits. Bottom-up iterates in dependency order, avoids recursion and enables rolling-array space optimisation."
selfAssessment:
  - I can state the meaning of dp[i] in one sentence before coding
  - I can turn a memoized solution into tabulation
  - I can reduce 2D DP to O(n) space when rows depend only on the previous row
completion:
  - Score at least 70% on the quiz
  - Explain the DP method on coin change in interview mode
  - Solve climbing stairs, house robber and coin change without hints
quiz:
  - q: "House robber (no two adjacent houses): dp[i] ="
    options: ["dp[i−1] + nums[i]", "max(dp[i−1], dp[i−2] + nums[i])", "max(nums[i], dp[i−1])", "dp[i−2] + dp[i−1]"]
    answer: 1
    why: "Either skip house i or rob it plus the best up to i−2."
  - q: "Longest common subsequence of strings of length m and n costs:"
    options: ["O(m + n)", "O(m·n)", "O(2^(m+n))", "O((m+n) log(m+n))"]
    answer: 1
    why: "An m×n table, O(1) per cell."
  - q: "Memoization changes naive Fibonacci from exponential to:"
    options: ["O(log n)", "O(n)", "O(n²)", "O(n log n)"]
    answer: 1
    why: "Each of the n subproblems is computed once."
  - q: "In 0/1 knapsack with a 1D dp array over capacity, capacities must be iterated:"
    options: ["Increasing", "Decreasing", "In any order", "Randomly"]
    answer: 1
    why: "Decreasing order ensures each item is used at most once (increasing gives unbounded knapsack)."
explain:
  prompt: "Walk through how you'd solve 'minimum number of coins to make an amount' with dynamic programming, from state definition to complexity."
  rubric:
    - "Explains why greedy fails or why DP is needed (overlapping subproblems)"
    - "Defines the state precisely: dp[a] = min coins for amount a"
    - "Gives base case dp[0] = 0 and unreachable as infinity"
    - "Transition dp[a] = 1 + min over coins of dp[a − c]"
    - "Order of computation (a from 1 to amount), answer and −1 if unreachable, O(amount·k) time and O(amount) space"
  model: "Greedy fails for denominations like 1, 3, 4 with amount 6, and a plain recursion recomputes the same remaining amounts many times, so I'd use DP. My state is dp[a], the minimum number of coins that sum exactly to a. The base case is dp[0] = 0, and I initialise everything else to infinity to mean unreachable. For each amount a from 1 upward, dp[a] = 1 + min of dp[a − c] over coins c ≤ a whose dp value is finite. Computing amounts in increasing order guarantees the smaller states are ready. The answer is dp[amount], or −1 if it's still infinite. That's O(amount × number of coins) time and O(amount) space."
cards:
  - q: "DP checklist"
    a: "State meaning → base cases → transition → computation order → answer location → complexity."
  - q: "Space optimisation"
    a: "If row i depends only on row i−1, keep two rows (or one, iterating carefully)."
  - q: "0/1 vs unbounded knapsack (1D)"
    a: "0/1: iterate capacity downward; unbounded: upward."
---

## Explanation

Dynamic programming = **recursion + reuse**. If a recursive solution solves the same subproblem many times, store each answer once.

### The method (say these steps out loud)

1. **State**: what does `dp[i]` (or `dp[i][j]`) mean, in one precise sentence?
2. **Transition**: how is a state computed from smaller states?
3. **Base cases**: the smallest states answered directly.
4. **Order**: compute states so dependencies are ready (or memoize top-down).
5. **Answer**: which state holds it?
6. **Complexity**: (#states) × (work per state); then optimise space.

### Top-down vs bottom-up

```python
from functools import cache
@cache
def climb(n):                  # top-down
    return 1 if n <= 1 else climb(n - 1) + climb(n - 2)

def climb_bottom_up(n):        # bottom-up, O(1) space
    a, b = 1, 1
    for _ in range(n - 1): a, b = b, a + b
    return b
```

### Families you should recognise

| Family | Example | State |
|---|---|---|
| 1D linear | climbing stairs, house robber, decode ways | best/count up to i |
| 1D over values | coin change, perfect squares | best for amount a |
| 2D strings | LCS, edit distance | prefixes i of A, j of B |
| 2D grid | unique paths, min path sum | best to reach (r, c) |
| Knapsack | partition equal subset sum | items considered × capacity |
| Intervals/subsequences | longest increasing subsequence | best ending at i (O(n²)), or patience sorting O(n log n) |

### Greedy vs DP

If one choice provably dominates (exchange argument), greedy suffices. Otherwise consider all choices and take the best — that's DP.

## Worked examples

### Example 1 — house robber

```java
int rob(int[] nums) {
    int prev2 = 0, prev1 = 0;            // best up to i−2, i−1
    for (int x : nums) {
        int cur = Math.max(prev1, prev2 + x);
        prev2 = prev1; prev1 = cur;
    }
    return prev1;
}
```

### Example 2 — longest common subsequence

```python
def lcs(a: str, b: str) -> int:
    m, n = len(a), len(b)
    dp = [[0] * (n + 1) for _ in range(m + 1)]     # dp[i][j]: LCS of a[:i], b[:j]
    for i in range(1, m + 1):
        for j in range(1, n + 1):
            if a[i - 1] == b[j - 1]: dp[i][j] = dp[i - 1][j - 1] + 1
            else: dp[i][j] = max(dp[i - 1][j], dp[i][j - 1])
    return dp[m][n]
```
The extra row/column for empty prefixes removes edge-case code.

### Example 3 — best time to buy and sell stock as DP

`hold[i] = max(hold[i−1], −price[i])`, `free[i] = max(free[i−1], hold[i−1] + price[i])`. The one-pass "min so far" solution is this DP with O(1) space — a good bridge between greedy intuition and state machines (with cooldown or k transactions you add states).

## Common misconceptions

- **"DP means a table."** — Memoized recursion is DP too.
- **"Define the state later."** — Most DP bugs come from a vague state definition.
- **"Space optimisation first."** — Get the full table right, then compress.
- **"Off-by-one is unavoidable."** — Use (n+1)-sized tables for prefix states.

## Practical exercises

1. Solve climbing stairs, house robber and coin change; for each write the state sentence first.
2. Solve LCS and edit distance; draw the table for a small example.
3. Solve partition equal subset sum with a 1D boolean array iterating capacity downward.
4. Re-solve **Best Time to Buy and Sell Stock** as a two-state DP.
