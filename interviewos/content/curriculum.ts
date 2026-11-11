import type { Area } from "@/lib/content/types";

export interface ModuleDef {
  slug: string;
  title: string;
  description: string;
}

export interface PathDef {
  slug: string;
  area: Area;
  title: string;
  description: string;
  modules: ModuleDef[];
}

/**
 * Learning paths and modules. Lessons (content/lessons/<path>/*.md) reference
 * a module by slug and are ordered by their `order` field.
 */
export const CURRICULUM: PathDef[] = [
  {
    slug: "dsa",
    area: "dsa",
    title: "Algorithms & Data Structures",
    description:
      "Complexity analysis, core data structures and the patterns that solve most interview problems — with emphasis on turning an idea into correct code.",
    modules: [
      {
        slug: "dsa-foundations",
        title: "Foundations",
        description: "Complexity, arrays and strings, hashing.",
      },
      {
        slug: "dsa-patterns",
        title: "Core patterns",
        description: "Two pointers, sliding window, binary search.",
      },
      {
        slug: "dsa-linear",
        title: "Linear structures & recursion",
        description: "Linked lists, stacks, queues, recursion.",
      },
      {
        slug: "dsa-trees-graphs",
        title: "Trees & graphs",
        description: "Trees, heaps, graphs, BFS and DFS.",
      },
      {
        slug: "dsa-techniques",
        title: "Algorithmic techniques",
        description: "Sorting, greedy algorithms, dynamic programming.",
      },
    ],
  },
  {
    slug: "java",
    area: "java",
    title: "Java & Programming Fundamentals",
    description:
      "Object-oriented design, the collections framework, the JVM and garbage collection, and the concurrency toolkit interviewers probe most.",
    modules: [
      { slug: "java-oop", title: "Object-oriented design", description: "OOP, interfaces, immutability." },
      {
        slug: "java-language",
        title: "Language & libraries",
        description: "Collections, generics, exceptions.",
      },
      { slug: "java-runtime", title: "Runtime", description: "JVM, memory, garbage collection." },
      {
        slug: "java-concurrency",
        title: "Concurrency",
        description: "Threads, the memory model, locks, executors, CompletableFuture.",
      },
      { slug: "java-kotlin", title: "Kotlin", description: "Kotlin for Java developers." },
    ],
  },
  {
    slug: "linux-networking",
    area: "linux-networking",
    title: "Linux & Networking",
    description:
      "Processes, files and the shell; the network stack from TCP to HTTP/3; CDNs, proxies and the tools you use to debug them.",
    modules: [
      {
        slug: "linux-os",
        title: "Operating system",
        description: "Processes, threads, filesystems, permissions, signals.",
      },
      { slug: "linux-shell", title: "Shell & tooling", description: "Bash, CLI tools, monitoring." },
      { slug: "net-transport", title: "Transport", description: "Sockets, TCP/IP, UDP." },
      { slug: "net-application", title: "Application protocols", description: "DNS, TLS, HTTP versions." },
      {
        slug: "net-edge",
        title: "Edge & operations",
        description: "CDN caching, reverse proxies, troubleshooting.",
      },
    ],
  },
  {
    slug: "backend",
    area: "backend",
    title: "Backend & Distributed Systems",
    description:
      "API design, PostgreSQL in depth, caching, messaging and the reliability patterns — idempotency, retries, observability — behind production services.",
    modules: [
      { slug: "be-apis", title: "APIs", description: "REST and GraphQL." },
      {
        slug: "be-databases",
        title: "Databases",
        description: "SQL, indexes, query plans, transactions, locking.",
      },
      {
        slug: "be-caching-messaging",
        title: "Caching & messaging",
        description: "Caching, Redis, queues, Kafka.",
      },
      { slug: "be-reliability", title: "Reliability", description: "Idempotency, retries, observability." },
      { slug: "be-delivery", title: "Delivery", description: "Docker, Kubernetes, CI/CD." },
    ],
  },
  {
    slug: "ts-react",
    area: "ts-react",
    title: "TypeScript & React",
    description:
      "The type system beyond basics, JavaScript's runtime model, and how React renders — so you can reason about bugs instead of guessing.",
    modules: [
      {
        slug: "ts-language",
        title: "TypeScript & JavaScript",
        description: "Types, generics, closures, the event loop, async.",
      },
      { slug: "react-core", title: "React", description: "Rendering, hooks, state, architecture." },
      { slug: "react-quality", title: "Quality", description: "Performance, testing, accessibility." },
    ],
  },
  {
    slug: "system-design",
    area: "system-design",
    title: "System Design",
    description:
      "A repeatable method for design interviews, the building blocks, and worked case studies including the systems from your own experience.",
    modules: [
      { slug: "sd-method", title: "Method", description: "Requirements, estimation, API design." },
      {
        slug: "sd-building-blocks",
        title: "Building blocks",
        description: "Data, caching, scaling, queues, reliability, consistency, observability, security.",
      },
      { slug: "sd-case-studies", title: "Case studies", description: "End-to-end designs." },
    ],
  },
  {
    slug: "ai-engineering",
    area: "ai-engineering",
    title: "AI Engineering",
    description:
      "Building reliable LLM systems: APIs, structured outputs, tools, agents, retrieval, evaluation and security boundaries.",
    modules: [
      {
        slug: "ai-foundations",
        title: "Foundations",
        description: "LLM APIs, structured outputs, prompting.",
      },
      {
        slug: "ai-agents",
        title: "Tools & agents",
        description: "Tool calling, agent architectures, MCP, RAG.",
      },
      {
        slug: "ai-reliability",
        title: "Evaluation & safety",
        description: "Evaluation metrics, hallucinations, prompt injection, reliability.",
      },
    ],
  },
  {
    slug: "communication",
    area: "behavioral",
    title: "Communication & Behavioral",
    description:
      "Thinking aloud, explaining trade-offs and telling STAR stories about your own work — the skills that turn a correct solution into a hire signal.",
    modules: [
      {
        slug: "comm-technical",
        title: "Technical communication",
        description: "Thinking aloud and explaining decisions.",
      },
      {
        slug: "comm-behavioral",
        title: "Behavioral interviews",
        description: "STAR stories and common questions.",
      },
    ],
  },
];
