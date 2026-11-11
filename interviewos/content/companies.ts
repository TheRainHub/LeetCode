import type { CompanyDef } from "@/lib/content/defs";

const INFERRED =
  "Preparation priorities inferred from the job description and the user's notes — not a statement about this company's actual interview process. Edit the track as you learn more.";

const productFullstackFocus: CompanyDef["focus"] = {
  "ts-type-system": 3,
  "ts-generics-narrowing": 2,
  "event-loop": 3,
  "promises-async": 3,
  "closures-prototypes": 2,
  "react-rendering": 3,
  "react-hooks": 3,
  "state-management": 2,
  "component-architecture": 2,
  "react-performance": 2,
  "frontend-testing": 3,
  accessibility: 2,
  "rest-api-design": 3,
  idempotency: 3,
  "retries-backoff": 3,
  "message-queues": 2,
  "sql-queries": 2,
  observability: 2,
  "hashmap-hashset": 2,
  "arrays-strings": 2,
  "two-pointers": 1,
  "sliding-window": 1,
  "sd-requirements": 2,
  "sd-api-design": 2,
  "cs-notification-system": 2,
  "behavioral-star": 2,
};

const productPresets: CompanyDef["presets"] = [
  {
    title: "TypeScript coding round",
    type: "algorithms",
    difficulty: "medium",
    durationMinutes: 45,
    language: "typescript",
  },
  {
    title: "Fullstack feature design",
    type: "fullstack",
    difficulty: "medium",
    durationMinutes: 45,
    language: "typescript",
  },
  {
    title: "Webhooks & async processing",
    type: "backend",
    difficulty: "medium",
    durationMinutes: 40,
    language: "typescript",
  },
  {
    title: "Behavioral / product thinking",
    type: "behavioral",
    difficulty: "medium",
    durationMinutes: 30,
    language: "typescript",
  },
];

const productChecklist = [
  "Explain the JavaScript event loop with a microtask vs macrotask example",
  "Build a typed API client with loading/error/success states (Fullstack lab)",
  "Explain how you would make webhook handling idempotent",
  "Prepare one STAR story about owning a feature end to end",
  "Solve Two Sum, Group Anagrams and Longest Substring in TypeScript without hints",
];

export const COMPANIES: CompanyDef[] = [
  {
    slug: "microsoft",
    name: "Microsoft",
    role: "Software Engineer — Visual Studio / DevDiv Core AI",
    order: 1,
    overview: `Developer Division (DevDiv) builds developer tools such as Visual Studio, and Core AI work brings AI assistance into those tools.

**What to demonstrate**
- Clean, correct code in Java or Python under time pressure, with Big-O reasoning stated unprompted.
- Data structures and algorithms fundamentals — arrays, hashing, two pointers, trees, graphs, BFS/DFS.
- Object-oriented design and maintainability: how you'd structure, test and debug code.
- Concurrency fundamentals (threads, races, locks) at a conceptual level.
- How developer tools are architected (language services, extensions, background analysis) and how AI assistance fits in reliably.
- Behavioral: ownership, collaboration, learning from mistakes.`,
    techStack: [
      "C#/.NET",
      "C++",
      "TypeScript",
      "Java/Python for interviews",
      "Language Server Protocol",
      "LLM-based assistants",
    ],
    prepNotes: `- Practise thinking aloud: restate the problem, give a brute force, improve it, then code.
- After coding, trace one example and list edge cases before the interviewer asks.
- Prepare to discuss the LLM vulnerability triage and Backstage projects as developer-tools / AI-assisted SE experience.`,
    sourceNote: INFERRED,
    focus: {
      complexity: 3,
      "arrays-strings": 3,
      "hashmap-hashset": 3,
      "two-pointers": 3,
      "sliding-window": 2,
      "binary-search": 3,
      "linked-lists": 2,
      "stack-queue": 2,
      recursion: 2,
      trees: 3,
      heaps: 2,
      graphs: 2,
      "bfs-dfs": 3,
      sorting: 2,
      "dynamic-programming": 2,
      oop: 3,
      "interfaces-abstraction": 2,
      collections: 2,
      "java-concurrency": 2,
      synchronization: 2,
      "ai-assisted-development": 3,
      "agent-reliability": 2,
      "model-evaluation": 2,
      "cs-developer-portal": 2,
      "thinking-aloud": 3,
      "behavioral-star": 3,
    },
    problems: [
      "two-sum",
      "valid-parentheses",
      "binary-search",
      "linked-list-cycle",
      "merge-intervals",
      "number-of-islands",
      "top-k-frequent-elements",
    ],
    presets: [
      {
        title: "Coding round (Java)",
        type: "algorithms",
        difficulty: "medium",
        durationMinutes: 45,
        language: "java",
      },
      {
        title: "Coding round (Python)",
        type: "algorithms",
        difficulty: "medium",
        durationMinutes: 45,
        language: "python",
      },
      {
        title: "Core CS: OOP & concurrency",
        type: "core_cs",
        difficulty: "medium",
        durationMinutes: 40,
        language: "java",
      },
      {
        title: "AI-assisted developer tools",
        type: "ai_engineering",
        difficulty: "medium",
        durationMinutes: 40,
        language: "python",
      },
      {
        title: "Behavioral",
        type: "behavioral",
        difficulty: "medium",
        durationMinutes: 30,
        language: "java",
      },
    ],
    checklist: [
      "Solve 8 of the 10 core problems independently in Java",
      "State time and space complexity for every solution without prompting",
      "Explain a race condition and two ways to fix it",
      "Prepare 3 STAR stories (ownership, conflict, failure)",
      "Explain how you evaluated the LLM vulnerability triage agents and their false negatives",
      "Run two AI mock coding interviews and review the evaluations",
    ],
  },
  {
    slug: "cdn77",
    name: "CDN77",
    role: "Software Engineer (part-time)",
    order: 2,
    overview: `CDN77 operates a content delivery network, so engineering work sits close to Linux servers and the network stack.

**What to demonstrate**
- Linux fluency: processes, file descriptors, permissions, signals, the shell and standard utilities.
- Networking: TCP/IP, DNS resolution, TLS handshakes, HTTP/1.1 vs HTTP/2 vs HTTP/3.
- CDN architecture: edge caching, cache keys, TTLs, purging, origin shielding.
- Practical debugging — reading \`ss\`, \`curl -v\`, \`dig\`, \`tcpdump\` output and forming hypotheses.
- Solid programming fundamentals.`,
    techStack: [
      "Linux",
      "Bash",
      "TCP/IP",
      "DNS",
      "TLS",
      "HTTP/1.1–3",
      "Reverse proxies (e.g. nginx)",
      "Monitoring",
    ],
    prepNotes: `- Do the Linux Networking lab on your own machine and keep the outputs — explaining real output is better than reciting theory.
- Be ready to walk through "what happens when you type a URL" down to DNS, TCP, TLS and caching layers.`,
    sourceNote: INFERRED,
    focus: {
      "processes-threads": 3,
      "filesystems-permissions": 2,
      signals: 2,
      "shell-bash": 3,
      "linux-net-tools": 3,
      "performance-monitoring": 2,
      sockets: 3,
      "tcp-ip": 3,
      udp: 2,
      dns: 3,
      tls: 3,
      "http-versions": 3,
      "cdn-caching": 3,
      "reverse-proxies": 2,
      troubleshooting: 3,
      caching: 2,
      "arrays-strings": 1,
      "hashmap-hashset": 1,
      complexity: 1,
      "behavioral-star": 1,
    },
    problems: ["two-sum", "valid-parentheses", "longest-substring-without-repeating-characters"],
    presets: [
      {
        title: "Networking fundamentals",
        type: "core_cs",
        difficulty: "medium",
        durationMinutes: 40,
        language: "python",
      },
      {
        title: "Linux troubleshooting scenario",
        type: "backend",
        difficulty: "medium",
        durationMinutes: 40,
        language: "python",
      },
      {
        title: "CDN caching design",
        type: "system_design",
        difficulty: "medium",
        durationMinutes: 45,
        language: "python",
      },
    ],
    checklist: [
      "Complete the Linux Networking lab with pasted evidence",
      "Explain the TCP three-way handshake and TIME_WAIT",
      "Explain a TLS 1.3 handshake and certificate validation",
      "Explain Cache-Control, ETag and how a CDN decides a cache hit",
      "Diagnose a 'connection refused' vs 'timeout' failure from command output",
    ],
  },
  {
    slug: "second-foundation",
    name: "Second Foundation",
    role: "Software Engineering Intern",
    order: 3,
    overview: `The role emphasises performance-sensitive code on the JVM.

**What to demonstrate**
- Java and Kotlin fluency, and DSA fundamentals with precise complexity reasoning.
- Concurrency: threads, the Java Memory Model, synchronization, atomics, executors, race conditions.
- Performance thinking: allocation, cache locality, GC behaviour, measuring before optimizing.
- Correctness under concurrency — explaining *why* code is or isn't thread-safe.`,
    techStack: ["Java", "Kotlin", "JVM", "java.util.concurrent", "Low-latency techniques"],
    prepNotes: `- Do the Java Concurrency lab and be able to explain each output (why the unsafe counter loses updates).
- Know the happens-before rules for volatile, synchronized and thread start/join.`,
    sourceNote: INFERRED,
    focus: {
      complexity: 3,
      "arrays-strings": 2,
      "hashmap-hashset": 3,
      heaps: 2,
      "binary-search": 2,
      sorting: 2,
      "dynamic-programming": 2,
      collections: 3,
      generics: 2,
      "jvm-basics": 3,
      "memory-management": 3,
      "garbage-collection": 3,
      immutability: 2,
      "java-concurrency": 3,
      synchronization: 3,
      executors: 3,
      completablefuture: 2,
      "kotlin-fundamentals": 3,
      "locking-concurrency": 2,
    },
    problems: [
      "two-sum",
      "top-k-frequent-elements",
      "merge-intervals",
      "binary-search",
      "longest-substring-without-repeating-characters",
    ],
    presets: [
      {
        title: "Java coding round",
        type: "algorithms",
        difficulty: "medium",
        durationMinutes: 45,
        language: "java",
      },
      {
        title: "Concurrency deep dive",
        type: "core_cs",
        difficulty: "hard",
        durationMinutes: 40,
        language: "java",
      },
      {
        title: "JVM & performance",
        type: "core_cs",
        difficulty: "medium",
        durationMinutes: 30,
        language: "java",
      },
    ],
    checklist: [
      "Complete the Java Concurrency lab with outputs from all three counter versions",
      "Explain happens-before for volatile and synchronized",
      "Compare synchronized, ReentrantLock and AtomicInteger",
      "Explain how G1 or ZGC trades throughput for pause times",
      "Write a small Kotlin program using data classes and null safety",
    ],
  },
  {
    slug: "ataccama",
    name: "Ataccama",
    role: "Fullstack Engineer",
    order: 4,
    overview: `A fullstack role spanning a Java/Spring backend and a TypeScript/React frontend, on containerised infrastructure, with LLM-agent work in scope.

**What to demonstrate**
- Java + Spring Boot service design; TypeScript + React UI architecture.
- PostgreSQL: query design, indexes, EXPLAIN, transactions and isolation.
- REST and GraphQL API design; distributed-systems basics.
- Docker, Kubernetes and GitOps (ArgoCD) — directly relevant to your Make experience.
- LLM agents and AI reliability; end-to-end feature ownership and product thinking.`,
    techStack: [
      "Java",
      "Spring Boot",
      "TypeScript",
      "React",
      "PostgreSQL",
      "GraphQL",
      "Docker",
      "Kubernetes",
      "ArgoCD",
      "LLM agents",
    ],
    prepNotes: `- Your Make experience (Kubernetes, ArgoCD, CI/CD, LLM agents) maps closely; prepare concrete stories with your actual responsibilities.
- Do the PostgreSQL lab and be ready to read an EXPLAIN ANALYZE plan aloud.`,
    sourceNote: INFERRED,
    focus: {
      oop: 2,
      collections: 2,
      "rest-api-design": 3,
      graphql: 2,
      "sql-queries": 3,
      "postgres-indexes": 3,
      "query-optimization": 3,
      "transactions-isolation": 3,
      "locking-concurrency": 2,
      caching: 2,
      "message-queues": 2,
      idempotency: 2,
      observability: 2,
      "docker-kubernetes": 3,
      "ci-cd": 2,
      "ts-type-system": 2,
      "react-rendering": 2,
      "react-hooks": 2,
      "component-architecture": 2,
      "agent-architectures": 2,
      "agent-reliability": 3,
      "tool-calling": 2,
      "sd-requirements": 2,
      "sd-data-caching": 2,
      "hashmap-hashset": 2,
      "arrays-strings": 2,
      "behavioral-star": 2,
    },
    problems: ["two-sum", "group-anagrams", "merge-intervals", "top-k-frequent-elements"],
    presets: [
      {
        title: "Fullstack feature round",
        type: "fullstack",
        difficulty: "medium",
        durationMinutes: 45,
        language: "java",
      },
      {
        title: "Backend & PostgreSQL",
        type: "backend",
        difficulty: "medium",
        durationMinutes: 45,
        language: "java",
      },
      {
        title: "LLM agent reliability",
        type: "ai_engineering",
        difficulty: "medium",
        durationMinutes: 40,
        language: "typescript",
      },
      {
        title: "System design",
        type: "system_design",
        difficulty: "medium",
        durationMinutes: 45,
        language: "java",
      },
    ],
    checklist: [
      "Complete the PostgreSQL lab including concurrent updates",
      "Complete the Fullstack lab (typed API, loading/error/success, tests)",
      "Explain READ COMMITTED vs REPEATABLE READ with an anomaly example",
      "Explain your ArgoCD / Kubernetes experience at Make with concrete responsibilities",
      "Explain how you measured reliability of LLM agents",
    ],
  },
  {
    slug: "apify",
    name: "Apify",
    role: "Software Engineer (role to be confirmed)",
    order: 5,
    overview: `Product-focused TypeScript/Node.js engineering. Treat this as a general **product fullstack** track until you have the exact job description.

**What to demonstrate**
- TypeScript and Node.js fluency; asynchronous programming and the event loop.
- API integrations, webhooks and reliable asynchronous processing (retries, idempotency, queues).
- React and modern frontend; testing and code quality.
- Product thinking and fullstack system design.`,
    techStack: ["TypeScript", "Node.js", "React", "Queues/webhooks"],
    prepNotes: "- Replace this track's focus areas once you have the real job description.",
    sourceNote: INFERRED,
    focus: productFullstackFocus,
    problems: [
      "two-sum",
      "group-anagrams",
      "longest-substring-without-repeating-characters",
      "merge-intervals",
    ],
    presets: productPresets,
    checklist: productChecklist,
  },
  {
    slug: "momence",
    name: "Momence",
    role: "Software Engineer (role to be confirmed)",
    order: 6,
    overview: `Product-focused TypeScript fullstack engineering. Treat this as a general **product fullstack** track until you have the exact job description.

**What to demonstrate**
- TypeScript, Node.js and React; reliable asynchronous processing.
- API integrations and webhooks; testing and code quality.
- Product thinking: scoping a feature, trade-offs, measuring impact.`,
    techStack: ["TypeScript", "Node.js", "React"],
    prepNotes: "- Replace this track's focus areas once you have the real job description.",
    sourceNote: INFERRED,
    focus: productFullstackFocus,
    problems: ["two-sum", "valid-parentheses", "merge-intervals", "top-k-frequent-elements"],
    presets: productPresets,
    checklist: productChecklist,
  },
  {
    slug: "apple",
    name: "Apple",
    role: "Software Engineer (role to be confirmed)",
    order: 7,
    overview: `Grouped with the product fullstack track for now. Apple roles vary widely by team — update the focus areas once you know the team and role.

**What to demonstrate (product fullstack baseline)**
- TypeScript/Node.js and React fundamentals, testing and code quality.
- Reliable asynchronous processing and API design.
- Strong DSA fundamentals and clear communication.`,
    techStack: ["Depends on team"],
    prepNotes: "- Replace this track's focus areas once you know the team and role.",
    sourceNote: INFERRED,
    focus: productFullstackFocus,
    problems: ["two-sum", "binary-search", "merge-intervals", "number-of-islands"],
    presets: productPresets,
    checklist: productChecklist,
  },
];
