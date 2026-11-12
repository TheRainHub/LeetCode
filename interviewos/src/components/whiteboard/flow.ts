import type { Edge, Node } from "@xyflow/react";
import { createContext } from "react";
import {
  type Board,
  type BoardComponent,
  type BoardEdge,
  type BoardNode,
  type EdgeTraffic,
  type Traffic,
} from "@/lib/whiteboard/board";
import type { Failures, ResilienceVerdict, SimResult } from "@/lib/whiteboard/simulate";

export type ComponentData = Omit<BoardComponent, "id" | "x" | "y">;
export type NoteData = { text: string };
export type ComponentFlowNode = Node<ComponentData, "component">;
export type NoteFlowNode = Node<NoteData, "note">;
export type FlowNode = ComponentFlowNode | NoteFlowNode;
export type FlowEdge = Edge<{ traffic: EdgeTraffic }, "load">;

export const HANDLES = ["t", "r", "b", "l"] as const;
export const NODE_WIDTH = 176;
export const NODE_HEIGHT = 58;

export function toFlowNodes(nodes: BoardNode[]): FlowNode[] {
  return nodes.map((n): FlowNode => {
    if (n.kind === "note")
      return { id: n.id, type: "note", position: { x: n.x, y: n.y }, data: { text: n.text } };
    const { id, x, y, ...data } = n;
    return { id, type: "component", position: { x, y }, data };
  });
}

export function toFlowEdges(edges: BoardEdge[]): FlowEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    sourceHandle: e.sourceHandle ?? "r",
    targetHandle: e.targetHandle ?? "l",
    type: "load",
    data: { traffic: e.traffic },
  }));
}

const round = (v: number) => Math.round(v * 10) / 10;
const handle = (h: string | null | undefined) =>
  h && (HANDLES as readonly string[]).includes(h) ? h : undefined;

export function toBoardNodes(nodes: FlowNode[]): BoardNode[] {
  return nodes.map((n): BoardNode => {
    const x = round(n.position.x);
    const y = round(n.position.y);
    if (n.type === "note") return { id: n.id, kind: "note", x, y, text: n.data.text };
    return { id: n.id, x, y, ...(n.data as ComponentData) };
  });
}

export function toBoardEdges(edges: FlowEdge[]): BoardEdge[] {
  return edges.map((e) => ({
    id: e.id,
    source: e.source,
    target: e.target,
    traffic: e.data?.traffic ?? "all",
    ...(handle(e.sourceHandle) ? { sourceHandle: handle(e.sourceHandle) } : {}),
    ...(handle(e.targetHandle) ? { targetHandle: handle(e.targetHandle) } : {}),
  }));
}

export function toBoard(nodes: FlowNode[], edges: FlowEdge[], traffic: Traffic): Board {
  return { version: 1, nodes: toBoardNodes(nodes), edges: toBoardEdges(edges), traffic };
}

/** What custom nodes and edges need from the live load test. */
export interface SimView {
  result: SimResult | null;
  showLoad: boolean;
  failures: Failures;
  verdicts: Record<string, ResilienceVerdict>;
}

export const SimContext = createContext<SimView>({
  result: null,
  showLoad: false,
  failures: {},
  verdicts: {},
});

export function newId(prefix: string): string {
  const rand =
    typeof crypto !== "undefined" && "randomUUID" in crypto
      ? crypto.randomUUID().replace(/-/g, "").slice(0, 10)
      : Math.random().toString(36).slice(2, 12);
  return `${prefix}${rand}`;
}
