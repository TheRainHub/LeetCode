---
slug: greedy
title: Greedy algorithms
path: dsa
module: dsa-techniques
order: 2
minutes: 40
depth: concise
practice: coding
summary: Make the locally best choice — but only after you can argue (exchange argument) that it never hurts the global answer.
prerequisites: [sorting]
problems: [best-time-to-buy-and-sell-stock, merge-intervals]
objectives:
  - Recognise problems with the greedy-choice property
  - Justify a greedy algorithm with an exchange argument or a counterexample
  - Apply classic greedy patterns — interval scheduling, jump game, gas station
readings:
  - title: "MIT 6.006 — greedy algorithms and exchange arguments"
    url: https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/
    kind: course
  - title: "cp-algorithms"
    url: https://cp-algorithms.com/
    kind: docs
interview:
  - q: "Maximum number of non-overlapping intervals — which greedy rule and why?"
    a: "Sort by end time and always take the interval that ends earliest. Exchange argument: any optimal solution can swap its first interval for the earliest-ending one without losing compatibility, freeing the most room for the rest."
  - q: "Why does greedy fail for coin change with denominations {1, 3, 4} and amount 6?"
    a: "Greedy takes 4+1+1 (3 coins) but 3+3 (2 coins) is optimal. The greedy-choice property doesn't hold for arbitrary denominations; use DP."
selfAssessment:
  - I can give an exchange argument for interval scheduling
  - I look for a counterexample before trusting a greedy idea
completion:
  - Score at least 70% on the quiz
  - Explain the exchange argument in interview mode
quiz:
  - q: "Jump game (can you reach the last index?) is solved greedily by:"
    options: ["Trying all paths", "Tracking the furthest reachable index while scanning", "Sorting the array", "BFS only"]
    answer: 1
    why: "If the current index exceeds the furthest reach, you're stuck; O(n)."
  - q: "For interval scheduling (max non-overlapping), sorting by start time and taking the earliest start is:"
    options: ["Optimal", "Not optimal — a long early interval can block many short ones", "Optimal only for integers", "Equivalent to sorting by end"]
    answer: 1
    why: "Counterexample: [1,10], [2,3], [4,5]."
  - q: "The best way to gain confidence in a greedy rule during an interview is:"
    options: ["Assume it works", "Try small counterexamples and sketch an exchange argument", "Use DP anyway", "Check it compiles"]
    answer: 1
    why: "Greedy is easy to propose and easy to get wrong."
explain:
  prompt: "Explain how you would convince an interviewer that 'pick the interval that ends first' maximises the number of non-overlapping intervals."
  rubric:
    - "States the algorithm: sort by end, take compatible intervals in order"
    - "Exchange argument: replace the optimal solution's first interval with the earliest-ending one"
    - "The replacement ends no later, so the rest of the optimal solution stays compatible"
    - "Induction on the remaining intervals completes the proof"
    - "States O(n log n) complexity"
  model: "Sort by end time, take the first interval, then repeatedly take the next one whose start is at or after the last chosen end. To argue optimality, take any optimal schedule and look at its first interval. The interval with the earliest end overall ends no later than that one, so I can swap it in: everything else in the optimal schedule started after the old first interval ended, so it still fits. Now both solutions agree on the first choice, and the same argument applies to the remaining intervals, so by induction greedy picks as many as the optimum. Sorting dominates: O(n log n)."
cards:
  - q: "Interval scheduling greedy rule"
    a: "Sort by end time; take earliest-ending compatible interval."
  - q: "Exchange argument"
    a: "Show swapping an optimal choice for the greedy choice keeps the solution valid and no worse."
  - q: "When greedy fails"
    a: "Coin change with arbitrary denominations — use DP."
---

## Explanation

A greedy algorithm makes the choice that looks best right now and never revisits it. It works when the problem has:

1. **Greedy-choice property** — some optimal solution starts with the greedy choice.
2. **Optimal substructure** — after the choice, the rest is a smaller instance of the same problem.

### How to be safe in an interview

1. Propose the rule.
2. Attack it with tiny counterexamples (2–3 elements, ties, extremes).
3. If it survives, sketch an **exchange argument**: transform an optimal solution into the greedy one without making it worse.
4. If you find a counterexample, switch to DP or search.

### Classic greedy problems

| Problem | Rule |
|---|---|
| Max non-overlapping intervals | sort by end, take earliest end |
| Min arrows / meeting rooms variants | sort, sweep |
| Jump game | track furthest reach |
| Gas station | if the tank goes negative, restart after this station |
| Best time to buy/sell stock II | take every positive day-to-day difference |
| Assign cookies | sort both, match smallest sufficient |

## Worked examples

### Jump game

```java
boolean canJump(int[] nums) {
    int reach = 0;
    for (int i = 0; i < nums.length; i++) {
        if (i > reach) return false;
        reach = Math.max(reach, i + nums[i]);
    }
    return true;
}
```

### Gas station

If the total gas ≥ total cost, a solution exists. Scan with a running tank; whenever it drops below zero at station i, no station between the current start and i can be a valid start, so set start = i + 1 and reset the tank. O(n).

## Common misconceptions

- **"If greedy works on the examples, it's correct."** — Examples rarely contain the breaking case.
- **"Greedy and DP are unrelated."** — Greedy is DP where one choice provably dominates.
- **"Sort by start for interval scheduling."** — Sort by end.

## Practical exercises

1. Solve "non-overlapping intervals" (min removals) and explain the exchange argument.
2. Solve jump game and gas station; state complexity.
3. Find a counterexample for greedy coin change and then solve it with DP.
