/**
 * Building blocks of the system design whiteboard and the rough defaults the load test starts from.
 *
 * Defaults are back-of-the-envelope rules of thumb, not measurements of any real product; every
 * number is editable on the board so the test reflects the user's own assumptions.
 */

export const COMPONENT_KINDS = [
  "client",
  "dns",
  "cdn",
  "loadBalancer",
  "apiGateway",
  "service",
  "realtime",
  "worker",
  "cache",
  "sql",
  "nosql",
  "queue",
  "objectStorage",
  "search",
  "external",
] as const;
export type ComponentKind = (typeof COMPONENT_KINDS)[number];

/**
 * How a component handles requests in the simulation:
 * source   — where traffic starts (clients);
 * balancer — spreads requests evenly over the healthy components it points to;
 * edgeCache — serves cache hits itself and forwards misses to its origin (CDN);
 * compute  — calls every dependency it points to for each request (services, workers);
 * cache    — in-memory cache; with arrows out it acts as a read-through cache;
 * store    — terminal data store; arrows out are change-data-capture (writes, asynchronous);
 * queue    — accepts messages; every consumer it points to receives all of them, asynchronously;
 * external — third-party API, terminal.
 */
export type ComponentRole =
  "source" | "balancer" | "edgeCache" | "compute" | "cache" | "store" | "queue" | "external";

export type KindGroup = "edge" | "compute" | "data" | "async" | "external";

export interface KindSpec {
  role: ComponentRole;
  group: KindGroup | "clients";
  /** Provider-run service: no instance count, assumed redundant by the provider. */
  managed: boolean;
  /** Default instances (nodes, brokers, replicas) for self-run components. */
  replicas: number;
  /** Requests (or operations, messages) per second one instance handles. Managed: total. */
  capacity: number;
  /** Mean time spent in this component per request, in milliseconds. */
  latencyMs: number;
  /** Share of reads served from cache (CDN, cache). */
  hitRate?: number;
  /** SQL only: number of shards (each with one primary). */
  shards?: number;
}

export const KIND_SPECS: Record<ComponentKind, KindSpec> = {
  client: { role: "source", group: "clients", managed: true, replicas: 1, capacity: 0, latencyMs: 0 },
  dns: { role: "balancer", group: "edge", managed: true, replicas: 1, capacity: 1_000_000, latencyMs: 1 },
  cdn: {
    role: "edgeCache",
    group: "edge",
    managed: true,
    replicas: 1,
    capacity: 1_000_000,
    latencyMs: 20,
    hitRate: 0.9,
  },
  loadBalancer: {
    role: "balancer",
    group: "edge",
    managed: false,
    replicas: 2,
    capacity: 50_000,
    latencyMs: 1,
  },
  apiGateway: {
    role: "balancer",
    group: "edge",
    managed: false,
    replicas: 2,
    capacity: 10_000,
    latencyMs: 5,
  },
  service: { role: "compute", group: "compute", managed: false, replicas: 2, capacity: 1_000, latencyMs: 20 },
  realtime: { role: "compute", group: "compute", managed: false, replicas: 2, capacity: 5_000, latencyMs: 5 },
  worker: { role: "compute", group: "compute", managed: false, replicas: 2, capacity: 200, latencyMs: 50 },
  cache: {
    role: "cache",
    group: "data",
    managed: false,
    replicas: 1,
    capacity: 100_000,
    latencyMs: 1,
    hitRate: 0.8,
  },
  sql: {
    role: "store",
    group: "data",
    managed: false,
    replicas: 1,
    capacity: 5_000,
    latencyMs: 5,
    shards: 1,
  },
  nosql: { role: "store", group: "data", managed: false, replicas: 3, capacity: 10_000, latencyMs: 5 },
  search: { role: "store", group: "data", managed: false, replicas: 2, capacity: 2_000, latencyMs: 30 },
  objectStorage: {
    role: "store",
    group: "data",
    managed: true,
    replicas: 1,
    capacity: 100_000,
    latencyMs: 50,
  },
  queue: { role: "queue", group: "async", managed: false, replicas: 3, capacity: 50_000, latencyMs: 5 },
  external: {
    role: "external",
    group: "external",
    managed: true,
    replicas: 1,
    capacity: 100,
    latencyMs: 300,
  },
};

export const roleOf = (kind: ComponentKind): ComponentRole => KIND_SPECS[kind].role;
export const isManaged = (kind: ComponentKind): boolean => KIND_SPECS[kind].managed;
export const hasHitRate = (kind: ComponentKind): boolean => KIND_SPECS[kind].hitRate !== undefined;
/** Data stores whose reads a cache-aside cache in front of them absorbs. */
export const isDatabase = (kind: ComponentKind): boolean => kind === "sql" || kind === "nosql";

/** Palette order, grouped. */
export const PALETTE_GROUPS: { group: KindSpec["group"]; kinds: ComponentKind[] }[] = [
  { group: "clients", kinds: ["client"] },
  { group: "edge", kinds: ["dns", "cdn", "loadBalancer", "apiGateway"] },
  { group: "compute", kinds: ["service", "realtime", "worker"] },
  { group: "data", kinds: ["cache", "sql", "nosql", "search", "objectStorage"] },
  { group: "async", kinds: ["queue"] },
  { group: "external", kinds: ["external"] },
];

export function isComponentKind(value: unknown): value is ComponentKind {
  return typeof value === "string" && (COMPONENT_KINDS as readonly string[]).includes(value);
}
