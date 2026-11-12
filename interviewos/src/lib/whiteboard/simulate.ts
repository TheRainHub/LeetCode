/**
 * A deliberately simple, deterministic load model for whiteboard designs. Nothing is deployed or
 * executed: requests are numbers flowing through the drawn graph, and every result follows from
 * the capacities, latencies and hit rates on the board.
 *
 * Rules (also shown to the user):
 * - Traffic starts at the clients (shared equally) and follows the arrows.
 * - Balancers (DNS, load balancer, API gateway) and clients split requests evenly over the healthy
 *   components they point to; components that are down are skipped.
 * - Services and workers call every dependency they point to on each request. If a service points
 *   to a cache, reads to the SQL/NoSQL databases it also points to shrink by the hit rate
 *   (cache-aside). When the cache is down, every read goes to the database.
 * - A CDN or a cache with arrows out serves hits itself and forwards misses and writes.
 * - Queues hand every message to each consumer asynchronously; arrows out of a data store are
 *   change-data-capture (writes only, asynchronous). Async work never fails or slows the request,
 *   but an overloaded or missing consumer makes the backlog grow.
 * - Every component sees the full demand (upstream drops are not subtracted), so all bottlenecks
 *   show at once. Utilisation = demand ÷ capacity; above 100 % the excess is dropped.
 * - Latency is the mean for a served request: each hop's latency grows as 1/(1 − utilisation)
 *   (single-queue approximation, capped at 95 %), and dependencies are called one after another.
 */
import { type BoardComponent, type BoardEdge, type BoardNode, isComponent, type Traffic } from "./board";
import { type ComponentRole, isDatabase, isManaged, roleOf } from "./catalog";

export type FailureMode = "instance" | "down";
export type Failures = Record<string, FailureMode>;
export type NodeStatus = "idle" | "ok" | "hot" | "overloaded" | "down";
type Cls = "reads" | "writes";

/** Utilisation above which a component counts as running hot. */
export const HOT_UTILIZATION = 0.7;
const LATENCY_CAP = 0.95;

export interface NodeLoad {
  reads: number;
  writes: number;
  demand: number;
  /** Instances still running after injected failures. */
  instances: number;
  /** Load of the busiest instance relative to its capacity. */
  utilization: number;
  /** Share of the demand this component can serve. */
  served: number;
  /** Mean time spent here per request, including queueing. */
  latencyMs: number;
  status: NodeStatus;
}

export interface EdgeLoad {
  reads: number;
  writes: number;
  async: boolean;
  /** Closes a loop; the test does not send traffic along it. */
  ignored: boolean;
}

export interface Backlog {
  queueId: string;
  /** Null when the queue has no consumer at all. */
  consumerId: string | null;
  inflow: number;
  /** Messages per second added to the backlog. */
  growth: number;
}

export interface SimResult {
  nodes: Record<string, NodeLoad>;
  edges: Record<string, EdgeLoad>;
  clients: number;
  /** Share of requests answered successfully; null when there is no such traffic. */
  success: { reads: number | null; writes: number | null; overall: number | null };
  /** Mean latency of a served request in ms; null when none are served. */
  latency: { reads: number | null; writes: number | null };
  /** Traffic at which the busiest component reaches 100 %. */
  limit: { rps: number; bottleneck: string } | null;
  backlogs: Backlog[];
  ignoredEdges: string[];
}

export interface SimInput {
  nodes: BoardNode[];
  edges: BoardEdge[];
  traffic: Traffic;
  failures?: Failures;
}

interface Graph {
  comps: Map<string, BoardComponent>;
  out: Map<string, BoardEdge[]>;
  order: string[];
  ignored: Set<string>;
}

const isAsyncSource = (role: ComponentRole) => role === "queue" || role === "store";

/** Valid edges between components, loops broken by dropping the edge that closes each one. */
export function buildGraph(nodes: BoardNode[], edges: BoardEdge[]): Graph {
  const comps = new Map<string, BoardComponent>();
  for (const n of nodes) if (isComponent(n)) comps.set(n.id, n);
  const all = new Map<string, BoardEdge[]>();
  for (const id of comps.keys()) all.set(id, []);
  for (const e of edges) {
    if (e.source === e.target || !comps.has(e.source) || !comps.has(e.target)) continue;
    all.get(e.source)!.push(e);
  }

  // Depth-first search from clients first; an edge back to a node on the stack closes a loop.
  const state = new Map<string, 1 | 2>();
  const ignored = new Set<string>();
  const post: string[] = [];
  const visit = (id: string) => {
    state.set(id, 1);
    for (const e of all.get(id)!) {
      const s = state.get(e.target);
      if (s === 1) ignored.add(e.id);
      else if (s === undefined) visit(e.target);
    }
    state.set(id, 2);
    post.push(id);
  };
  const ids = [...comps.keys()];
  for (const id of ids) if (comps.get(id)!.kind === "client" && !state.has(id)) visit(id);
  for (const id of ids) if (!state.has(id)) visit(id);

  const out = new Map<string, BoardEdge[]>();
  for (const [id, list] of all)
    out.set(
      id,
      list.filter((e) => !ignored.has(e.id)),
    );
  return { comps, out, order: post.reverse(), ignored };
}

function instancesOf(c: BoardComponent, failure: FailureMode | undefined): number {
  if (isManaged(c.kind)) return failure === "down" ? 0 : 1;
  if (failure === "down") return 0;
  return Math.max(0, c.replicas - (failure === "instance" ? 1 : 0));
}

function utilizationOf(c: BoardComponent, reads: number, writes: number, instances: number): number {
  const demand = reads + writes;
  if (demand <= 0 || instances <= 0) return 0;
  if (c.capacity <= 0) return Number.POSITIVE_INFINITY;
  if (c.kind === "sql") {
    // Each shard has one primary taking every write plus its even share of the reads.
    const shards = c.shards ?? 1;
    return (writes / shards + reads / (shards * instances)) / c.capacity;
  }
  return demand / (isManaged(c.kind) ? c.capacity : c.capacity * instances);
}

const accepts = (e: BoardEdge, cls: Cls) => e.traffic === "all" || e.traffic === cls;
const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const product = (xs: number[]) => xs.reduce((a, b) => a * b, 1);
const sum = (xs: number[]) => xs.reduce((a, b) => a + b, 0);

export function simulate(input: SimInput): SimResult {
  const { traffic } = input;
  const failures = input.failures ?? {};
  const g = buildGraph(input.nodes, input.edges);
  const comp = (id: string) => g.comps.get(id)!;
  const role = (id: string) => roleOf(comp(id).kind);
  const instances = new Map<string, number>();
  for (const [id, c] of g.comps) instances.set(id, c.kind === "client" ? 1 : instancesOf(c, failures[id]));
  const down = (id: string) => instances.get(id) === 0;
  const hit = (id: string) => comp(id).hitRate ?? 0;
  const outs = (id: string) => g.out.get(id)!;

  // --- 1. Demand: push reads and writes through the graph in topological order.
  const reads = new Map<string, number>();
  const writes = new Map<string, number>();
  const edgeLoad: Record<string, EdgeLoad> = {};
  for (const [id, list] of g.out)
    for (const e of list)
      edgeLoad[e.id] = { reads: 0, writes: 0, async: isAsyncSource(role(id)), ignored: false };
  for (const e of input.edges)
    if (g.ignored.has(e.id)) edgeLoad[e.id] = { reads: 0, writes: 0, async: false, ignored: true };

  const clients = [...g.comps.values()].filter((c) => c.kind === "client");
  for (const c of clients) {
    reads.set(c.id, (traffic.rps * traffic.readRatio) / clients.length);
    writes.set(c.id, (traffic.rps * (1 - traffic.readRatio)) / clients.length);
  }
  const send = (e: BoardEdge, r: number, w: number) => {
    edgeLoad[e.id]!.reads += r;
    edgeLoad[e.id]!.writes += w;
    reads.set(e.target, (reads.get(e.target) ?? 0) + r);
    writes.set(e.target, (writes.get(e.target) ?? 0) + w);
  };
  /** Even split over healthy eligible targets. */
  const split = (list: BoardEdge[], cls: Cls, amount: number) => {
    const healthy = list.filter((e) => accepts(e, cls) && !down(e.target));
    for (const e of healthy)
      send(e, cls === "reads" ? amount / healthy.length : 0, cls === "writes" ? amount / healthy.length : 0);
  };
  /** Cache-aside hit rate seen by a service: healthy caches it reads from (down caches miss). */
  const cacheAside = (list: BoardEdge[]) => {
    const caches = list.filter((e) => accepts(e, "reads") && role(e.target) === "cache");
    return { caches, hit: caches.length ? mean(caches.map((e) => (down(e.target) ? 0 : hit(e.target)))) : 0 };
  };

  for (const id of g.order) {
    const r = reads.get(id) ?? 0;
    const w = writes.get(id) ?? 0;
    if (down(id) || r + w <= 0) continue;
    const list = outs(id);
    switch (role(id)) {
      case "source":
      case "balancer":
        split(list, "reads", r);
        split(list, "writes", w);
        break;
      case "edgeCache":
        split(list, "reads", r * (1 - hit(id)));
        split(list, "writes", w);
        break;
      case "compute": {
        const { caches, hit: h } = cacheAside(list);
        for (const e of list) {
          const shrink = caches.length && isDatabase(comp(e.target).kind) ? 1 - h : 1;
          send(e, accepts(e, "reads") ? r * shrink : 0, accepts(e, "writes") ? w : 0);
        }
        break;
      }
      case "cache":
        for (const e of list)
          send(e, accepts(e, "reads") ? r * (1 - hit(id)) : 0, accepts(e, "writes") ? w : 0);
        break;
      case "store":
        for (const e of list) send(e, 0, w);
        break;
      case "queue":
        for (const e of list) send(e, 0, r + w);
        break;
      case "external":
        break;
    }
  }

  // --- 2. Per-component utilisation, served share and latency.
  const nodes: Record<string, NodeLoad> = {};
  for (const [id, c] of g.comps) {
    const r = reads.get(id) ?? 0;
    const w = writes.get(id) ?? 0;
    const n = instances.get(id)!;
    const isClient = c.kind === "client";
    const utilization = isClient ? 0 : utilizationOf(c, r, w, n);
    const served = down(id) ? 0 : utilization <= 1 ? 1 : 1 / utilization;
    const status: NodeStatus = down(id)
      ? "down"
      : r + w <= 0
        ? "idle"
        : utilization > 1
          ? "overloaded"
          : utilization >= HOT_UTILIZATION
            ? "hot"
            : "ok";
    nodes[id] = {
      reads: r,
      writes: w,
      demand: r + w,
      instances: n,
      utilization,
      served,
      latencyMs: isClient ? 0 : c.latencyMs / (1 - Math.min(utilization, LATENCY_CAP)),
      status,
    };
  }

  // --- 3. Success and latency of a request arriving at a component (sync arrows only).
  const memo = new Map<string, { ok: number; ms: number }>();
  const evaluate = (id: string, cls: Cls): { ok: number; ms: number } => {
    const key = `${cls}:${id}`;
    const cached = memo.get(key);
    if (cached) return cached;
    const self = nodes[id]!;
    let res: { ok: number; ms: number };
    if (down(id)) res = { ok: 0, ms: 0 };
    else {
      const list = outs(id);
      const L = self.latencyMs;
      const s = self.served;
      const healthyAvg = () => {
        const healthy = list
          .filter((e) => accepts(e, cls) && !down(e.target))
          .map((e) => evaluate(e.target, cls));
        return healthy.length
          ? { ok: mean(healthy.map((x) => x.ok)), ms: mean(healthy.map((x) => x.ms)), any: true }
          : { ok: 0, ms: 0, any: false };
      };
      switch (role(id)) {
        case "source":
        case "balancer": {
          const h = healthyAvg();
          res = { ok: s * h.ok, ms: L + h.ms };
          break;
        }
        case "edgeCache": {
          const o = healthyAvg();
          const h = cls === "reads" ? hit(id) : 0;
          res = { ok: s * (h + (1 - h) * o.ok), ms: L + (1 - h) * o.ms };
          break;
        }
        case "cache": {
          const deps = list.filter((e) => accepts(e, cls)).map((e) => evaluate(e.target, cls));
          if (!deps.length) {
            res = { ok: s, ms: L };
            break;
          }
          const h = cls === "reads" ? hit(id) : 0;
          res = {
            ok: s * (h + (1 - h) * product(deps.map((d) => d.ok))),
            ms: L + (1 - h) * sum(deps.map((d) => d.ms)),
          };
          break;
        }
        case "compute": {
          const eligible = list.filter((e) => accepts(e, cls));
          if (cls === "writes") {
            // A failed cache invalidation does not fail the write.
            const deps = eligible
              .filter((e) => role(e.target) !== "cache")
              .map((e) => evaluate(e.target, cls));
            const caches = eligible
              .filter((e) => role(e.target) === "cache" && !down(e.target))
              .map((e) => evaluate(e.target, cls));
            res = {
              ok: s * product(deps.map((d) => d.ok)),
              ms: L + sum(deps.map((d) => d.ms)) + sum(caches.map((d) => d.ms)),
            };
            break;
          }
          const { caches } = cacheAside(list);
          if (!caches.length) {
            const deps = eligible.map((e) => evaluate(e.target, cls));
            res = { ok: s * product(deps.map((d) => d.ok)), ms: L + sum(deps.map((d) => d.ms)) };
            break;
          }
          // Cache-aside: a cache error counts as a miss and falls back to the database.
          const cacheRes = caches.map((e) => (down(e.target) ? null : evaluate(e.target, cls)));
          const served = mean(caches.map((e, i) => (cacheRes[i] ? hit(e.target) * cacheRes[i]!.ok : 0)));
          const latencyHit = mean(caches.map((e) => (down(e.target) ? 0 : hit(e.target))));
          const dbs = eligible
            .filter((e) => isDatabase(comp(e.target).kind))
            .map((e) => evaluate(e.target, cls));
          const others = eligible
            .filter((e) => role(e.target) !== "cache" && !isDatabase(comp(e.target).kind))
            .map((e) => evaluate(e.target, cls));
          res = {
            ok:
              s * (served + (1 - served) * product(dbs.map((d) => d.ok))) * product(others.map((d) => d.ok)),
            ms:
              L +
              mean(cacheRes.filter((x): x is { ok: number; ms: number } => x !== null).map((x) => x.ms)) +
              (1 - latencyHit) * sum(dbs.map((d) => d.ms)) +
              sum(others.map((d) => d.ms)),
          };
          break;
        }
        default:
          // Stores, queues and external APIs answer by themselves; their arrows out are asynchronous.
          res = { ok: s, ms: L };
      }
    }
    memo.set(key, res);
    return res;
  };

  const perClass = (cls: Cls, share: number) => {
    if (!clients.length || share <= 0) return { ok: null, ms: null };
    const results = clients.map((c) => evaluate(c.id, cls));
    const ok = mean(results.map((x) => x.ok));
    const servedResults = results.filter((x) => x.ok > 0);
    return { ok, ms: servedResults.length ? mean(servedResults.map((x) => x.ms)) : null };
  };
  const rd = perClass("reads", traffic.readRatio);
  const wr = perClass("writes", 1 - traffic.readRatio);
  const overall =
    rd.ok === null && wr.ok === null
      ? null
      : (rd.ok ?? 0) * (rd.ok === null ? 0 : traffic.readRatio) +
        (wr.ok ?? 0) * (wr.ok === null ? 0 : 1 - traffic.readRatio);

  // --- 4. Throughput limit: demand is linear in traffic, so the busiest component sets it.
  let worst: { id: string; u: number } | null = null;
  for (const [id, n] of Object.entries(nodes))
    if (n.status !== "down" && n.utilization > 0 && (!worst || n.utilization > worst.u))
      worst = { id, u: n.utilization };
  const limit =
    worst && traffic.rps > 0 && Number.isFinite(worst.u)
      ? { rps: traffic.rps / worst.u, bottleneck: worst.id }
      : worst && traffic.rps > 0
        ? { rps: 0, bottleneck: worst.id }
        : null;

  // --- 5. Queue backlogs.
  const backlogs: Backlog[] = [];
  for (const [id, c] of g.comps) {
    if (c.kind !== "queue" || down(id)) continue;
    const inflow = nodes[id]!.demand;
    if (inflow <= 0) continue;
    const list = outs(id);
    if (!list.length)
      backlogs.push({ queueId: id, consumerId: null, inflow, growth: inflow * nodes[id]!.served });
    for (const e of list)
      backlogs.push({
        queueId: id,
        consumerId: e.target,
        inflow,
        growth: inflow * nodes[id]!.served * (1 - nodes[e.target]!.served),
      });
  }

  return {
    nodes,
    edges: edgeLoad,
    clients: clients.length,
    success: { reads: rd.ok, writes: wr.ok, overall },
    latency: { reads: rd.ms, writes: wr.ms },
    limit,
    backlogs,
    ignoredEdges: [...g.ignored],
  };
}

// ---------------------------------------------------------------------------------------------

export type ResilienceVerdict = "spof" | "noHeadroom" | "backlog" | "ok";

export interface ResilienceRow {
  id: string;
  /** What was failed: one instance when there are several, otherwise the whole component. */
  scenario: FailureMode;
  /** Share of requests still served afterwards (null without client traffic). */
  success: number | null;
  /** Drop in served share compared with the current state. */
  drop: number;
  /** Components that become overloaded because of the failure. */
  overloads: string[];
  /** Extra queue backlog growth in messages per second. */
  backlogGrowth: number;
  verdict: ResilienceVerdict;
}

const VERDICT_ORDER: Record<ResilienceVerdict, number> = { spof: 0, noHeadroom: 1, backlog: 2, ok: 3 };
const totalBacklog = (r: SimResult) => sum(r.backlogs.map((b) => b.growth));

/**
 * Fails each self-run component in turn — one instance when it has several, the whole component
 * when it has one — and reports what breaks. Managed services and components already failed by
 * the user are skipped.
 */
export function analyzeResilience(input: SimInput, base: SimResult = simulate(input)): ResilienceRow[] {
  const failures = input.failures ?? {};
  const rows: ResilienceRow[] = [];
  for (const n of input.nodes) {
    if (!isComponent(n) || n.kind === "client" || isManaged(n.kind) || failures[n.id]) continue;
    if (!base.nodes[n.id] || base.nodes[n.id]!.demand <= 0) continue;
    const scenario: FailureMode = n.replicas >= 2 ? "instance" : "down";
    const after = simulate({ ...input, failures: { ...failures, [n.id]: scenario } });
    const drop = Math.max(0, (base.success.overall ?? 0) - (after.success.overall ?? 0));
    const overloads = Object.entries(after.nodes)
      .filter(([id, x]) => x.status === "overloaded" && base.nodes[id]?.status !== "overloaded")
      .map(([id]) => id);
    const backlogGrowth = Math.max(0, totalBacklog(after) - totalBacklog(base));
    const verdict: ResilienceVerdict =
      drop > 0.0005
        ? scenario === "down"
          ? "spof"
          : "noHeadroom"
        : backlogGrowth > 0.01
          ? "backlog"
          : overloads.length
            ? "noHeadroom"
            : "ok";
    rows.push({
      id: n.id,
      scenario,
      success: after.success.overall,
      drop,
      overloads,
      backlogGrowth,
      verdict,
    });
  }
  return rows.sort((a, b) => VERDICT_ORDER[a.verdict] - VERDICT_ORDER[b.verdict] || b.drop - a.drop);
}
