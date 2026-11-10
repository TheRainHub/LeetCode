import type { PlanTemplateDef } from "@/lib/content/defs";

/**
 * 14-session interview sprint. Derived from the historical 9–22 November 2026
 * plan; the active plan is always generated relative to the start date the
 * user picks, and placed according to daily capacity (budget, rest days,
 * university obligations, interviews). Early sessions are intentionally light.
 */
export const INTERVIEW_SPRINT: PlanTemplateDef = {
  key: "interview-sprint-14",
  name: "14-session interview sprint",
  description:
    "DSA fundamentals → networking & Linux → Java concurrency → advanced algorithms → backend → TypeScript & React → system design → experience → final mock.",
  historicalRange: { start: "2026-11-09", end: "2026-11-22" },
  sessions: [
    {
      title: "Session 1 · Complexity & hashing (light)",
      focus: "DSA fundamentals",
      tasks: [
        { kind: "lesson", title: "Read: Time and space complexity", refSlug: "complexity", minutes: 25 },
        { kind: "lesson", title: "Read: HashMap and HashSet (quiz only)", refSlug: "hashmap-hashset", minutes: 30 },
      ],
    },
    {
      title: "Session 2 · Two Sum & stacks (light)",
      focus: "DSA fundamentals",
      tasks: [
        { kind: "problem", title: "Solve: Two Sum (Java)", refSlug: "two-sum", minutes: 20 },
        { kind: "problem", title: "Solve: Valid Parentheses", refSlug: "valid-parentheses", minutes: 15 },
      ],
    },
    {
      title: "Session 3 · Review only",
      focus: "Spaced repetition",
      tasks: [{ kind: "review", title: "Review due cards", minutes: 15 }],
    },
    {
      title: "Session 4 · Arrays, two pointers & sliding window",
      focus: "DSA fundamentals",
      tasks: [
        { kind: "lesson", title: "Lesson: Arrays and strings", refSlug: "arrays-strings", minutes: 30 },
        { kind: "lesson", title: "Lesson: Two pointers", refSlug: "two-pointers", minutes: 30 },
        { kind: "lesson", title: "Lesson: Sliding window", refSlug: "sliding-window", minutes: 35 },
        { kind: "problem", title: "Solve: Best Time to Buy and Sell Stock", refSlug: "best-time-to-buy-and-sell-stock", minutes: 15 },
        { kind: "problem", title: "Solve: Longest Substring Without Repeating Characters", refSlug: "longest-substring-without-repeating-characters", minutes: 30 },
      ],
    },
    {
      title: "Session 5 · Binary search & linked lists",
      focus: "DSA fundamentals",
      tasks: [
        { kind: "lesson", title: "Lesson: Binary search", refSlug: "binary-search", minutes: 30 },
        { kind: "problem", title: "Solve: Binary Search", refSlug: "binary-search", minutes: 15 },
        { kind: "lesson", title: "Lesson: Linked lists", refSlug: "linked-lists", minutes: 30 },
        { kind: "problem", title: "Solve: Linked List Cycle", refSlug: "linked-list-cycle", minutes: 15 },
        { kind: "review", title: "Review due cards", minutes: 15 },
      ],
    },
    {
      title: "Session 6 · Networking & Linux I",
      focus: "Networking and Linux",
      tasks: [
        { kind: "lesson", title: "Lesson: Processes and threads", refSlug: "processes-threads", minutes: 30 },
        { kind: "lesson", title: "Lesson: TCP/IP", refSlug: "tcp-ip", minutes: 40 },
        { kind: "lesson", title: "Lesson: DNS", refSlug: "dns", minutes: 30 },
      ],
    },
    {
      title: "Session 7 · Networking & Linux II",
      focus: "Networking and Linux",
      tasks: [
        { kind: "lesson", title: "Lesson: TLS", refSlug: "tls", minutes: 35 },
        { kind: "lesson", title: "Lesson: HTTP/1.1, HTTP/2, HTTP/3", refSlug: "http-versions", minutes: 35 },
        { kind: "lab", title: "Lab: Linux networking", refSlug: "linux-networking-lab", minutes: 60 },
      ],
    },
    {
      title: "Session 8 · Java concurrency",
      focus: "Java concurrency",
      tasks: [
        { kind: "lesson", title: "Lesson: Threads and the Java Memory Model", refSlug: "java-concurrency", minutes: 40 },
        { kind: "lesson", title: "Lesson: Synchronization and locks", refSlug: "synchronization", minutes: 35 },
        { kind: "lab", title: "Lab: Java concurrency", refSlug: "java-concurrency-lab", minutes: 60 },
      ],
    },
    {
      title: "Session 9 · Advanced algorithms",
      focus: "Advanced algorithms",
      tasks: [
        { kind: "lesson", title: "Lesson: BFS and DFS", refSlug: "bfs-dfs", minutes: 35 },
        { kind: "problem", title: "Solve: Number of Islands", refSlug: "number-of-islands", minutes: 30 },
        { kind: "lesson", title: "Lesson: Heaps", refSlug: "heaps", minutes: 30 },
        { kind: "problem", title: "Solve: Top K Frequent Elements", refSlug: "top-k-frequent-elements", minutes: 25 },
        { kind: "problem", title: "Solve: Merge Intervals", refSlug: "merge-intervals", minutes: 25 },
      ],
    },
    {
      title: "Session 10 · Backend engineering",
      focus: "Backend engineering",
      tasks: [
        { kind: "lesson", title: "Lesson: PostgreSQL indexes", refSlug: "postgres-indexes", minutes: 35 },
        { kind: "lesson", title: "Lesson: Transactions and isolation", refSlug: "transactions-isolation", minutes: 40 },
        { kind: "lesson", title: "Lesson: Idempotency", refSlug: "idempotency", minutes: 30 },
        { kind: "lab", title: "Lab: PostgreSQL", refSlug: "postgresql-lab", minutes: 60 },
      ],
    },
    {
      title: "Session 11 · TypeScript & React",
      focus: "TypeScript and React",
      tasks: [
        { kind: "lesson", title: "Lesson: The event loop", refSlug: "event-loop", minutes: 30 },
        { kind: "lesson", title: "Lesson: Promises and async/await", refSlug: "promises-async", minutes: 30 },
        { kind: "lesson", title: "Lesson: How React renders", refSlug: "react-rendering", minutes: 35 },
        { kind: "problem", title: "Solve: Group Anagrams (TypeScript)", refSlug: "group-anagrams", minutes: 20 },
      ],
    },
    {
      title: "Session 12 · System design",
      focus: "System design",
      tasks: [
        { kind: "lesson", title: "Lesson: Requirements clarification", refSlug: "sd-requirements", minutes: 25 },
        { kind: "lesson", title: "Case study: Rate limiter", refSlug: "cs-rate-limiter", minutes: 40 },
        { kind: "lab", title: "Lab: Design a booking system", refSlug: "booking-system-design-lab", minutes: 60 },
      ],
    },
    {
      title: "Session 13 · Experience presentation",
      focus: "Experience and behavioral",
      tasks: [
        { kind: "lesson", title: "Lesson: STAR stories", refSlug: "behavioral-star", minutes: 25 },
        { kind: "experience", title: "Fill in and verify your three Make projects", minutes: 45 },
        { kind: "experience", title: "Practise project questions out loud", minutes: 30 },
      ],
    },
    {
      title: "Session 14 · Final mock interview",
      focus: "Final mock interview",
      tasks: [
        { kind: "review", title: "Review due cards", minutes: 15 },
        { kind: "mock", title: "Mock interview: algorithms & coding", minutes: 50 },
        { kind: "mock", title: "Mock interview: behavioral", minutes: 30 },
      ],
    },
  ],
};
