"use client";

import {
  BaseEdge,
  EdgeLabelRenderer,
  type EdgeProps,
  getBezierPath,
  Handle,
  type NodeProps,
  Position,
  useReactFlow,
} from "@xyflow/react";
import { memo, useContext } from "react";
import { useI18n } from "@/lib/i18n/client";
import { isManaged } from "@/lib/whiteboard/catalog";
import { cn } from "@/lib/utils";
import { type ComponentFlowNode, type FlowEdge, type NoteFlowNode, SimContext } from "./flow";
import { fmtPct, fmtRate } from "./format";
import { KindIcon } from "./kind-icon";

const SIDES = [
  { id: "t", position: Position.Top },
  { id: "r", position: Position.Right },
  { id: "b", position: Position.Bottom },
  { id: "l", position: Position.Left },
] as const;

/** Every side can start or end an arrow; the arrow points from where the drag started. */
function Handles() {
  return (
    <>
      {SIDES.map((s) => (
        <Handle key={s.id} id={s.id} type="source" position={s.position} className="wb-handle" />
      ))}
    </>
  );
}

const STATUS_BORDER = {
  idle: "border-border-strong",
  ok: "border-border-strong",
  hot: "border-warning",
  overloaded: "border-danger",
  down: "border-danger border-dashed",
} as const;

const BAR = {
  idle: "bg-success",
  ok: "bg-success",
  hot: "bg-warning",
  overloaded: "bg-danger",
  down: "bg-danger",
} as const;

export const ComponentNode = memo(function ComponentNode({
  id,
  data,
  selected,
}: NodeProps<ComponentFlowNode>) {
  const { m } = useI18n();
  const W = m.whiteboard;
  const sim = useContext(SimContext);
  const load = sim.result?.nodes[id];
  const status = load?.status ?? "idle";
  const managed = isManaged(data.kind);
  const isClient = data.kind === "client";
  const showLoad = sim.showLoad && load !== undefined;
  const verdict = sim.verdicts[id];
  const failure = sim.failures[id];
  return (
    <div
      data-testid="wb-node"
      data-id={id}
      data-kind={data.kind}
      data-status={status}
      className={cn(
        "wb-node bg-surface text-foreground relative w-44 rounded-lg border px-2.5 py-2 shadow-sm",
        showLoad ? STATUS_BORDER[status] : failure === "down" ? STATUS_BORDER.down : "border-border-strong",
        failure === "down" && "opacity-70",
        selected && "ring-primary/70 ring-2",
      )}
      title={W.kindHelp[data.kind]}
    >
      <Handles />
      <div className="flex items-center gap-2">
        <KindIcon kind={data.kind} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[13px] leading-tight font-medium" data-testid="wb-node-label">
            {data.label}
          </p>
          {data.label !== W.kinds[data.kind] ? (
            <p className="text-muted-foreground truncate text-[11px]">{W.kinds[data.kind]}</p>
          ) : null}
        </div>
        {!managed && !isClient ? (
          <span className="text-muted-foreground text-[11px] tabular-nums" data-testid="wb-node-replicas">
            ×{data.replicas}
            {data.kind === "sql" && (data.shards ?? 1) > 1 ? ` ·${data.shards}` : ""}
          </span>
        ) : null}
      </div>
      {showLoad && isClient ? (
        <p className="text-muted-foreground mt-1 text-[10px] tabular-nums">{fmtRate(load.demand)}/s →</p>
      ) : null}
      {showLoad && !isClient ? (
        <div className="mt-1.5" data-testid="wb-node-load">
          <div className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
            <div
              className={cn("h-full rounded-full", BAR[status])}
              style={{ width: `${Math.min(100, load.utilization * 100)}%` }}
            />
          </div>
          <div className="text-muted-foreground mt-1 flex justify-between gap-1 text-[10px] tabular-nums">
            <span
              className={cn(status === "overloaded" || status === "down" ? "text-danger font-medium" : "")}
            >
              {status === "down"
                ? W.test.status.down
                : status === "idle"
                  ? W.test.status.idle
                  : fmtPct(load.utilization)}
            </span>
            <span>{load.demand > 0 ? `${fmtRate(load.demand)}/s` : ""}</span>
          </div>
        </div>
      ) : null}
      {(showLoad && verdict === "spof") || failure ? (
        <div className="absolute -top-2 right-2 flex gap-1">
          {failure ? (
            <span className="bg-danger text-primary-foreground rounded px-1 text-[9px] font-semibold uppercase">
              {failure === "down" ? W.test.status.down : "−1"}
            </span>
          ) : null}
          {showLoad && verdict === "spof" ? (
            <span
              className="bg-warning text-primary-foreground rounded px-1 text-[9px] font-semibold"
              title={W.test.verdicts.spof}
              data-testid="wb-node-spof"
            >
              SPOF
            </span>
          ) : null}
        </div>
      ) : null}
    </div>
  );
});

export const NoteNode = memo(function NoteNode({ id, data, selected }: NodeProps<NoteFlowNode>) {
  const { m } = useI18n();
  const { updateNodeData } = useReactFlow();
  return (
    <div
      data-testid="wb-note"
      className={cn(
        "border-warning/40 bg-warning-soft w-48 rounded-md border p-1.5 shadow-sm",
        selected && "ring-primary/70 ring-2",
      )}
    >
      <textarea
        className="nodrag nowheel text-foreground placeholder:text-subtle-foreground block min-h-16 w-full resize-y bg-transparent text-xs leading-snug outline-none"
        value={data.text}
        maxLength={1000}
        placeholder={m.whiteboard.palette.note}
        aria-label={m.whiteboard.inspector.noteTitle}
        onChange={(e) => updateNodeData(id, { text: e.target.value })}
      />
    </div>
  );
});

export const LoadEdge = memo(function LoadEdge({
  id,
  sourceX,
  sourceY,
  targetX,
  targetY,
  sourcePosition,
  targetPosition,
  data,
  selected,
}: EdgeProps<FlowEdge>) {
  const sim = useContext(SimContext);
  const [path, labelX, labelY] = getBezierPath({
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
  });
  const load = sim.result?.edges[id];
  const rate = load ? load.reads + load.writes : 0;
  const traffic = data?.traffic ?? "all";
  const showRate = sim.showLoad && rate > 0;
  const tag = traffic === "reads" ? "R" : traffic === "writes" ? "W" : "";
  const color = load?.ignored ? "var(--danger)" : selected ? "var(--primary)" : "var(--muted-foreground)";
  const marker = load?.ignored ? "wb-arrow-danger" : selected ? "wb-arrow-selected" : "wb-arrow";
  return (
    <>
      <BaseEdge
        id={id}
        path={path}
        markerEnd={`url(#${marker})`}
        className={cn(load?.async && "wb-edge-async")}
        style={{
          stroke: color,
          strokeWidth: showRate ? 1.25 + Math.min(3, Math.log10(rate + 1) * 0.7) : 1.5,
          strokeDasharray: load?.async || load?.ignored ? "6 4" : undefined,
        }}
      />
      {showRate || tag ? (
        <EdgeLabelRenderer>
          <div
            className={cn(
              "nodrag nopan bg-surface text-muted-foreground pointer-events-auto absolute rounded border px-1 py-px text-[10px] tabular-nums",
              selected ? "border-primary text-primary" : "border-border",
            )}
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            data-testid="wb-edge-label"
            data-edge={id}
          >
            {tag ? <span className="font-semibold">{tag}</span> : null}
            {tag && showRate ? " " : null}
            {showRate ? `${fmtRate(rate)}/s` : null}
          </div>
        </EdgeLabelRenderer>
      ) : null}
    </>
  );
});

/** Arrowheads referenced by the edges; colours come from theme tokens. */
export function ArrowMarkers() {
  const marker = (id: string, fill: string) => (
    <marker
      id={id}
      viewBox="0 0 10 10"
      refX="9"
      refY="5"
      markerWidth="11"
      markerHeight="11"
      markerUnits="userSpaceOnUse"
      orient="auto-start-reverse"
    >
      <path d="M0,0 L10,5 L0,10 z" style={{ fill }} />
    </marker>
  );
  return (
    <svg width="0" height="0" className="absolute" aria-hidden>
      <defs>
        {marker("wb-arrow", "var(--muted-foreground)")}
        {marker("wb-arrow-selected", "var(--primary)")}
        {marker("wb-arrow-danger", "var(--danger)")}
      </defs>
    </svg>
  );
}
