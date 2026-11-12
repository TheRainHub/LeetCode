/** Static design checks: common mistakes an interviewer would point at, independent of traffic. */
import { type BoardComponent, type BoardEdge, type BoardNode, isComponent, type Traffic } from "./board";
import { type ComponentKind, roleOf } from "./catalog";
import { buildGraph } from "./simulate";

export type CheckLevel = "error" | "warning" | "info";
export type CheckCode =
  | "noClient"
  | "clientNoEdges"
  | "edgeIntoClient"
  | "clientToData"
  | "loop"
  | "unreachable"
  | "balancerNoTargets"
  | "cdnNoOrigin"
  | "queueNoConsumer"
  | "cacheNoStore"
  | "noReadPath"
  | "noWritePath"
  | "multiInstanceNoLb"
  | "syncExternal"
  | "replicaLag"
  | "storeOutgoing"
  | "externalOutgoing";

export interface Check {
  code: CheckCode;
  level: CheckLevel;
  /** Components involved, in the order the message names them. */
  nodes: string[];
  edges: string[];
}

const LEVEL_ORDER: Record<CheckLevel, number> = { error: 0, warning: 1, info: 2 };
const DATA_KINDS: ComponentKind[] = ["sql", "nosql", "cache", "search"];
const REQUEST_PATH_KINDS: ComponentKind[] = ["service", "realtime", "apiGateway", "loadBalancer"];

export function checkBoard(nodes: BoardNode[], edges: BoardEdge[], traffic: Traffic): Check[] {
  const comps = nodes.filter(isComponent);
  if (!comps.length) return [];
  const byId = new Map<string, BoardComponent>(comps.map((c) => [c.id, c]));
  const valid = edges.filter((e) => byId.has(e.source) && byId.has(e.target) && e.source !== e.target);
  const outOf = (id: string) => valid.filter((e) => e.source === id);
  const into = (id: string) => valid.filter((e) => e.target === id);
  const kind = (id: string) => byId.get(id)!.kind;
  const checks: Check[] = [];
  const add = (code: CheckCode, level: CheckLevel, ns: string[], es: string[] = []) =>
    checks.push({ code, level, nodes: ns, edges: es });

  const clients = comps.filter((c) => c.kind === "client");
  if (!clients.length) add("noClient", "error", []);

  for (const c of clients) {
    const out = outOf(c.id);
    if (!out.length) {
      add("clientNoEdges", "error", [c.id]);
      continue;
    }
    if (traffic.readRatio > 0 && !out.some((e) => e.traffic !== "writes"))
      add("noReadPath", "warning", [c.id]);
    if (traffic.readRatio < 1 && !out.some((e) => e.traffic !== "reads"))
      add("noWritePath", "warning", [c.id]);
    for (const e of out) {
      const t = byId.get(e.target)!;
      if (DATA_KINDS.includes(t.kind)) add("clientToData", "error", [c.id, t.id], [e.id]);
      else if (roleOf(t.kind) === "compute" && t.replicas >= 2)
        add("multiInstanceNoLb", "info", [c.id, t.id], [e.id]);
    }
  }

  for (const e of valid)
    if (kind(e.target) === "client") add("edgeIntoClient", "error", [e.source, e.target], [e.id]);

  for (const id of buildGraph(nodes, edges).ignored) {
    const e = valid.find((x) => x.id === id);
    if (e) add("loop", "warning", [e.source, e.target], [e.id]);
  }

  if (clients.length) {
    const seen = new Set<string>(clients.map((c) => c.id));
    const stack = clients.map((c) => c.id);
    while (stack.length) {
      const id = stack.pop()!;
      for (const e of outOf(id))
        if (!seen.has(e.target)) {
          seen.add(e.target);
          stack.push(e.target);
        }
    }
    const orphans = comps.filter((c) => !seen.has(c.id)).map((c) => c.id);
    if (orphans.length) add("unreachable", "warning", orphans);
  }

  for (const c of comps) {
    const role = roleOf(c.kind);
    const out = outOf(c.id);
    if (role === "balancer" && !out.length) add("balancerNoTargets", "error", [c.id]);
    if (c.kind === "cdn" && !out.length) add("cdnNoOrigin", "warning", [c.id]);
    if (c.kind === "queue" && !out.length) add("queueNoConsumer", "warning", [c.id]);
    if (c.kind === "sql" && c.replicas >= 2) add("replicaLag", "info", [c.id]);
    if (role === "store" && out.length)
      add(
        "storeOutgoing",
        "info",
        [c.id],
        out.map((e) => e.id),
      );
    if (role === "external" && out.length)
      add(
        "externalOutgoing",
        "info",
        [c.id],
        out.map((e) => e.id),
      );
    if (c.kind === "cache" && !out.length) {
      const callers = into(c.id).map((e) => e.source);
      const backed = callers.some((s) =>
        outOf(s).some((e) => kind(e.target) === "sql" || kind(e.target) === "nosql"),
      );
      if (callers.length && !backed) add("cacheNoStore", "warning", [c.id]);
    }
  }

  for (const e of valid)
    if (REQUEST_PATH_KINDS.includes(kind(e.source)) && kind(e.target) === "external")
      add("syncExternal", "info", [e.source, e.target], [e.id]);

  return checks.sort((a, b) => LEVEL_ORDER[a.level] - LEVEL_ORDER[b.level]);
}

/** Which expected building blocks (alternatives per group) appear on the board. */
export function checkBlocks(nodes: BoardNode[], groups: ComponentKind[][]) {
  const present = new Set(nodes.filter(isComponent).map((c) => c.kind));
  return groups.map((kinds) => ({ kinds, met: kinds.some((k) => present.has(k)) }));
}
