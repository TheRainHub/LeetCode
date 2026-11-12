/**
 * Visual guides from ByteByteGo's System Design 101 (CC BY-NC-ND 4.0).
 * The guides are not committed here: `npm run guides:import` downloads the
 * repository locally and the app shows them unchanged, with attribution.
 * This file only says which guides relate to which InterviewOS lessons and
 * system design questions (guide slugs are file names reduced to [a-z0-9-]).
 */

export const GUIDES_SOURCE = {
  key: "bytebytego-sd101",
  name: "ByteByteGo — System Design 101",
  author: "ByteByteGo",
  repoUrl: "https://github.com/ByteByteGoHq/system-design-101",
  dir: "system-design-101",
  license: "CC BY-NC-ND 4.0",
  licenseUrl: "https://creativecommons.org/licenses/by-nc-nd/4.0/",
} as const;

/** Link to the original guide file on GitHub. */
export function guideSourceUrl(path: string): string {
  return `${GUIDES_SOURCE.repoUrl}/blob/HEAD/${path.split("/").map(encodeURIComponent).join("/")}`;
}

/** InterviewOS lesson slug → related guides, most useful first. */
export const GUIDES_FOR_LESSON: Record<string, string[]> = {
  "rest-api-design": [
    "how-does-rest-api-work",
    "8-tips-for-efficient-api-design",
    "how-do-we-perform-pagination-in-api-design",
    "a-cheatsheet-on-comparing-api-architectural-styles",
  ],
  graphql: ["how-does-graphql-work-in-the-real-world", "graphql-adoption-patterns"],
  "sql-queries": [
    "how-do-sql-joins-work",
    "visualizing-a-sql-query",
    "how-is-a-sql-statement-executed-in-the-database",
  ],
  "postgres-indexes": ["8-data-structures-that-power-your-databases"],
  "query-optimization": [
    "a-cheatsheet-on-database-performance",
    "how-is-a-sql-statement-executed-in-the-database",
  ],
  "transactions-isolation": ["what-are-database-isolation-levels", "what-does-acid-mean"],
  caching: [
    "cache-systems-every-developer-should-know",
    "top-8-cache-eviction-strategies",
    "how-can-cache-systems-go-wrong",
    "things-to-consider-when-using-cache",
  ],
  redis: [
    "why-is-redis-so-fast",
    "how-can-redis-be-used",
    "how-does-redis-persist-data",
    "memcached-vs-redis",
  ],
  "message-queues": ["types-of-message-queue", "how-do-message-queue-architectures-evolve"],
  kafka: ["why-is-kafka-fast", "can-kafka-lose-messages", "top-5-kafka-use-cases"],
  idempotency: ["top-6-cases-to-apply-idempotency", "how-to-avoid-double-payment"],
  "retries-backoff": ["how-do-we-retry-on-failures"],
  observability: ["logging-tracing-metrics", "push-vs-pull-in-metrics-collecting-systems"],
  "docker-kubernetes": ["how-does-docker-work", "what-is-k8s-kubernetes", "kubernetes-deployment-strategies"],
  "ci-cd": ["cicd-pipeline-explained-in-simple-terms", "top-5-most-used-deployment-strategies"],
  dns: ["how-does-the-domain-name-system-dns-lookup-work", "dns-record-types-you-should-know"],
  tls: ["how-does-https-work"],
  "http-versions": ["http1-http2-http3"],
  "cdn-caching": ["what-is-cdn-content-delivery-network"],
  "reverse-proxies": ["proxy-vs-reverse-proxy", "reverse-proxy-vs-api-gateway-vs-load-balancer"],
  "tcp-ip": ["what-is-osi-model"],
  udp: ["top-4-most-popular-use-cases-for-udp"],
  "processes-threads": ["what-is-the-difference-between-process-and-thread"],
  "garbage-collection": ["how-does-garbage-collection-work"],
  collections: ["java-collection-hierarchy"],
  "event-loop": ["how-does-javascript-work"],
  "sd-requirements": ["10-system-design-tradeoffs-you-cannot-ignore"],
  "sd-api-design": ["a-cheat-sheet-for-api-designs"],
  "sd-data-caching": [
    "7-must-know-strategies-to-scale-your-database",
    "a-crash-course-in-database-sharding",
    "consistent-hashing",
  ],
  "sd-scaling-load-balancing": [
    "how-to-scale-a-website-to-support-millions-of-users",
    "top-6-load-balancing-algorithms",
    "8-must-know-scalability-strategies",
  ],
  "sd-async-queues": [
    "orchestration-vs-choreography-microservices",
    "how-do-we-incorporate-event-sourcing-into-the-systems",
  ],
  "sd-consistency": [
    "cap-theorem-one-of-the-most-misunderstood-terms",
    "top-eventual-consistency-patterns-you-must-know",
  ],
  "sd-reliability": ["cloud-disaster-recovery-strategies"],
  "sd-observability": ["logging-tracing-metrics"],
  "sd-security": [
    "explaining-sessions-tokens-jwt-sso-and-oauth-in-one-diagram",
    "oauth-2-explained-with-siple-terms",
    "how-to-store-passwords-in-the-database",
  ],
};

/** System design question slug → related guides. */
export const GUIDES_FOR_QUESTION: Record<string, string[]> = {
  "url-shortener": [
    "what-happens-when-you-type-a-url-into-your-browser",
    "do-you-know-all-the-components-of-a-url",
  ],
  "rate-limiter": ["api-gateway-101", "a-cheatsheet-to-build-secure-apis"],
  "key-value-store": [
    "consistent-hashing",
    "cap-theorem-one-of-the-most-misunderstood-terms",
    "8-data-structures-that-power-your-databases",
  ],
  "message-queue": [
    "why-is-kafka-fast",
    "can-kafka-lose-messages",
    "how-do-message-queue-architectures-evolve",
  ],
  "distributed-cache": [
    "cache-systems-every-developer-should-know",
    "top-8-cache-eviction-strategies",
    "how-can-cache-systems-go-wrong",
    "consistent-hashing",
  ],
  "web-crawler": ["how-to-avoid-crawling-duplicate-urls-at-google-scale", "how-do-search-engines-work"],
  "monitoring-system": [
    "logging-tracing-metrics",
    "push-vs-pull-in-metrics-collecting-systems",
    "choose-the-right-database-for-metric-collecting-system",
  ],
  webhooks: ["polling-vs-webhooks"],
  "notification-system": [
    "how-does-a-typical-push-notification-system-work",
    "how-are-notifications-pushed-to-our-phones-or-pcs",
  ],
  "feature-flags": ["top-5-most-used-deployment-strategies"],
  twitter: ["twitter-architecture-2022-vs-2012", "how-does-twitter-recommend-tweets"],
  "recommendation-system": ["how-does-twitter-recommend-tweets"],
  whatsapp: [
    "how-do-we-design-a-chat-application-like-whatsapp-facebook-messenger-or-discord",
    "how-discord-stores-trillions-of-messages",
    "shortlong-polling-sse-websocket",
  ],
  "google-docs": ["how-to-design-google-docs"],
  dropbox: ["how-to-upload-a-large-file-to-s3", "what-happens-when-you-upload-a-file-to-amazon-s3"],
  youtube: [
    "how-does-youtube-handle-massive-video-content-upload",
    "live-streaming-explained",
    "what-is-cdn-content-delivery-network",
  ],
  netflix: [
    "netflixs-overall-architecture",
    "4-ways-netflix-uses-caching-to-hold-user-attention",
    "evolution-of-the-netflix-api-architecture",
  ],
  yelp: ["proximity-service"],
  uber: ["evolution-of-ubers-api-layer"],
  "google-maps": ["design-google-maps"],
  ticketmaster: ["how-to-avoid-double-payment", "what-are-database-isolation-levels"],
  ecommerce: ["e-commerce-workflow", "orchestration-vs-choreography-microservices"],
  "payment-system": [
    "payment-system",
    "how-to-avoid-double-payment",
    "reconciliation-in-payment",
    "10-principles-for-building-resilient-payment-systems-by-shopify",
  ],
  "online-judge": ["how-does-docker-work"],
  "llm-vuln-triage": ["what-is-an-ai-agent"],
};
