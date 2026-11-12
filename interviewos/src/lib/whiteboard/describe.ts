import { type Board, isComponent } from "./board";
import { type ComponentKind, isManaged } from "./catalog";

/** English kind names for the plain-text description sent to the AI reviewer. */
const KIND_NAMES: Record<ComponentKind, string> = {
  client: "client",
  dns: "DNS",
  cdn: "CDN",
  loadBalancer: "load balancer",
  apiGateway: "API gateway",
  service: "service",
  realtime: "WebSocket/real-time gateway",
  worker: "worker",
  cache: "cache",
  sql: "SQL database",
  nosql: "NoSQL database",
  queue: "message queue",
  objectStorage: "object storage",
  search: "search index",
  external: "external API",
};

const clean = (s: string) => s.replace(/\s+/g, " ").trim();

/**
 * The diagram as plain text: components, arrows (request direction) and notes.
 * Labels and notes are user text; the caller wraps the result as material to review.
 */
export function describeBoard(board: Board): string {
  const comps = board.nodes.filter(isComponent);
  if (!comps.length) return "";
  const label = new Map(comps.map((c) => [c.id, clean(c.label)]));
  const lines: string[] = ["Components:"];
  for (const c of comps) {
    const details: string[] = [KIND_NAMES[c.kind]];
    if (!isManaged(c.kind) && c.kind !== "client") {
      details.push(
        c.kind === "sql"
          ? `${c.replicas === 1 ? "primary only" : `primary + ${c.replicas - 1} read replica(s)`}${(c.shards ?? 1) > 1 ? `, ${c.shards} shards` : ""}`
          : `${c.replicas} instance(s)`,
      );
    }
    if (c.hitRate !== undefined) details.push(`hit rate ${Math.round(c.hitRate * 100)}%`);
    lines.push(`- ${label.get(c.id)} (${details.join(", ")})`);
  }
  const arrows = board.edges.filter((e) => label.has(e.source) && label.has(e.target));
  if (arrows.length) {
    lines.push("", "Arrows (direction of requests or messages):");
    for (const e of arrows)
      lines.push(
        `- ${label.get(e.source)} → ${label.get(e.target)}${e.traffic === "all" ? "" : ` (${e.traffic} only)`}`,
      );
  }
  const notes = board.nodes
    .filter((n) => n.kind === "note" && clean(n.text))
    .map((n) => (n.kind === "note" ? clean(n.text) : ""));
  if (notes.length) {
    lines.push("", "Notes on the board:");
    for (const n of notes) lines.push(`- ${n}`);
  }
  return lines.join("\n");
}
