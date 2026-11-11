import type { SdQuestionDef, SdSourceKey } from "@/lib/content/defs";

/**
 * System design practice catalogue. Question titles follow common public
 * lists; every brief (requirements, deep dives, pitfalls, rubric) is original
 * InterviewOS content. Difficulty is an InterviewOS estimate for a new-graduate
 * or junior interview. `listedIn` names only lists confirmed to include the
 * question.
 */

export const SD_SOURCES: Record<SdSourceKey, { name: string; url: string; note: string }> = {
  neetcode: {
    name: "NeetCode — System design practice",
    url: "https://neetcode.io/practice/practice/systemDesign",
    note: "Public practice list of system design questions.",
  },
  "leetcode-most-asked": {
    name: "LeetCode Discuss — Most asked system design questions",
    url: "https://leetcode.com/discuss/post/5806013/most-asked-system-design-questions-by-09-2zyv/",
    note: "Community post (2024) listing questions the author and colleagues were asked in SDE1/SDE2 interviews.",
  },
};

/** Time budget for a 45-minute design interview, in minutes. */
export const SD_PHASES = [
  { key: "requirements", minutes: 6 },
  { key: "estimates", minutes: 4 },
  { key: "api", minutes: 4 },
  { key: "dataModel", minutes: 4 },
  { key: "highLevel", minutes: 10 },
  { key: "deepDives", minutes: 13 },
  { key: "tradeoffs", minutes: 4 },
] as const;
export type SdSectionKey = (typeof SD_PHASES)[number]["key"];

/** Process items added to every question's rubric. */
export const SD_GENERIC_RUBRIC = [
  "Clarified scope and non-functional requirements before designing",
  "Made estimates and used them to drive at least one decision",
  "Discussed failure modes, bottlenecks and trade-offs explicitly",
];

/** Fundamentals behind most design questions, as InterviewOS lessons. */
export const SD_FUNDAMENTALS: { key: string; lessons: string[] }[] = [
  { key: "method", lessons: ["sd-requirements", "sd-estimation", "sd-api-design", "rest-api-design"] },
  { key: "networking", lessons: ["dns", "tcp-ip", "http-versions", "tls", "cdn-caching", "reverse-proxies"] },
  {
    key: "data",
    lessons: [
      "sql-queries",
      "postgres-indexes",
      "transactions-isolation",
      "sd-data-caching",
      "caching",
      "redis",
    ],
  },
  { key: "scaling", lessons: ["sd-scaling-load-balancing", "sd-async-queues", "message-queues", "kafka"] },
  {
    key: "reliability",
    lessons: [
      "sd-reliability",
      "sd-consistency",
      "idempotency",
      "retries-backoff",
      "sd-observability",
      "sd-security",
    ],
  },
];

export const SD_QUESTIONS: SdQuestionDef[] = [
  /* ---------------------------- Infrastructure ---------------------------- */
  {
    slug: "url-shortener",
    title: "Design a URL shortener (TinyURL, Bitly)",
    category: "infrastructure",
    difficulty: "easy",
    prompt:
      "Design a URL shortening service like TinyURL or Bitly: users submit a long URL and get a short link that redirects to it.",
    concepts: ["sd-estimation", "sd-data-caching", "caching", "sd-api-design"],
    caseStudy: "cs-url-shortener",
    listedIn: ["neetcode", "leetcode-most-asked"],
    clarify: [
      "Do users need custom aliases or link expiry?",
      "Are click statistics in scope?",
      "How many new links and how many redirects per day?",
      "Must short codes be hard to guess?",
    ],
    functional: [
      "Create a short link (optional alias and expiry)",
      "Redirect a short code to the original URL",
      "Basic click statistics per link",
    ],
    nonFunctional: [
      "Very low redirect latency",
      "Redirects highly available",
      "Mappings are never lost",
      "Codes are not enumerable when links are private",
    ],
    estimates: [
      "Reads dominate writes (often ~100:1), so the redirect path is cached",
      "About 500 bytes per link: storage grows slowly",
      "7 base62 characters give about 3.5 trillion codes",
    ],
    components: [
      "Link API and key generator",
      "Links store (key-value or PostgreSQL) keyed by code",
      "Redis cache and CDN for hot redirects",
      "Click events to a queue, aggregated asynchronously",
    ],
    deepDives: [
      {
        title: "Key generation",
        notes:
          "Random codes with a unique constraint and retry, a counter encoded in base62 (needs ID ranges per node and is enumerable), or a truncated hash (collisions to handle). Pick one and explain collisions.",
      },
      {
        title: "Redirect path",
        notes:
          "Cache lookups, negative caching for unknown codes, and 301 (cached by browsers, loses analytics) versus 302/307 (every click reaches you).",
      },
      {
        title: "Analytics off the critical path",
        notes:
          "Redirect first, then emit a click event; aggregate in a stream or batch job into a separate store.",
      },
    ],
    pitfalls: [
      "Truncating a hash of the URL without handling collisions",
      "Writing analytics synchronously during the redirect",
      "Ignoring abuse: malicious links and creation rate limits",
    ],
    followUps: [
      "How do you support custom aliases without conflicts?",
      "How would you expire millions of links?",
      "What changes at 100× the traffic?",
    ],
    rubric: [
      "Chose a key-generation strategy and handled collisions",
      "Designed a cached redirect path and chose 301 vs 302 deliberately",
      "Kept analytics off the redirect path",
      "Estimated read/write ratio and storage",
      "Addressed abuse and rate limiting",
    ],
  },
  {
    slug: "pastebin",
    title: "Design Pastebin",
    category: "infrastructure",
    difficulty: "easy",
    prompt: "Design Pastebin: users paste text, get a link to share it, and pastes can expire.",
    concepts: ["sd-data-caching", "cdn-caching", "sd-api-design", "sd-security"],
    listedIn: ["neetcode"],
    clarify: [
      "What is the maximum paste size?",
      "Which expiry options exist?",
      "Are private or unlisted pastes needed?",
      "What is the read/write ratio?",
    ],
    functional: [
      "Create a paste with optional expiry and visibility",
      "View a paste by its link",
      "Delete your own paste",
    ],
    nonFunctional: [
      "Content is stored durably",
      "Fast reads for popular pastes",
      "Abuse controls",
      "Unguessable links for unlisted pastes",
    ],
    estimates: [
      "Pastes up to about 1 MB; metadata is tiny compared with content",
      "Reads dominate, so popular pastes are cached",
    ],
    components: [
      "Paste API",
      "Metadata database (id, owner, size, expiry, visibility)",
      "Object storage for paste content",
      "CDN or cache for popular pastes",
      "Background cleanup of expired pastes",
    ],
    deepDives: [
      {
        title: "Metadata vs content",
        notes:
          "Keep metadata in a database and content in object storage, uploaded or served through pre-signed URLs, so the database stays small.",
      },
      {
        title: "Expiry",
        notes:
          "Check expiry on read (lazy) and delete in the background with a sweeper or storage lifecycle rules; never block reads on deletion.",
      },
      {
        title: "Abuse and privacy",
        notes:
          "Size limits, rate limits per user/IP, content scanning, takedown flow; random IDs so unlisted pastes cannot be enumerated.",
      },
    ],
    pitfalls: [
      "Storing large blobs in the relational database",
      "Deleting expired content synchronously on the read path",
      "Sequential IDs for private pastes",
    ],
    followUps: [
      "How would you support 10 MB pastes?",
      "How could you deduplicate identical pastes?",
      "How would you add view counts?",
    ],
    rubric: [
      "Separated metadata from content storage",
      "Designed expiry handling",
      "Used caching or a CDN for hot pastes",
      "Covered privacy (unguessable IDs) and abuse",
      "Estimated storage growth",
    ],
  },
  {
    slug: "rate-limiter",
    title: "Design a rate limiter",
    category: "infrastructure",
    difficulty: "medium",
    prompt:
      "Design a rate limiter for a public API that enforces limits such as 100 requests per minute per API key across a fleet of servers.",
    concepts: ["redis", "sd-scaling-load-balancing", "retries-backoff"],
    caseStudy: "cs-rate-limiter",
    listedIn: ["neetcode"],
    clarify: [
      "Limit per user, API key, IP address or endpoint?",
      "Are short bursts allowed?",
      "One region or several?",
      "What should happen if the limiter itself is unavailable?",
    ],
    functional: [
      "Enforce configurable limits per key and route",
      "Tell clients they are limited (429 with Retry-After)",
      "Change rules without redeploying",
    ],
    nonFunctional: [
      "Adds only a few milliseconds",
      "Accurate across many servers",
      "Explicit fail-open or fail-closed behaviour",
    ],
    estimates: [
      "Gateway requests per second equal limiter operations per second",
      "One counter or bucket per active key, with a TTL",
    ],
    components: [
      "Gateway or middleware",
      "Rules configuration store",
      "Redis cluster with atomic scripts",
      "Local fallback limiter",
      "Metrics on rejections",
    ],
    deepDives: [
      {
        title: "Algorithm",
        notes:
          "Token bucket (bursts up to capacity, steady refill), fixed window (simple, up to 2× at boundaries), sliding window log or counter (accurate, more state).",
      },
      {
        title: "Distribution and atomicity",
        notes:
          "Shared counters in Redis updated atomically with a Lua script; read-modify-write from the application races. Watch for hot keys.",
      },
      {
        title: "Failure and multiple regions",
        notes:
          "Fail open with a conservative local limit, or fail closed for expensive endpoints; per-region limits or approximate global sync.",
      },
    ],
    pitfalls: [
      "Counting per server, which multiplies the limit by the number of servers",
      "GET then SET races on the counter",
      "Rejecting without Retry-After guidance",
    ],
    followUps: [
      "How would you limit concurrent requests instead of rate?",
      "How do you enforce one limit across regions?",
      "How do you handle one very large customer?",
    ],
    rubric: [
      "Compared algorithms and justified one",
      "Kept counters atomic in a shared store",
      "Decided failure behaviour explicitly",
      "Communicated limits to clients (429, headers)",
      "Addressed hot keys or multiple regions",
    ],
  },
  {
    slug: "key-value-store",
    title: "Design a distributed key-value store",
    category: "infrastructure",
    difficulty: "hard",
    prompt:
      "Design a distributed key-value store, like Dynamo or Cassandra, that holds billions of keys across many machines and stays available when machines fail.",
    concepts: ["sd-data-caching", "sd-consistency", "sd-reliability"],
    listedIn: [],
    clarify: [
      "Typical key and value sizes?",
      "Read/write ratio?",
      "Strong, eventual or tunable consistency?",
      "One datacenter or several? Range queries needed?",
    ],
    functional: ["put, get and delete by key", "Optional TTL", "Scale out by adding nodes"],
    nonFunctional: [
      "Available when nodes fail",
      "Tunable consistency",
      "Low latency for reads and writes",
      "Durable writes",
    ],
    estimates: [
      "Total data ÷ capacity per node gives the node count",
      "A replication factor of 3 triples raw storage",
    ],
    components: [
      "Consistent hashing with virtual nodes for partitioning",
      "N replicas per key and a request coordinator",
      "Storage engine: commit log, memtable, SSTables, compaction",
      "Gossip membership and failure detection",
    ],
    deepDives: [
      {
        title: "Partitioning and rebalancing",
        notes:
          "Consistent hashing moves only about 1/N of keys when nodes join or leave; virtual nodes even out load and heterogeneous hardware.",
      },
      {
        title: "Replication and conflicts",
        notes:
          "Quorums with W + R > N; hinted handoff and read repair during failures; version vectors or last-write-wins to resolve concurrent writes.",
      },
      {
        title: "Write-optimised storage",
        notes:
          "Append to a commit log, buffer in a memtable, flush sorted SSTables, use Bloom filters to skip files and compaction to merge them.",
      },
    ],
    pitfalls: [
      "Partitioning by hash mod N",
      "Ignoring conflict resolution in an always-writable design",
      "Forgetting durability (fsync, write-ahead log)",
    ],
    followUps: [
      "How do you add a node without downtime?",
      "How would you offer strongly consistent reads?",
      "How do nodes detect that another node failed?",
    ],
    rubric: [
      "Partitioned with consistent hashing and explained rebalancing",
      "Designed replication with quorums",
      "Handled conflicts and node failures",
      "Described a write-optimised storage engine",
      "Discussed CAP/PACELC trade-offs",
    ],
  },
  {
    slug: "message-queue",
    title: "Design a distributed message queue",
    category: "infrastructure",
    difficulty: "hard",
    prompt:
      "Design a distributed message queue, like Kafka or Amazon SQS, that producers write to and many consumers read from reliably.",
    concepts: ["message-queues", "kafka", "sd-async-queues", "sd-reliability"],
    listedIn: [],
    clarify: [
      "Queue semantics (competing consumers) or a replayable log?",
      "Ordering requirements?",
      "At-least-once or at-most-once delivery?",
      "Retention period, throughput and message size?",
    ],
    functional: [
      "Produce, consume and acknowledge messages",
      "Topics split into partitions",
      "Consumer groups",
      "Retention and replay (for a log)",
    ],
    nonFunctional: [
      "Acknowledged messages are never lost",
      "High throughput",
      "Ordering per key",
      "Horizontal scaling",
    ],
    estimates: [
      "Messages per second × size gives disk and network bandwidth per broker",
      "Retention × throughput gives storage",
    ],
    components: [
      "Brokers storing partitioned append-only logs",
      "Leader/follower replication with in-sync replicas",
      "Controller for metadata and leader election (consensus)",
      "Consumer offset storage",
      "Client libraries",
    ],
    deepDives: [
      {
        title: "Partitioning and ordering",
        notes:
          "Order holds only within a partition; keys route related messages together; parallelism is capped by the partition count; rebalancing pauses consumers.",
      },
      {
        title: "Durability",
        notes:
          "acks from all in-sync replicas before confirming, minimum in-sync replicas, leader election that never picks a replica missing acknowledged data.",
      },
      {
        title: "Delivery semantics",
        notes:
          "Committing offsets after processing gives at-least-once delivery; idempotent producers and consumers make duplicates harmless; dead-letter topics for poison messages.",
      },
    ],
    pitfalls: [
      "Promising global ordering together with parallel consumers",
      "Acknowledging before replication",
      "Unbounded retention without compaction or limits",
    ],
    followUps: [
      "How does a consumer recover after a crash?",
      "How would you support delayed messages?",
      "What happens when one consumer group is very slow?",
    ],
    rubric: [
      "Explained the partitioned log or queue model and ordering",
      "Designed replication and acknowledgement semantics",
      "Covered consumer groups and offsets",
      "Discussed delivery guarantees and idempotency",
      "Sized throughput and retention",
    ],
  },
  {
    slug: "distributed-cache",
    title: "Design a distributed cache",
    category: "infrastructure",
    difficulty: "medium",
    prompt: "Design a distributed in-memory cache, like Memcached or Redis Cluster, shared by many services.",
    concepts: ["caching", "redis", "sd-data-caching", "sd-consistency"],
    listedIn: [],
    clarify: [
      "Data size and typical item size?",
      "Read/write ratio?",
      "Pure cache, or must data survive node failures?",
      "How should it stay consistent with the database?",
    ],
    functional: [
      "get, set and delete with TTL",
      "Eviction when memory is full",
      "Add nodes to grow capacity",
    ],
    nonFunctional: ["Sub-millisecond latency", "Very high throughput", "Clear behaviour when a node fails"],
    estimates: [
      "Working-set size ÷ memory per node gives the node count",
      "Hit ratio decides how much load the database avoids",
    ],
    components: [
      "Client-side consistent hashing or a routing proxy",
      "Cache nodes: hash table plus LRU-style eviction",
      "Optional replicas and failover",
      "Membership and hit-ratio monitoring",
    ],
    deepDives: [
      {
        title: "Partitioning and hot keys",
        notes:
          "Consistent hashing limits remapping when nodes change; replicate or locally cache very hot keys so one node is not overloaded.",
      },
      {
        title: "Eviction and expiry",
        notes: "Approximate LRU or LFU, lazy expiry on access plus periodic active expiry.",
      },
      {
        title: "Failures and consistency",
        notes:
          "A failed node causes misses that hit the database: protect against stampedes (single-flight, jittered TTLs); invalidate by deleting keys after database writes.",
      },
    ],
    pitfalls: [
      "Partitioning by hash mod N",
      "Treating the cache as the source of truth",
      "No protection against cache stampedes",
    ],
    followUps: [
      "How do you handle one extremely hot key?",
      "How would you warm a new cluster?",
      "How do you keep it consistent with database writes?",
    ],
    rubric: [
      "Partitioned with consistent hashing",
      "Designed eviction and TTL",
      "Covered replication or failover",
      "Handled stampedes and hot keys",
      "Kept the database as the source of truth",
    ],
  },
  {
    slug: "job-scheduler",
    title: "Design a distributed job scheduler",
    category: "infrastructure",
    difficulty: "medium",
    prompt:
      "Design a distributed job scheduler that runs millions of one-off and recurring (cron) jobs on time across a pool of workers.",
    concepts: ["locking-concurrency", "sd-async-queues", "idempotency", "retries-backoff"],
    listedIn: [],
    clarify: [
      "What timing precision is needed: seconds or minutes?",
      "How long do jobs run?",
      "Retries, timeouts and priorities?",
      "Is it multi-tenant?",
    ],
    functional: [
      "Create one-off and recurring jobs",
      "Run them at the scheduled time",
      "Retry failures with backoff",
      "Show status and history",
    ],
    nonFunctional: [
      "Jobs are never lost",
      "A job does not run twice at the same time (or is idempotent)",
      "Handles peaks such as the top of every hour",
      "Observable",
    ],
    estimates: ["Peak jobs due per second (many cron jobs fire at :00)"],
    components: [
      "Job store (PostgreSQL) indexed by next run time",
      "Scheduler that claims due jobs with FOR UPDATE SKIP LOCKED",
      "Queue feeding workers",
      "Workers with leases and heartbeats",
      "Run history",
    ],
    deepDives: [
      {
        title: "Claiming due jobs safely",
        notes:
          "Several scheduler instances claim different rows with SKIP LOCKED; leases with expiry recover jobs from crashed workers; fencing tokens stop stale workers.",
      },
      {
        title: "Recurring jobs",
        notes:
          "Compute the next run in the job's time zone (DST!), decide what to do with missed runs, add jitter to spread :00 spikes.",
      },
      {
        title: "Failures",
        notes:
          "Timeouts, retries with backoff, a dead-letter state, and idempotent handlers because a job can run twice after a crash.",
      },
    ],
    pitfalls: [
      "A single scheduler node as a single point of failure",
      "Cron storms at :00 without jitter",
      "Assuming exactly-once execution",
    ],
    followUps: [
      "What happens when a worker dies mid-job?",
      "How would you scale to 100k jobs per second?",
      "How would you add priorities?",
    ],
    rubric: [
      "Efficient storage and lookup of due jobs",
      "Prevented concurrent double execution and required idempotency",
      "Handled recurrence, time zones and missed runs",
      "Designed retries, timeouts and a dead-letter state",
      "Addressed peaks and scaling",
    ],
  },
  {
    slug: "web-crawler",
    title: "Design a web crawler",
    category: "infrastructure",
    difficulty: "medium",
    prompt:
      "Design a web crawler that downloads billions of pages for a search engine, politely and without duplicates.",
    concepts: ["sd-async-queues", "sd-scaling-load-balancing", "dns"],
    listedIn: [],
    clarify: [
      "How many pages per month?",
      "Which content types?",
      "How fresh must pages be?",
      "Must robots.txt be respected? Where are pages stored?",
    ],
    functional: [
      "Start from seed URLs",
      "Fetch, parse and extract links",
      "Store pages",
      "Recrawl according to freshness",
    ],
    nonFunctional: [
      "Politeness: per-host rate limits and robots.txt",
      "Scales horizontally",
      "Robust against traps and broken HTML",
      "No duplicate work",
    ],
    estimates: [
      "1 billion pages per month ≈ 400 pages per second",
      "About 100 KB per page ≈ 100 TB per month of raw HTML",
    ],
    components: [
      "URL frontier with priority and per-host queues",
      "Fetchers with a DNS cache",
      "Parser and link extractor",
      "Deduplication: seen-URL set and content fingerprints",
      "Object storage for pages",
      "Recrawl scheduler",
    ],
    deepDives: [
      {
        title: "Frontier",
        notes:
          "Priority queues feed per-host queues so each host is fetched by one worker at a polite rate; important pages first.",
      },
      {
        title: "Deduplication",
        notes:
          "Normalise URLs, keep a Bloom filter or key-value seen-set, and detect near-duplicate content with fingerprints such as SimHash.",
      },
      {
        title: "Traps and robustness",
        notes:
          "Depth and URL-length limits, timeouts, size limits, and blocklists for calendar-style infinite link spaces.",
      },
    ],
    pitfalls: ["Hammering a single host", "Unbounded URL growth from crawler traps", "No DNS caching"],
    followUps: [
      "How would you prioritise important pages?",
      "How do you recrawl news sites quickly?",
      "How would you crawl from several regions?",
    ],
    rubric: [
      "Designed a frontier with politeness",
      "Handled URL and content deduplication",
      "Estimated throughput and storage",
      "Addressed traps and failures",
      "Defined a recrawl strategy",
    ],
  },
  {
    slug: "monitoring-system",
    title: "Design a real-time monitoring system",
    category: "infrastructure",
    difficulty: "hard",
    prompt:
      "Design a real-time monitoring system that collects metrics from thousands of services, shows dashboards and fires alerts within seconds.",
    concepts: ["observability", "sd-observability", "kafka", "sd-data-caching"],
    listedIn: ["neetcode"],
    clarify: [
      "Metrics only, or logs and traces too?",
      "Push or pull collection?",
      "Retention and resolution?",
      "Alert latency target? Limits on label cardinality?",
    ],
    functional: [
      "Ingest counters, gauges and histograms",
      "Query and dashboards",
      "Alert rules and notifications",
      "Downsampling and retention",
    ],
    nonFunctional: [
      "High write throughput",
      "Alerting keeps working when other parts fail",
      "Fast queries over recent data",
      "Affordable long-term storage",
    ],
    estimates: ["10k hosts × 1k series sampled every 10 s = 1 million samples per second"],
    components: [
      "Agents or scrapers",
      "Ingestion buffer (Kafka)",
      "Time-series database with compressed chunks and a label index",
      "Downsampling jobs",
      "Query service",
      "Alert evaluator and notifier",
    ],
    deepDives: [
      {
        title: "Time-series storage",
        notes:
          "Append-only chunks per series with timestamp/value compression, an inverted index from labels to series, and time-based partitions for retention.",
      },
      {
        title: "Cardinality",
        notes:
          "Each label combination is a new series: enforce limits and keep user IDs and request IDs in logs or traces instead.",
      },
      {
        title: "Reliable alerting",
        notes:
          "Evaluate alerts independently of dashboards, deduplicate and group notifications, damp flapping, and monitor the monitoring system from outside.",
      },
    ],
    pitfalls: [
      "One relational row per sample",
      "Unbounded label cardinality",
      "Monitoring that depends on the infrastructure it monitors",
    ],
    followUps: [
      "How do you downsample old data?",
      "How do you compute percentiles across hosts?",
      "How do you alert when ingestion itself is down?",
    ],
    rubric: [
      "Estimated ingest rate and designed for writes",
      "Chose a time-series storage model",
      "Controlled cardinality and retention",
      "Designed reliable alerting",
      "Considered monitoring the monitoring system",
    ],
  },
  {
    slug: "webhooks",
    title: "Design a webhook delivery system",
    category: "infrastructure",
    difficulty: "medium",
    prompt:
      "Design a webhook delivery system that notifies thousands of customer endpoints about events, like Stripe or GitHub webhooks.",
    concepts: ["message-queues", "retries-backoff", "idempotency", "sd-security"],
    listedIn: ["neetcode"],
    clarify: [
      "Event volume and subscriptions per event?",
      "Ordering guarantees?",
      "How long should retries continue?",
      "Self-service subscriptions and replay?",
    ],
    functional: [
      "Customers register endpoints and event types",
      "Deliver events by HTTP POST",
      "Retry with backoff",
      "Delivery log and manual replay",
    ],
    nonFunctional: [
      "At-least-once delivery",
      "One slow customer never delays others",
      "Signed payloads and secret rotation",
      "Observable delivery",
    ],
    estimates: [
      "Events per second × subscriptions = delivery attempts per second; retries multiply load during customer outages",
    ],
    components: [
      "Transactional outbox in producing services",
      "Subscription store",
      "Fan-out to per-endpoint queues",
      "Delivery workers with timeouts",
      "Retry scheduler",
      "Delivery log",
    ],
    deepDives: [
      {
        title: "Isolation",
        notes:
          "Per-endpoint queues and concurrency limits; pause or circuit-break endpoints that keep failing.",
      },
      {
        title: "Retries and idempotency",
        notes:
          "Stable event IDs so receivers can deduplicate; exponential backoff over hours; disable and notify after prolonged failure.",
      },
      {
        title: "Security",
        notes:
          "HMAC signatures with timestamps against replay, secret rotation, and SSRF protection because you call customer-supplied URLs.",
      },
    ],
    pitfalls: [
      "One shared queue where a dead endpoint blocks everyone",
      "No signatures",
      "Calling arbitrary URLs without SSRF protection",
    ],
    followUps: [
      "How do you preserve ordering per customer?",
      "How do customers replay missed events?",
      "What if an endpoint is down for three days?",
    ],
    rubric: [
      "Reliable intake (outbox) and fan-out",
      "Isolated slow or failing endpoints",
      "Retries with backoff and stable event IDs",
      "Signed payloads and SSRF protection",
      "Observability and replay",
    ],
  },
  {
    slug: "notification-system",
    title: "Design a scalable notification system",
    category: "infrastructure",
    difficulty: "medium",
    prompt:
      "Design a scalable notification system that sends email, push, SMS and in-app notifications triggered by other services.",
    concepts: ["sd-async-queues", "message-queues", "idempotency", "retries-backoff"],
    caseStudy: "cs-notification-system",
    listedIn: ["leetcode-most-asked"],
    clarify: [
      "Which channels?",
      "Transactional, marketing or both?",
      "User preferences and quiet hours?",
      "Volume and peaks?",
    ],
    functional: [
      "Accept notification requests or events",
      "Respect user preferences and consent",
      "Render localised templates",
      "Deliver through channel providers and track status",
    ],
    nonFunctional: [
      "Transactional messages within seconds",
      "Bulk campaigns never starve transactional traffic",
      "At-least-once delivery with deduplication",
      "Survives provider outages",
    ],
    estimates: ["10 million per day ≈ 115 per second on average; campaigns burst far higher"],
    components: [
      "Intake API",
      "Preference and template services",
      "Queues per channel and priority",
      "Channel workers and provider adapters",
      "Status store",
      "In-app store and real-time gateway",
    ],
    deepDives: [
      {
        title: "Priority isolation",
        notes: "Separate queues and worker pools for transactional and bulk traffic.",
      },
      {
        title: "Deduplication",
        notes:
          "Deterministic notification IDs with a unique constraint; idempotency keys passed to providers.",
      },
      {
        title: "Provider failures",
        notes:
          "Timeouts, retries with backoff, circuit breakers, a secondary provider and a dead-letter queue.",
      },
    ],
    pitfalls: ["One queue for all priorities", "No deduplication", "Ignoring opt-outs and consent"],
    followUps: [
      "How do you send in the user's local time?",
      "How would you batch notifications into a digest?",
      "How do you measure delivery success?",
    ],
    rubric: [
      "Event-driven pipeline with queues",
      "Preferences and consent applied centrally",
      "Isolated priorities",
      "Retries, deduplication and provider failover",
      "Delivery monitoring",
    ],
  },
  {
    slug: "feature-flags",
    title: "Design a feature flag service",
    category: "infrastructure",
    difficulty: "medium",
    prompt: "Design a feature flag and experimentation service used by backend services and web clients.",
    concepts: ["ci-cd", "sd-data-caching", "sd-reliability"],
    caseStudy: "cs-feature-flags",
    listedIn: [],
    clarify: [
      "How many evaluations per second?",
      "Server and browser SDKs?",
      "Targeting rules and experiments?",
      "How fast must changes propagate?",
    ],
    functional: [
      "Flags with targeting rules and percentage rollouts",
      "Evaluate flags in SDKs",
      "Experiments with exposure logging",
      "Audit log of changes",
    ],
    nonFunctional: [
      "Evaluation in microseconds",
      "Keeps working when the flag service is down",
      "Changes propagate within seconds",
      "Stable assignment per user",
    ],
    estimates: [
      "Evaluations can reach millions per second, so they must be local, never a network call each",
    ],
    components: [
      "Admin API and UI",
      "Flag database and audit log",
      "Ruleset publisher to a CDN",
      "Streaming updates (SSE)",
      "SDKs with local evaluation",
      "Exposure event pipeline",
    ],
    deepDives: [
      {
        title: "Deterministic bucketing",
        notes:
          "hash(flag seed + user id) → bucket; stable across servers and increasing the percentage only adds users.",
      },
      {
        title: "Distribution",
        notes:
          "Rulesets on a CDN, SSE for changes, cached copies and safe defaults when the service is unreachable.",
      },
      {
        title: "Privacy and lifecycle",
        notes:
          "Do not ship sensitive targeting rules to browsers; flag owners and expiry dates; remove stale flags.",
      },
    ],
    pitfalls: [
      "A remote call per evaluation",
      "The same hash seed for every flag",
      "No defaults on cold start",
    ],
    followUps: [
      "How do you run mutually exclusive experiments?",
      "How do you target by attributes without leaking them?",
      "How do you clean up old flags?",
    ],
    rubric: [
      "Local evaluation from cached rulesets",
      "Deterministic bucketing",
      "Fast propagation with safe defaults",
      "Exposure logging for experiments",
      "Audit, privacy and cleanup",
    ],
  },

  /* ---------------------------- Social & content ---------------------------- */
  {
    slug: "twitter",
    title: "Design Twitter (news feed)",
    category: "social",
    difficulty: "hard",
    prompt:
      "Design Twitter: users post short messages, follow other users and read a home timeline of recent posts from accounts they follow.",
    concepts: ["sd-data-caching", "caching", "sd-async-queues", "sd-scaling-load-balancing"],
    listedIn: ["neetcode"],
    clarify: [
      "How many daily active users?",
      "Ranked or chronological timeline?",
      "Media attachments?",
      "Accounts with millions of followers?",
    ],
    functional: [
      "Post a tweet",
      "Follow and unfollow",
      "Read the home timeline",
      "Read a user's own timeline",
    ],
    nonFunctional: [
      "Timeline loads in under about 200 ms",
      "Read-heavy",
      "Eventual consistency is acceptable for timelines",
      "Highly available",
    ],
    estimates: ["200 million DAU × 50 timeline reads per day ≈ 115k reads per second; writes are far fewer"],
    components: [
      "Tweet service and store",
      "Social graph store",
      "Fan-out service",
      "Timeline cache (a list per user in Redis)",
      "Media storage and CDN",
    ],
    deepDives: [
      {
        title: "Fan-out on write vs read",
        notes:
          "Push new tweets into followers' cached timelines for normal accounts; merge celebrity tweets at read time to avoid millions of writes per post.",
      },
      {
        title: "Timeline cache",
        notes:
          "Keep the last few hundred tweet IDs per active user; rebuild from storage for inactive users.",
      },
      {
        title: "IDs and sharding",
        notes: "Time-sortable unique IDs (Snowflake-style); shard tweets by tweet or user ID.",
      },
    ],
    pitfalls: [
      "Pure fan-out on write for celebrity accounts",
      "Joining tweets and follows at read time at full scale",
      "Ignoring the read/write asymmetry",
    ],
    followUps: [
      "How would you rank the timeline?",
      "How do deletes and edits reach cached timelines?",
      "How would you compute trending topics?",
    ],
    rubric: [
      "Estimated the read/write ratio",
      "Designed fan-out with celebrity handling",
      "Designed timeline caching",
      "Gave a data model and sharding plan",
      "Handled edits and deletes in caches",
    ],
  },
  {
    slug: "comment-system",
    title: "Design a comment system",
    category: "social",
    difficulty: "medium",
    prompt:
      "Design a comment system, like comments under news articles or videos, with replies, likes and live updates.",
    concepts: ["sql-queries", "postgres-indexes", "caching", "sd-api-design"],
    listedIn: ["neetcode"],
    clarify: ["How deep can replies nest?", "Sort by newest or top?", "Live updates?", "Moderation needs?"],
    functional: [
      "Post comments and replies",
      "List threaded comments with sorting and pagination",
      "Like or upvote",
      "Report and remove comments",
    ],
    nonFunctional: ["Fast reads on popular items", "Spam resistance", "Counts may be slightly stale"],
    estimates: ["A viral item can receive thousands of comments per minute: a hotspot"],
    components: [
      "Comment service",
      "Store with item_id and parent_id (adjacency list or materialised path)",
      "Counters in Redis, persisted periodically",
      "Cache of the first page",
      "WebSocket/SSE push",
      "Moderation pipeline",
    ],
    deepDives: [
      {
        title: "Threaded data model",
        notes:
          "Adjacency list (parent_id) with cursor pagination per level, or a materialised path to load a subtree in one ordered query.",
      },
      {
        title: "Hot items",
        notes: "Cache the top comments, shard or batch like counters, rate-limit writers.",
      },
      {
        title: "Moderation",
        notes: "Rate limits, asynchronous spam classification, user reports and removal workflows.",
      },
    ],
    pitfalls: [
      "Recursive queries over deep trees on every read",
      "Offset pagination on hot threads",
      "Updating one like counter row under heavy contention",
    ],
    followUps: [
      "How do you sort by top efficiently?",
      "How do edits and deletes work inside threads?",
      "How do viewers see new comments live?",
    ],
    rubric: [
      "Data model for threads and pagination",
      "Handled hot items and counters",
      "Live update strategy",
      "Moderation and abuse handling",
      "Caching strategy",
    ],
  },
  {
    slug: "top-k-songs",
    title: "Design Spotify top K songs (charts)",
    category: "social",
    difficulty: "medium",
    prompt:
      "Design a service that shows the top K most-played songs, globally and per country, for the last hour, day and week.",
    concepts: ["kafka", "heaps", "sd-data-caching", "sd-async-queues"],
    listedIn: ["neetcode"],
    clarify: [
      "Exact or approximate counts?",
      "Window sizes and refresh frequency?",
      "How many songs and plays per second?",
      "Per-country charts?",
    ],
    functional: ["Ingest play events", "Compute top K per window and country", "Serve charts quickly"],
    nonFunctional: [
      "Very high ingest rate",
      "Charts fresh within minutes",
      "Approximate is acceptable for live charts; official charts must be exact",
    ],
    estimates: ["500 million plays per day ≈ 6k per second on average, with peaks well above"],
    components: [
      "Event ingestion (Kafka)",
      "Stream processors with windowed aggregation",
      "Count-Min Sketch plus heap for heavy hitters",
      "Batch jobs for exact daily counts",
      "Top-K store (Redis sorted sets) behind an API",
    ],
    deepDives: [
      {
        title: "Windows",
        notes:
          "Tumbling versus sliding windows, handling late events with watermarks, pre-aggregating small buckets.",
      },
      {
        title: "Approximate vs exact",
        notes: "Sketch-based heavy hitters for speed; batch recomputation for exact official numbers.",
      },
      {
        title: "Partitioning and merging",
        notes:
          "Partition by song ID; each partition keeps more than K candidates so the merged result is correct.",
      },
    ],
    pitfalls: [
      "Updating a database row per play",
      "One global counter bottleneck",
      "Merging partial top-K lists that kept only K items each",
    ],
    followUps: [
      "How do you stop fake plays inflating charts?",
      "How do you backfill after an outage?",
      "How would you compute top K per user?",
    ],
    rubric: [
      "Streaming ingestion with windowed aggregation",
      "Weighed approximate against exact counting",
      "Partitioned and merged partial results correctly",
      "Served from precomputed results",
      "Handled late and duplicate events",
    ],
  },
  {
    slug: "recommendation-system",
    title: "Design a content recommendation system (YouTube, Netflix)",
    category: "social",
    difficulty: "hard",
    prompt: "Design a content recommendation system, like YouTube's or Netflix's personalised home page.",
    concepts: ["sd-async-queues", "sd-data-caching", "model-evaluation", "kafka"],
    listedIn: ["leetcode-most-asked"],
    clarify: [
      "Which items and which surfaces?",
      "How fresh must recommendations be?",
      "New users and new items (cold start)?",
      "Latency budget? How is success measured?",
    ],
    functional: [
      "A personalised list of items per user",
      "Learn from views, likes and skips",
      "Handle new users and new items",
    ],
    nonFunctional: [
      "Serving in about 100–200 ms",
      "Millions of users and items",
      "Measurable through online experiments",
    ],
    estimates: ["Candidate generation must narrow millions of items to a few hundred per request"],
    components: [
      "Interaction logging pipeline",
      "Feature store",
      "Offline model training",
      "Candidate generation (collaborative filtering, embeddings with nearest-neighbour search)",
      "Ranking service",
      "Re-ranking for diversity and rules; A/B testing",
    ],
    deepDives: [
      {
        title: "Two-stage architecture",
        notes:
          "Cheap candidate generation over everything, then an expensive model ranks only the candidates.",
      },
      {
        title: "Freshness",
        notes: "Batch features plus streaming features for recent activity; avoid training/serving skew.",
      },
      {
        title: "Evaluation",
        notes:
          "Offline metrics guide development; online A/B tests decide; watch feedback loops and popularity bias.",
      },
    ],
    pitfalls: ["Scoring every item for every request", "No cold-start plan", "Optimising only for clicks"],
    followUps: [
      "What do you recommend to a brand-new user?",
      "How do recommendations react right after a view?",
      "How do you avoid showing only one genre?",
    ],
    rubric: [
      "Two-stage candidate generation and ranking",
      "Data and feature pipeline with freshness",
      "Cold-start strategy",
      "Serving latency and caching",
      "Evaluation and experiments",
    ],
  },

  /* ---------------------------- Search ---------------------------- */
  {
    slug: "typeahead",
    title: "Design search autocomplete (typeahead)",
    category: "search",
    difficulty: "medium",
    prompt: "Design search autocomplete that suggests the top completions as the user types.",
    concepts: ["caching", "sd-data-caching", "trees", "kafka"],
    listedIn: ["neetcode"],
    clarify: [
      "How many suggestions?",
      "Personalised?",
      "How quickly must trending queries appear?",
      "Latency target per keystroke? Languages?",
    ],
    functional: [
      "Return the top K completions for a prefix",
      "Update suggestions from search logs",
      "Filter offensive terms",
    ],
    nonFunctional: ["Under 100 ms per keystroke", "Very high read volume", "Fresh within minutes to hours"],
    estimates: [
      "Each search involves several keystrokes, so request volume is several times the search volume",
    ],
    components: [
      "Search logs to an aggregation pipeline",
      "Offline-built trie or prefix → top-K table",
      "In-memory serving layer sharded by prefix",
      "CDN and browser caching",
      "Client-side debouncing",
    ],
    deepDives: [
      {
        title: "Data structure",
        notes:
          "A trie with top-K stored at each node, or a precomputed prefix-to-top-K map; never compute top K per request.",
      },
      {
        title: "Building and updating",
        notes:
          "Rebuild periodically from logs; apply streaming deltas for trending terms; swap versions atomically.",
      },
      {
        title: "Sharding and caching",
        notes: "Shard by prefix ranges sized by traffic; cache hot prefixes at the edge.",
      },
    ],
    pitfalls: [
      "SQL LIKE queries on every keystroke",
      "Computing top K at request time",
      "No client-side debouncing or caching",
    ],
    followUps: [
      "How would you personalise suggestions?",
      "How do you handle typos?",
      "How do you remove a harmful suggestion immediately?",
    ],
    rubric: [
      "Prefix structure with precomputed top K",
      "Offline building separated from serving",
      "Sharding and caching for request volume",
      "Freshness strategy",
      "Client-side optimisations",
    ],
  },
  /* ---------------------------- Messaging ---------------------------- */
  {
    slug: "whatsapp",
    title: "Design a chat app (WhatsApp)",
    category: "messaging",
    difficulty: "hard",
    prompt:
      "Design a chat application like WhatsApp with one-to-one and group messages, delivery receipts and online presence.",
    concepts: ["sockets", "sd-scaling-load-balancing", "message-queues", "sd-consistency"],
    listedIn: ["neetcode"],
    clarify: [
      "Maximum group size?",
      "Media messages?",
      "How long is history kept?",
      "End-to-end encryption? Several devices per user?",
    ],
    functional: [
      "Send and receive 1:1 and group messages in real time",
      "Deliver messages to offline users later",
      "Sent, delivered and read receipts",
      "Online presence and last seen",
    ],
    nonFunctional: [
      "Low delivery latency",
      "Messages are never lost",
      "Ordered within a conversation",
      "Tens of millions of open connections",
    ],
    estimates: ["500 million DAU × 40 messages per day ≈ 230k messages per second"],
    components: [
      "Connection gateways (WebSockets) and a session registry",
      "Chat service",
      "Message store partitioned by conversation (wide-column store)",
      "Per-user inbox for undelivered messages",
      "Push notification service",
      "Presence service; media service with object storage",
    ],
    deepDives: [
      {
        title: "Routing to the recipient",
        notes:
          "A session registry maps users to the gateway holding their connection; the chat service forwards there, or stores the message and sends a push if offline.",
      },
      {
        title: "Ordering and delivery",
        notes:
          "Per-conversation sequence numbers; acknowledgements at each hop with retries; client-generated message IDs make retries idempotent.",
      },
      {
        title: "Groups and presence",
        notes:
          "Fan out to members' inboxes for small groups; presence via heartbeats in an in-memory store with TTLs, shared only with interested contacts.",
      },
    ],
    pitfalls: [
      "Polling for new messages",
      "Requiring a global order across all conversations",
      "Writing every presence heartbeat to the main database",
    ],
    followUps: [
      "How do you support several devices per user?",
      "How does end-to-end encryption change the server's role?",
      "How do you handle a 1,000-member group?",
    ],
    rubric: [
      "Persistent connections and message routing",
      "Message storage model and partitioning",
      "Delivery guarantees, acknowledgements and ordering",
      "Offline delivery and push",
      "Presence and group fan-out",
    ],
  },

  /* ---------------------------- Collaboration & storage ---------------------------- */
  {
    slug: "google-docs",
    title: "Design collaborative editing (Google Docs)",
    category: "collaboration",
    difficulty: "hard",
    prompt:
      "Design collaborative document editing like Google Docs, where several people edit the same document at the same time.",
    concepts: ["sockets", "sd-consistency", "sd-data-caching"],
    listedIn: ["neetcode"],
    clarify: [
      "How many concurrent editors per document?",
      "Offline editing?",
      "Rich text or plain text?",
      "Version history, comments, permissions?",
    ],
    functional: [
      "Real-time concurrent editing",
      "See collaborators' cursors",
      "Version history",
      "Sharing permissions",
    ],
    nonFunctional: [
      "Others see edits within a few hundred milliseconds",
      "All copies converge to the same document",
      "No edit is lost",
      "Works on flaky connections",
    ],
    estimates: ["Most documents have few concurrent editors; operations are tiny but very frequent"],
    components: [
      "Collaboration service holding live document sessions (routed by document ID)",
      "Operation log and periodic snapshots",
      "OT or CRDT engine",
      "WebSocket gateway",
      "Presence and permissions services",
    ],
    deepDives: [
      {
        title: "Conflict resolution",
        notes:
          "Operational Transformation with a central server ordering operations, or CRDTs that merge without a central authority; know the trade-offs of each.",
      },
      {
        title: "Session routing",
        notes:
          "One server owns a document's live session at a time; clients reconnect to the new owner after failover.",
      },
      {
        title: "Storage",
        notes:
          "Append operations to a log and snapshot periodically; version history comes from snapshots plus operations.",
      },
    ],
    pitfalls: [
      "Last-write-wins on whole documents",
      "Locking paragraphs",
      "Saving the whole document on every keystroke",
    ],
    followUps: [
      "How do offline edits sync later?",
      "How do you scale one document with 100 editors?",
      "How do you implement per-user undo?",
    ],
    rubric: [
      "Explained OT or CRDT convergence",
      "Real-time transport and session routing",
      "Operation log plus snapshots",
      "Presence and cursors",
      "Offline and failure handling",
    ],
  },
  {
    slug: "dropbox",
    title: "Design file storage and sync (Dropbox, Google Drive)",
    category: "collaboration",
    difficulty: "hard",
    prompt: "Design a file storage and sync service like Dropbox or Google Drive.",
    concepts: ["sd-data-caching", "cdn-caching", "sd-consistency", "sd-security"],
    listedIn: ["neetcode", "leetcode-most-asked"],
    clarify: [
      "Maximum file size?",
      "Sync across devices?",
      "Sharing and permissions?",
      "Versioning? Offline edits?",
    ],
    functional: [
      "Upload and download files",
      "Sync changes across devices",
      "Share files and folders",
      "Keep version history",
    ],
    nonFunctional: [
      "No data loss",
      "Transfer only what changed",
      "Consistent file metadata",
      "Access control enforced everywhere",
    ],
    estimates: ["Storage is dominated by file bytes; content-hash deduplication reduces it"],
    components: [
      "Client sync engine with a local database",
      "Chunking (e.g. 4 MB blocks) with content hashes",
      "Block storage in an object store with pre-signed uploads",
      "Metadata service (files, versions, chunks, permissions) in a consistent database",
      "Change notifications (long polling or WebSockets)",
      "CDN for downloads",
    ],
    deepDives: [
      {
        title: "Chunking and deduplication",
        notes:
          "Upload only new chunks, identified by hash; resumable uploads; the same chunk is stored once.",
      },
      {
        title: "Metadata and conflicts",
        notes:
          "Versioned metadata in a transactional store; concurrent offline edits create conflicted copies rather than silent overwrites.",
      },
      {
        title: "Sync protocol",
        notes:
          "Clients keep a cursor into a per-user change journal and fetch changes since it after a notification.",
      },
    ],
    pitfalls: [
      "Re-uploading the whole file for every change",
      "Keeping file bytes in the metadata database",
      "Ignoring conflicts from offline edits",
    ],
    followUps: [
      "How do you sync a 10 GB file efficiently?",
      "How do you share a folder with 1,000 users?",
      "How do you restore deleted files?",
    ],
    rubric: [
      "Chunking with hashes and deduplication",
      "Metadata separated from block storage",
      "Sync protocol and change notifications",
      "Conflict handling and versioning",
      "Access control and durability",
    ],
  },

  /* ---------------------------- Media ---------------------------- */
  {
    slug: "youtube",
    title: "Design a video platform (YouTube)",
    category: "media",
    difficulty: "hard",
    prompt: "Design a video platform like YouTube: users upload videos and millions of people watch them.",
    concepts: ["cdn-caching", "sd-async-queues", "sd-data-caching", "sd-scaling-load-balancing"],
    listedIn: ["neetcode"],
    clarify: [
      "Upload volume and file sizes?",
      "Live streaming or only recorded video?",
      "Devices and resolutions?",
      "Comments and likes in scope?",
    ],
    functional: [
      "Upload videos",
      "Transcode to several resolutions",
      "Stream with adaptive bitrate",
      "Store and show video metadata",
    ],
    nonFunctional: [
      "Smooth playback worldwide",
      "Durable, resumable uploads",
      "Huge read bandwidth",
      "Cost efficiency",
    ],
    estimates: [
      "Bandwidth dominates: concurrent viewers × bitrate",
      "Storage = uploads × number of renditions",
    ],
    components: [
      "Resumable upload service writing to object storage",
      "Transcoding pipeline: queue and workers running a task graph",
      "Object storage and CDN",
      "Metadata database",
      "View-count pipeline",
    ],
    deepDives: [
      {
        title: "Transcoding pipeline",
        notes:
          "Split videos into chunks encoded in parallel; idempotent tasks with retries; publish once every rendition exists.",
      },
      {
        title: "Adaptive streaming and CDN",
        notes:
          "HLS/DASH segments and manifests let players switch quality; popular videos at the edge, the long tail from origin.",
      },
      {
        title: "Counting views",
        notes:
          "Asynchronous, approximate counters aggregated from events rather than one database row per video.",
      },
    ],
    pitfalls: [
      "Serving video from application servers",
      "Transcoding synchronously during the upload request",
      "One exact view counter row per video",
    ],
    followUps: [
      "How would you add live streaming?",
      "How do you cut CDN cost for rarely watched videos?",
      "How would you detect copyrighted content?",
    ],
    rubric: [
      "Upload and transcoding pipeline",
      "Adaptive streaming with a CDN",
      "Storage separated from metadata",
      "Bandwidth and storage estimates",
      "Asynchronous counters and analytics",
    ],
  },
  {
    slug: "netflix",
    title: "Design a streaming service (Netflix)",
    category: "media",
    difficulty: "hard",
    prompt:
      "Design a streaming service like Netflix: a fixed catalogue of films and series watched by hundreds of millions of subscribers.",
    concepts: ["cdn-caching", "sd-reliability", "sd-data-caching", "observability"],
    listedIn: ["neetcode"],
    clarify: [
      "Catalogue size?",
      "Devices and offline downloads?",
      "Is the personalised home page in scope?",
      "Regions and licensing rules?",
    ],
    functional: [
      "Browse the catalogue and home page",
      "Play with adaptive quality",
      "Resume playback on any device",
      "Profiles and subscriptions",
    ],
    nonFunctional: [
      "Playback is extremely available",
      "Low latency worldwide",
      "Enormous egress bandwidth",
      "Graceful degradation",
    ],
    estimates: ["Peak concurrent streams × average bitrate gives peak egress (terabits per second)"],
    components: [
      "Control plane: catalogue, profiles, playback authorisation, DRM licences",
      "Data plane: CDN caches inside ISP networks with pre-positioned content",
      "Encoding pipeline",
      "Playback-state store",
      "Recommendation service",
    ],
    deepDives: [
      {
        title: "Pre-positioning content",
        notes:
          "Fill edge caches overnight based on predicted popularity so peak traffic rarely reaches origin.",
      },
      {
        title: "Starting playback",
        notes:
          "Authorise, issue a DRM licence, return a manifest and pick a nearby healthy cache; each step has a fallback.",
      },
      {
        title: "Resilience",
        notes:
          "Degrade personalisation before playback, run multiple regions, test failure deliberately (chaos engineering).",
      },
    ],
    pitfalls: [
      "Designing it like user-uploaded video",
      "A single-region control plane",
      "Personalisation on the critical playback path without a fallback",
    ],
    followUps: [
      "How do you handle a new season's release spike?",
      "How does a player switch caches mid-stream?",
      "How do you sync 'continue watching'?",
    ],
    rubric: [
      "Separated control plane and data plane",
      "Edge pre-positioning of content",
      "Playback start flow including DRM",
      "Resilience and graceful degradation",
      "Egress capacity estimates",
    ],
  },

  /* ---------------------------- Location & marketplaces ---------------------------- */
  {
    slug: "yelp",
    title: "Design a proximity service (Yelp)",
    category: "location",
    difficulty: "medium",
    prompt:
      "Design a proximity service like Yelp: find nearby businesses and show their details and reviews.",
    concepts: ["postgres-indexes", "sd-data-caching", "caching"],
    listedIn: ["neetcode"],
    clarify: [
      "Search radius and filters?",
      "How many businesses?",
      "How often do businesses change?",
      "Are reviews in scope?",
    ],
    functional: [
      "Search businesses near a location with filters",
      "View business details",
      "Add businesses and reviews",
    ],
    nonFunctional: ["Low-latency search", "Read-heavy", "Business data may be slightly stale"],
    estimates: ["About 200 million businesses fit on a few nodes; search requests dominate the load"],
    components: [
      "Location search service backed by a geospatial index (geohash, quadtree or PostGIS)",
      "Business database",
      "Review service",
      "Cache for popular areas",
    ],
    deepDives: [
      {
        title: "Geospatial indexing",
        notes:
          "Geohash prefixes plus neighbouring cells to avoid edge misses; quadtrees adapt to density; PostGIS GiST indexes for simplicity.",
      },
      {
        title: "Updates vs reads",
        notes: "Businesses change rarely: rebuild or update the index asynchronously and keep reads fast.",
      },
      { title: "Ranking", notes: "Combine distance, rating and relevance; paginate with cursors." },
    ],
    pitfalls: [
      "Computing distance to every business",
      "Ignoring geohash cell boundaries",
      "No plan for very dense cities",
    ],
    followUps: [
      "How do you handle dense city centres?",
      "How would you support 'open now'?",
      "How do you rank by relevance and distance?",
    ],
    rubric: [
      "Geospatial index with boundary handling",
      "Read path with caching",
      "Data model for businesses and reviews",
      "Ranking and filtering",
      "Estimates",
    ],
  },
  {
    slug: "uber",
    title: "Design ride-hailing (Uber)",
    category: "location",
    difficulty: "hard",
    prompt:
      "Design a ride-hailing service like Uber: riders request rides and are matched with nearby drivers in real time.",
    concepts: ["sd-consistency", "sd-scaling-load-balancing", "locking-concurrency", "sd-async-queues"],
    listedIn: ["neetcode"],
    clarify: ["Matching radius and timeouts?", "Surge pricing in scope?", "Payments?", "Which regions?"],
    functional: [
      "Drivers stream their location",
      "Riders request a ride and are matched",
      "Live trip tracking",
      "Trip history and payment",
    ],
    nonFunctional: [
      "Very high location-update rate",
      "Matching within seconds",
      "A driver is never assigned two trips",
      "Each city keeps working if others fail",
    ],
    estimates: ["1 million active drivers updating every 4 seconds ≈ 250k updates per second"],
    components: [
      "Location ingestion into an in-memory geospatial index of cells, sharded by region",
      "Matching service",
      "Trip service with a state machine",
      "Notifications",
      "Pricing, payments and ETA services",
    ],
    deepDives: [
      {
        title: "Location index",
        notes:
          "Geohash or hexagonal cells in memory, sharded by city; expire stale drivers; never write every update to the main SQL database.",
      },
      {
        title: "Matching without double assignment",
        notes:
          "Atomically reserve a driver (conditional update or lock with expiry) before offering; release on timeout or decline.",
      },
      {
        title: "Trip state machine",
        notes:
          "Idempotent transitions (requested → accepted → started → completed), payment as a saga, events for other services.",
      },
    ],
    pitfalls: [
      "Storing every location update in the primary database",
      "Matching without reserving the driver",
      "One global matching service",
    ],
    followUps: [
      "How would surge pricing work?",
      "What if a driver goes offline mid-trip?",
      "How do you estimate arrival times?",
    ],
    rubric: [
      "High-rate location ingestion and geospatial index",
      "Matching with exclusive driver reservation",
      "Trip state machine",
      "Regional sharding and availability",
      "Estimates and real-time updates",
    ],
  },
  {
    slug: "google-maps",
    title: "Design maps and navigation (Google Maps)",
    category: "location",
    difficulty: "hard",
    prompt:
      "Design a maps and navigation service like Google Maps: map tiles, place search and routes with live traffic.",
    concepts: ["cdn-caching", "graphs", "sd-data-caching", "kafka"],
    listedIn: ["neetcode"],
    clarify: [
      "Which features: tiles, search, routing, ETA, traffic?",
      "Global coverage?",
      "Offline maps?",
      "Turn-by-turn rerouting?",
    ],
    functional: [
      "Render map tiles at each zoom level",
      "Search places",
      "Compute fastest routes",
      "Live traffic and ETAs",
    ],
    nonFunctional: [
      "Very high tile read volume",
      "Route answers in under a second",
      "Traffic fresh within minutes",
      "Location data handled privately",
    ],
    estimates: ["Tiles are static and cacheable; routing is CPU-heavy"],
    components: [
      "Tile pipeline, tile storage and CDN (vector tiles)",
      "Geocoding and place search",
      "Road graph partitioned by region",
      "Routing engine with precomputation",
      "Traffic ingestion from phones via stream processing",
      "ETA service",
    ],
    deepDives: [
      {
        title: "Routing at scale",
        notes:
          "Plain Dijkstra over a continent is too slow; precomputation such as contraction hierarchies plus A* makes queries fast.",
      },
      {
        title: "Live traffic",
        notes:
          "Aggregate anonymised GPS probes per road segment, update edge weights frequently, recompute affected ETAs.",
      },
      {
        title: "Tile serving",
        notes:
          "Pre-rendered tile pyramid per zoom level, served from the CDN; regenerate only changed areas.",
      },
    ],
    pitfalls: [
      "Running Dijkstra on the global graph per request",
      "Rendering tiles on every request",
      "Ignoring the privacy of location data",
    ],
    followUps: [
      "How do you reroute during a trip?",
      "How would offline maps work?",
      "How do you handle road closures?",
    ],
    rubric: [
      "Tile pipeline with a CDN",
      "Routing with precomputation",
      "Traffic ingestion and freshness",
      "Partitioning by region",
      "Privacy and estimates",
    ],
  },

  /* ---------------------------- Commerce ---------------------------- */
  {
    slug: "ticketmaster",
    title: "Design a ticket booking system (Ticketmaster)",
    category: "commerce",
    difficulty: "hard",
    prompt:
      "Design a ticket booking system like Ticketmaster, where a popular concert's seats sell out within minutes.",
    concepts: ["transactions-isolation", "locking-concurrency", "idempotency", "sd-consistency"],
    caseStudy: "cs-booking-platform",
    listedIn: ["neetcode"],
    clarify: [
      "Assigned seats or general admission?",
      "How long is a seat held during checkout?",
      "Peak demand?",
      "Fairness requirements?",
    ],
    functional: [
      "Browse events and seat maps",
      "Hold seats during checkout",
      "Pay and confirm tickets",
      "Release expired holds",
    ],
    nonFunctional: [
      "A seat is never sold twice",
      "Survives extreme spikes",
      "Fair access",
      "Responsive seat map",
    ],
    estimates: ["Hundreds of thousands of users competing for tens of thousands of seats within minutes"],
    components: [
      "Event catalogue (cached)",
      "Seat inventory in a strongly consistent database",
      "Reservation service with hold expiry",
      "Payment service with idempotency keys",
      "Virtual waiting room",
    ],
    deepDives: [
      {
        title: "No double booking",
        notes:
          "Conditional updates or row locks plus unique constraints; holds with an expiry time; the database is the source of truth.",
      },
      {
        title: "Spikes and fairness",
        notes: "A waiting room admits users gradually; cache seat maps; serve browsing from replicas.",
      },
      {
        title: "Payment vs hold",
        notes:
          "Idempotent payment calls; confirm only if the hold is still valid; a sweeper releases expired holds; refund if payment arrives late.",
      },
    ],
    pitfalls: [
      "Check-then-insert races",
      "Holding database locks during payment",
      "Using the cache as the source of seat availability",
    ],
    followUps: [
      "How do you stop bots?",
      "How do you keep the seat map nearly live for many viewers?",
      "What if payment succeeds after the hold expired?",
    ],
    rubric: [
      "Strongly consistent seat inventory with holds",
      "Spike handling and fairness",
      "Payment and hold workflow with idempotency",
      "Read scaling for catalogue and seat maps",
      "Bot and abuse considerations",
    ],
  },
  {
    slug: "ecommerce",
    title: "Design an e-commerce platform (Amazon)",
    category: "commerce",
    difficulty: "hard",
    prompt:
      "Design an e-commerce platform like Amazon: product catalogue, search, cart, checkout and order tracking.",
    concepts: [
      "sd-api-design",
      "sd-async-queues",
      "transactions-isolation",
      "caching",
      "sd-scaling-load-balancing",
    ],
    listedIn: ["leetcode-most-asked"],
    clarify: [
      "Marketplace with third-party sellers?",
      "Peak events such as Black Friday?",
      "How strict is inventory accuracy?",
      "Payments in scope?",
    ],
    functional: [
      "Browse and search products",
      "Shopping cart",
      "Checkout and payment",
      "Order status and history",
    ],
    nonFunctional: [
      "Catalogue reads fast and always available",
      "Checkout correct: no overselling, no double charging",
      "Scales for peak events",
    ],
    estimates: [
      "Browsing traffic is orders of magnitude higher than orders; peaks are many times the average",
    ],
    components: [
      "Catalogue service and search index",
      "Cart service",
      "Inventory, order and payment services",
      "Checkout orchestrator (saga)",
      "Fulfilment and notifications via events",
      "CDN for images",
    ],
    deepDives: [
      {
        title: "Checkout saga",
        notes:
          "Reserve inventory → charge → create order, with compensations at each step instead of one distributed transaction.",
      },
      {
        title: "Inventory",
        notes:
          "Reserve at checkout, not when adding to the cart; decide how much overselling is tolerable for each product type.",
      },
      {
        title: "Catalogue and search",
        notes: "Denormalised read models, search index fed by change events, aggressive caching.",
      },
    ],
    pitfalls: [
      "One distributed transaction across services",
      "Decrementing inventory when items enter the cart",
      "Synchronous calls to every service during checkout",
    ],
    followUps: [
      "How do you handle flash sales?",
      "How does search stay in sync with catalogue changes?",
      "How would you split a monolith into services?",
    ],
    rubric: [
      "Service boundaries and data ownership",
      "Checkout saga with idempotent payments",
      "Inventory reservation strategy",
      "Read scaling for catalogue and search",
      "Peak traffic handling",
    ],
  },
  {
    slug: "payment-system",
    title: "Design a payment system",
    category: "commerce",
    difficulty: "hard",
    prompt:
      "Design a payment system for an online merchant that charges cards through external payment providers and keeps an accurate ledger.",
    concepts: ["idempotency", "transactions-isolation", "retries-backoff", "sd-reliability", "sd-security"],
    listedIn: [],
    clarify: [
      "Card payments only, or refunds and payouts too?",
      "One provider or several?",
      "Currencies?",
      "Compliance (PCI DSS) and reconciliation needs?",
    ],
    functional: [
      "Create payments and charge them through a provider",
      "Refunds",
      "A ledger of every money movement",
      "Reconcile with provider reports",
    ],
    nonFunctional: [
      "Never double-charge",
      "Never lose a payment's state",
      "Fully auditable",
      "Card data kept out of your systems",
    ],
    estimates: ["Moderate transaction rate, extreme correctness requirements"],
    components: [
      "Payment API with idempotency keys",
      "Payment state machine",
      "Provider adapters and webhook handler",
      "Double-entry ledger",
      "Reconciliation jobs",
      "Outbox for payment events",
    ],
    deepDives: [
      {
        title: "Exactly-once effects",
        notes:
          "Idempotency keys stored with a unique constraint; state transitions as conditional updates; pass keys to the provider.",
      },
      {
        title: "Unknown outcomes",
        notes:
          "A timeout does not mean failure: query the provider, process its webhooks, and reconcile daily.",
      },
      {
        title: "Ledger",
        notes:
          "Immutable double-entry records where every movement debits one account and credits another; balances are derived.",
      },
    ],
    pitfalls: [
      "Retrying charges without idempotency keys",
      "Updating balances in place without a ledger",
      "Storing raw card numbers",
    ],
    followUps: [
      "What do you do when the provider times out after charging?",
      "How do refunds and chargebacks work?",
      "How do you switch providers during an outage?",
    ],
    rubric: [
      "Idempotent payment API and state machine",
      "Handled ambiguous provider outcomes",
      "Double-entry ledger",
      "Reconciliation and auditability",
      "Security and reduced PCI scope",
    ],
  },

  /* ---------------------------- Developer platforms ---------------------------- */
  {
    slug: "online-judge",
    title: "Design an online judge (LeetCode)",
    category: "developer",
    difficulty: "medium",
    prompt:
      "Design an online coding judge like LeetCode: users submit code that runs against hidden tests, with contests and a live leaderboard.",
    concepts: ["sd-security", "sd-async-queues", "docker-kubernetes", "caching"],
    listedIn: ["neetcode"],
    clarify: [
      "Which languages?",
      "How many concurrent submissions during contests?",
      "Time and memory limits?",
      "Leaderboard freshness?",
    ],
    functional: [
      "Browse problems",
      "Submit code",
      "Run it against tests and return a verdict",
      "Contests with a live leaderboard",
    ],
    nonFunctional: [
      "Untrusted code is isolated",
      "Fair and consistent limits",
      "Survives contest spikes",
      "Verdicts within seconds",
    ],
    estimates: ["20k contestants submitting in bursts → thousands of executions per minute"],
    components: [
      "Problem service and test-data storage",
      "Submission API and queue",
      "Sandboxed runner pool (containers or microVMs, no network, resource limits)",
      "Results store",
      "Leaderboard (Redis sorted sets)",
      "Autoscaling",
    ],
    deepDives: [
      {
        title: "Sandboxing",
        notes:
          "Containers with seccomp and dropped capabilities, or gVisor/Firecracker for stronger isolation; no network; CPU, memory and time limits.",
      },
      {
        title: "Queueing and scaling",
        notes:
          "Asynchronous judging with idempotent jobs, priorities for contests, runner autoscaling ahead of contest start.",
      },
      {
        title: "Leaderboard",
        notes: "Sorted sets keyed by score with tie-breaking by time; freeze near the end of a contest.",
      },
    ],
    pitfalls: [
      "Running user code on API servers",
      "No CPU, memory or time limits",
      "Executing synchronously inside the HTTP request",
    ],
    followUps: [
      "How do you detect cheating?",
      "How would interactive problems work?",
      "How do you keep timing fair across machines?",
    ],
    rubric: [
      "Strong sandboxing of untrusted code",
      "Asynchronous queue with scalable runners",
      "Resource limits and fair timing",
      "Leaderboard design",
      "Spike handling",
    ],
  },
  {
    slug: "developer-portal",
    title: "Design an internal developer portal (Backstage)",
    category: "developer",
    difficulty: "medium",
    prompt:
      "Design an internal developer portal, like Backstage, with a software catalogue, documentation and service templates for a company with hundreds of services.",
    concepts: ["component-architecture", "sd-api-design", "sd-security"],
    caseStudy: "cs-developer-portal",
    listedIn: [],
    clarify: [
      "How many services and teams?",
      "Which data sources (Git, CI, Kubernetes, cloud)?",
      "Who maintains the metadata?",
      "SSO and permissions?",
    ],
    functional: [
      "Software catalogue with owners and dependencies",
      "Documentation per service",
      "Templates to create new services",
      "Plugins showing CI and deployment status",
    ],
    nonFunctional: [
      "Metadata stays fresh",
      "Fast despite slow integrations",
      "Integration credentials stay server-side",
      "Teams can extend it",
    ],
    estimates: [
      "Hundreds of services and thousands of users: freshness and ownership matter more than raw scale",
    ],
    components: [
      "Catalogue backend ingesting descriptor files from repositories",
      "PostgreSQL and a search index",
      "Frontend and backend plugin system",
      "Integration proxies with caching",
      "Scaffolder for templates",
      "SSO",
    ],
    deepDives: [
      {
        title: "Catalogue ingestion",
        notes:
          "Metadata lives next to the code; periodic and webhook-driven refresh; validation errors shown to owners.",
      },
      {
        title: "Plugin architecture",
        notes:
          "Extension points let teams add features independently; costs are version compatibility and uneven quality.",
      },
      {
        title: "Integrations",
        notes: "Backend plugins hold credentials, cache slow APIs, enforce permissions and rate limits.",
      },
    ],
    pitfalls: [
      "A hand-maintained spreadsheet of services",
      "Calling external APIs from the browser with personal tokens",
      "No ownership, so data goes stale",
    ],
    followUps: [
      "How do you measure adoption?",
      "What happens when a plugin crashes?",
      "How do you encourage golden paths?",
    ],
    rubric: [
      "Catalogue model and ingestion",
      "Freshness and ownership",
      "Plugin architecture",
      "Integration caching and security",
      "Adoption and observability",
    ],
  },
  {
    slug: "llm-vuln-triage",
    title: "Design LLM-assisted vulnerability triage",
    category: "developer",
    difficulty: "hard",
    prompt: "Design a system where LLM agents triage dependency vulnerability alerts for many repositories.",
    concepts: ["tool-calling", "model-evaluation", "prompt-injection", "agent-reliability"],
    caseStudy: "cs-llm-vuln-triage",
    listedIn: [],
    clarify: [
      "Alert volume?",
      "Which ecosystems and languages?",
      "Who consumes the output?",
      "Tolerance for false negatives? Budget per alert?",
    ],
    functional: [
      "Ingest alerts",
      "Investigate whether vulnerable code is reachable",
      "Produce a structured verdict with evidence",
      "Human review interface",
    ],
    nonFunctional: [
      "High recall on affected alerts",
      "Safe: read-only tools, resistant to prompt injection",
      "Bounded cost and latency",
      "Auditable",
    ],
    estimates: [
      "Alerts per day × tool calls × tokens per call gives cost; repositories can be processed in parallel",
    ],
    components: [
      "Intake queue and advisory enrichment",
      "Read-only repository snapshot",
      "Agent runner with tools and budgets",
      "Schema and evidence validator",
      "Results store and review UI",
      "Evaluation pipeline",
    ],
    deepDives: [
      {
        title: "Agent design",
        notes:
          "A few read-only tools (search, read file, find usages), step and token budgets, a structured verdict with cited evidence.",
      },
      {
        title: "Reliability",
        notes:
          "A labelled evaluation set, recall on affected alerts, calibration, evidence validity, regression runs on every change.",
      },
      {
        title: "Safety",
        notes:
          "Repository text is untrusted (prompt injection); no network or write tools; human review for anything not clearly affected.",
      },
    ],
    pitfalls: [
      "Trusting verdicts without validating evidence",
      "Optimising accuracy instead of recall",
      "Giving the agent write or network access",
    ],
    followUps: [
      "How do you evaluate a new model version?",
      "How do you handle huge monorepos?",
      "When, if ever, can alerts be closed automatically?",
    ],
    rubric: [
      "Pipeline and agent tools",
      "Structured output with validated evidence",
      "Evaluation focused on false negatives",
      "Safety boundaries",
      "Human review and cost control",
    ],
  },
];
