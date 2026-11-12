import { z } from "zod";
import { COMPONENT_KINDS, type ComponentKind, KIND_SPECS } from "./catalog";

/** A building block on the board. Numbers are per instance unless the kind is managed. */
export interface BoardComponent {
  id: string;
  kind: ComponentKind;
  x: number;
  y: number;
  label: string;
  replicas: number;
  capacity: number;
  latencyMs: number;
  hitRate?: number;
  shards?: number;
}

/** A free-text sticky note; ignored by the load test. */
export interface BoardNote {
  id: string;
  kind: "note";
  x: number;
  y: number;
  text: string;
}

export type BoardNode = BoardComponent | BoardNote;

/** Which requests travel along an arrow. */
export type EdgeTraffic = "all" | "reads" | "writes";
export const EDGE_TRAFFIC: EdgeTraffic[] = ["all", "reads", "writes"];

export interface BoardEdge {
  id: string;
  source: string;
  target: string;
  traffic: EdgeTraffic;
  sourceHandle?: string;
  targetHandle?: string;
}

export interface Traffic {
  /** Peak requests per second entering at the clients, shared equally between them. */
  rps: number;
  /** Share of those requests that are reads, 0..1. */
  readRatio: number;
}

export interface Board {
  version: 1;
  nodes: BoardNode[];
  edges: BoardEdge[];
  traffic: Traffic;
}

export const DEFAULT_TRAFFIC: Traffic = { rps: 1_000, readRatio: 0.9 };
export const MAX_NODES = 120;
export const MAX_EDGES = 300;

export const isComponent = (n: BoardNode): n is BoardComponent => n.kind !== "note";

export function emptyBoard(): Board {
  return { version: 1, nodes: [], edges: [], traffic: { ...DEFAULT_TRAFFIC } };
}

/** A component with the catalogue defaults for its kind. */
export function newComponent(
  kind: ComponentKind,
  id: string,
  position: { x: number; y: number },
  label: string,
): BoardComponent {
  const spec = KIND_SPECS[kind];
  return {
    id,
    kind,
    x: position.x,
    y: position.y,
    label,
    replicas: spec.replicas,
    capacity: spec.capacity,
    latencyMs: spec.latencyMs,
    ...(spec.hitRate !== undefined ? { hitRate: spec.hitRate } : {}),
    ...(spec.shards !== undefined ? { shards: spec.shards } : {}),
  };
}

/** Default traffic on a new arrow: producers publish events for writes; everything else carries all. */
export function defaultEdgeTraffic(targetKind: BoardNode["kind"] | undefined): EdgeTraffic {
  return targetKind === "queue" ? "writes" : "all";
}

// ---------------------------------------------------------------------------------------------
// Validation: boards come from the browser, so every field is checked on the server.

const nodeId = z.string().regex(/^[A-Za-z0-9_-]{1,40}$/, "Invalid node id");
const coord = z.number().min(-100_000).max(100_000);
const handle = z
  .string()
  .regex(/^[a-z]{1,10}$/)
  .optional();

const componentSchema = z.object({
  id: nodeId,
  kind: z.enum(COMPONENT_KINDS),
  x: coord,
  y: coord,
  label: z.string().trim().min(1).max(60),
  replicas: z.number().int().min(1).max(1000),
  capacity: z.number().min(0).max(1_000_000_000),
  latencyMs: z.number().min(0).max(60_000),
  hitRate: z.number().min(0).max(1).optional(),
  shards: z.number().int().min(1).max(1000).optional(),
});

const noteSchema = z.object({
  id: nodeId,
  kind: z.literal("note"),
  x: coord,
  y: coord,
  text: z.string().max(1000),
});

const edgeSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9_>:-]{1,100}$/, "Invalid edge id"),
  source: nodeId,
  target: nodeId,
  traffic: z.enum(["all", "reads", "writes"]),
  sourceHandle: handle,
  targetHandle: handle,
});

export const boardSchema = z
  .object({
    version: z.literal(1),
    nodes: z.array(z.union([componentSchema, noteSchema])).max(MAX_NODES),
    edges: z.array(edgeSchema).max(MAX_EDGES),
    traffic: z.object({
      rps: z.number().min(0).max(100_000_000),
      readRatio: z.number().min(0).max(1),
    }),
  })
  .superRefine((board, ctx) => {
    const kinds = new Map<string, BoardNode["kind"]>();
    for (const n of board.nodes) {
      if (kinds.has(n.id)) ctx.addIssue({ code: "custom", message: `Duplicate node id ${n.id}` });
      kinds.set(n.id, n.kind);
    }
    const pairs = new Set<string>();
    const edgeIds = new Set<string>();
    for (const e of board.edges) {
      const s = kinds.get(e.source);
      const t = kinds.get(e.target);
      if (!s || !t) ctx.addIssue({ code: "custom", message: `Edge ${e.id} points to a missing node` });
      else if (s === "note" || t === "note")
        ctx.addIssue({ code: "custom", message: "Notes cannot be connected" });
      if (e.source === e.target) ctx.addIssue({ code: "custom", message: "An arrow cannot loop to itself" });
      const pair = `${e.source}>${e.target}`;
      if (pairs.has(pair)) ctx.addIssue({ code: "custom", message: "Duplicate arrow" });
      if (edgeIds.has(e.id)) ctx.addIssue({ code: "custom", message: `Duplicate edge id ${e.id}` });
      pairs.add(pair);
      edgeIds.add(e.id);
    }
  });

/** Parses a stored or submitted board; returns null when it is not a valid board. */
export function parseBoard(value: unknown): Board | null {
  const parsed = boardSchema.safeParse(value);
  return parsed.success ? (parsed.data as Board) : null;
}

export function countComponents(board: Pick<Board, "nodes"> | null | undefined): number {
  return board ? board.nodes.filter(isComponent).length : 0;
}
