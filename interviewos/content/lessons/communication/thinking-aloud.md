---
slug: thinking-aloud
title: Thinking aloud in technical interviews
path: communication
module: comm-technical
order: 1
minutes: 35
depth: full
practice: conceptual
summary: How to communicate while solving — restating the problem, examples, brute force first, narrating trade-offs, testing your code out loud, and recovering when stuck.
prerequisites: []
problems: [two-sum]
objectives:
  - Follow a repeatable structure for coding interviews (clarify → examples → approach → complexity → code → test)
  - Narrate reasoning so the interviewer can follow and help, without rambling
  - Handle being stuck, receiving hints and finding bugs gracefully
readings:
  - title: "Tech Interview Handbook — Coding interview techniques"
    url: https://www.techinterviewhandbook.org/coding-interview-techniques/
    kind: article
  - title: "Google — How we hire (interview tips)"
    url: https://www.google.com/about/careers/applications/how-we-hire/
    kind: article
interview:
  - q: "What do you do in the first two minutes after hearing a coding problem?"
    a: "Restate the problem in my own words, ask about input size, constraints, edge cases (empty input, duplicates, negatives) and expected output format, and walk through a small example by hand to confirm understanding — before proposing any approach."
  - q: "What do you do when you're stuck?"
    a: "Say so and say what I'm considering: go back to examples, try a brute force, think about which data structure would make the slow step fast, consider sorting or two pointers, and ask a focused question. Silence hides progress; a structured struggle still shows good signals."
selfAssessment:
  - I follow the six-step structure without being reminded
  - I state complexity before coding
  - I test code by tracing an example aloud
completion:
  - Score at least 70% on the quiz
  - Do one coding mock interview and review communication in the evaluation
quiz:
  - q: "Before writing code, you should usually:"
    options: ["Start typing immediately", "Agree on an approach and its complexity with the interviewer", "Write tests only", "Ask for the solution"]
    answer: 1
    why: "Aligning first avoids coding the wrong solution."
  - q: "Mentioning a brute-force solution first is:"
    options: ["A weakness", "Useful — it shows understanding and gives a baseline to optimise", "Forbidden", "Only for easy problems"]
    answer: 1
    why: "Then say why it's too slow and what to improve."
  - q: "After finishing your code, you should:"
    options: ["Say 'done'", "Trace it on an example and edge cases out loud, fixing bugs you find", "Ask for the next question", "Rewrite in another language"]
    answer: 1
    why: "Finding your own bugs is a strong signal."
explain:
  prompt: "Walk through how you would communicate while solving 'Two Sum' in an interview, from hearing the problem to testing."
  rubric:
    - "Clarifies: duplicates, exactly one answer?, return indices, input size"
    - "Example walkthrough; brute force O(n²) and why it's slow"
    - "Optimised hash map approach with complexity stated before coding"
    - "Narrates while coding, then traces an example and edge cases"
  model: "I'd restate it: given an array and a target, return indices of two different elements that sum to the target. I'd ask whether there's always exactly one answer, whether the same element can be used twice, whether the array is sorted, and how large it can be. Then a quick example: [2, 7, 11, 15] with target 9 gives indices 0 and 1. The brute force checks every pair, O(n²) time and O(1) space — fine for small inputs but slow for 10^5 elements. The slow part is looking for the complement, so a hash map from value to index makes that lookup O(1): for each element I check if target minus it is already in the map, otherwise store it. That's O(n) time and O(n) space; I'd confirm with the interviewer before coding. While coding I'd explain why I check before inserting — it prevents using the same element twice. Finally I'd trace the example and test duplicates like [3, 3] with target 6."
cards:
  - q: "Coding interview structure"
    a: "Clarify → examples → brute force → optimise → complexity → code → test aloud."
  - q: "When stuck"
    a: "Say what you're trying; return to examples; brute force; which structure speeds the slow step; ask a focused question."
---

## Explanation

### The structure

1. **Clarify**: restate, ask about constraints, edge cases, output format.
2. **Examples**: work a small example by hand; create an edge-case example.
3. **Approach**: brute force first (with complexity), then identify the bottleneck and optimise.
4. **Agree**: state time/space complexity and get a nod before coding.
5. **Code**: narrate intent at a high level ("now I handle the window shrinking"), use clear names.
6. **Test**: trace your example line by line, then edge cases; fix bugs calmly.

### How to narrate

- Explain *why*, not just *what* ("I use a set because I only need membership").
- Summarise every few minutes; don't narrate every keystroke.
- Pause to think is fine — say "let me think about this for a moment".

### Hints and mistakes

Hints are normal; acknowledge, incorporate, and continue. When you find a bug, say what the bug is and why it happens — debugging skill is evaluated. In InterviewOS mock interviews, hint requests are recorded and reflected in the independence score, which mirrors real interviews.

## Worked examples

Phrases that help:
- "Let me make sure I understand: …"
- "A brute force would be …, which is O(n²). The repeated work is …, so I could …"
- "Before coding: this is O(n) time and O(n) space. Does that sound reasonable?"
- "Let me trace this with [2, 7, 11, 15]: i = 0, map is empty…"

## Common misconceptions

- **"Silence shows focus."** — It hides your reasoning from the interviewer.
- **"Asking questions looks weak."** — Clarifying is expected and evaluated.
- **"Only the final code matters."** — Process, communication and testing are scored too.

## Practical exercises

1. Solve **Two Sum** in the coding workspace while speaking aloud; record yourself and review.
2. Do a coding mock interview in InterviewOS and read the communication dimension of the evaluation.
