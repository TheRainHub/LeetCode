/** Generic starting points; they illustrate common patterns and are not answers to a question. */
import {
  type Board,
  type BoardComponent,
  type BoardEdge,
  DEFAULT_TRAFFIC,
  type EdgeTraffic,
  newComponent,
} from "./board";
import type { ComponentKind } from "./catalog";

export const TEMPLATE_KEYS = ["threeTier", "readHeavy", "asyncPipeline"] as const;
export type TemplateKey = (typeof TEMPLATE_KEYS)[number];

interface TemplateNode {
  key: string;
  kind: ComponentKind;
  /** Grid column and row; converted to board coordinates. */
  col: number;
  row: number;
  replicas?: number;
}
interface TemplateDef {
  nodes: TemplateNode[];
  edges: [from: string, to: string, traffic?: EdgeTraffic][];
}

const COL = 264;
const ROW = 136;
const TEMPLATES: Record<TemplateKey, TemplateDef> = {
  threeTier: {
    nodes: [
      { key: "client", kind: "client", col: 0, row: 0 },
      { key: "lb", kind: "loadBalancer", col: 1, row: 0 },
      { key: "api", kind: "service", col: 2, row: 0 },
      { key: "db", kind: "sql", col: 3, row: 0 },
    ],
    edges: [
      ["client", "lb"],
      ["lb", "api"],
      ["api", "db"],
    ],
  },
  readHeavy: {
    nodes: [
      { key: "client", kind: "client", col: 0, row: 0 },
      { key: "cdn", kind: "cdn", col: 1, row: 0 },
      { key: "lb", kind: "loadBalancer", col: 2, row: 0 },
      { key: "api", kind: "service", col: 2, row: 1, replicas: 4 },
      { key: "cache", kind: "cache", col: 3, row: 1 },
      { key: "db", kind: "sql", col: 2, row: 2, replicas: 3 },
    ],
    edges: [
      ["client", "cdn"],
      ["cdn", "lb"],
      ["lb", "api"],
      ["api", "cache"],
      ["api", "db"],
    ],
  },
  asyncPipeline: {
    nodes: [
      { key: "client", kind: "client", col: 0, row: 0 },
      { key: "lb", kind: "loadBalancer", col: 1, row: 0 },
      { key: "api", kind: "service", col: 2, row: 0 },
      { key: "db", kind: "sql", col: 3, row: 0 },
      { key: "queue", kind: "queue", col: 2, row: 1 },
      { key: "worker", kind: "worker", col: 3, row: 1 },
      { key: "blob", kind: "objectStorage", col: 3, row: 2 },
      { key: "ext", kind: "external", col: 2, row: 2 },
    ],
    edges: [
      ["client", "lb"],
      ["lb", "api"],
      ["api", "db"],
      ["api", "queue", "writes"],
      ["queue", "worker"],
      ["worker", "blob"],
      ["worker", "ext"],
    ],
  },
};

/** Sides an arrow leaves and enters by, from where the two components sit. */
export function sidesBetween(from: { x: number; y: number }, to: { x: number; y: number }) {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  if (Math.abs(dx) >= Math.abs(dy))
    return dx >= 0 ? { source: "r", target: "l" } : { source: "l", target: "r" };
  return dy >= 0 ? { source: "b", target: "t" } : { source: "t", target: "b" };
}

/** Builds a template board; `name` gives the (localised) default label for a kind. */
export function templateBoard(key: TemplateKey, name: (kind: ComponentKind) => string): Board {
  const t = TEMPLATES[key];
  const byKey = new Map<string, BoardComponent>();
  t.nodes.forEach((n, i) => {
    const c = newComponent(n.kind, `t${i + 1}`, { x: n.col * COL, y: n.row * ROW }, name(n.kind));
    byKey.set(n.key, n.replicas ? { ...c, replicas: n.replicas } : c);
  });
  const edges: BoardEdge[] = t.edges.map(([from, to, traffic]) => {
    const a = byKey.get(from)!;
    const b = byKey.get(to)!;
    const sides = sidesBetween(a, b);
    return {
      id: `e-${a.id}-${b.id}`,
      source: a.id,
      target: b.id,
      traffic: traffic ?? "all",
      sourceHandle: sides.source,
      targetHandle: sides.target,
    };
  });
  return { version: 1, nodes: [...byKey.values()], edges, traffic: { ...DEFAULT_TRAFFIC } };
}
