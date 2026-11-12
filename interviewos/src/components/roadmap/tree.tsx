import Link from "next/link";
import type { TopicStatus } from "@/lib/mastery/status";
import type { LayoutOptions } from "@/lib/roadmap/layout";
import { cn } from "@/lib/utils";

export interface TreeNode {
  id: string;
  x: number;
  y: number;
  href: string;
  title: string;
  status: TopicStatus;
  next?: boolean;
  /** Small text under the title (module, minutes, progress …). */
  meta?: string;
  /** 0..1 progress bar (overview nodes). */
  progress?: number;
  tooltip?: string;
}

export interface TreeEdge {
  from: string;
  to: string;
  /** The prerequisite is at least practised. */
  active: boolean;
  /** Waypoints between cards for edges that span several layers. */
  via?: { x: number; y1: number; y2: number }[];
}

const NODE_STYLE: Record<TopicStatus, string> = {
  not_started: "border-border bg-surface",
  learning: "border-border-strong bg-surface-2",
  practicing: "border-primary/60 bg-primary-soft",
  needs_review: "border-warning/60 bg-warning-soft",
  interview_ready: "border-success/60 bg-success-soft",
};

const DOT_STYLE: Record<TopicStatus, string> = {
  not_started: "bg-subtle-foreground",
  learning: "bg-muted-foreground",
  practicing: "bg-primary",
  needs_review: "bg-warning",
  interview_ready: "bg-success",
};

export function StatusDot({ status }: { status: TopicStatus }) {
  return <span className={cn("inline-block size-2 shrink-0 rounded-full", DOT_STYLE[status])} aria-hidden />;
}

/** Positioned roadmap nodes over an SVG of curved prerequisite edges. Server-rendered, no JS. */
export function RoadmapTree({
  nodes,
  edges,
  width,
  height,
  layout,
  statusLabel,
  nextLabel,
  label,
}: {
  nodes: TreeNode[];
  edges: TreeEdge[];
  width: number;
  height: number;
  layout: LayoutOptions;
  statusLabel: Record<TopicStatus, string>;
  nextLabel: string;
  label: string;
}) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const pad = 16;
  return (
    <div className="border-border bg-surface overflow-auto rounded-lg border" data-testid="roadmap-tree">
      <div
        className="relative mx-auto"
        style={{ width: width + pad * 2, height: height + pad * 2 }}
        role="list"
        aria-label={label}
      >
        <svg width={width + pad * 2} height={height + pad * 2} className="absolute inset-0" aria-hidden>
          <defs>
            <marker
              id="rm-arrow"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="var(--border-strong)" />
            </marker>
            <marker
              id="rm-arrow-active"
              viewBox="0 0 8 8"
              refX="7"
              refY="4"
              markerWidth="7"
              markerHeight="7"
              orient="auto"
            >
              <path d="M0,0 L8,4 L0,8 z" fill="var(--primary)" />
            </marker>
          </defs>
          {edges.map((e) => {
            const a = byId.get(e.from);
            const b = byId.get(e.to);
            if (!a || !b) return null;
            let cx = a.x + pad + layout.nodeWidth / 2;
            let cy = a.y + pad + layout.nodeHeight;
            let d = `M${cx},${cy}`;
            const curveTo = (x: number, y: number) => {
              const bend = Math.max(16, (y - cy) / 2);
              d += ` C${cx},${cy + bend} ${x},${y - bend} ${x},${y}`;
              cx = x;
              cy = y;
            };
            for (const w of e.via ?? []) {
              curveTo(w.x + pad, w.y1 + pad);
              d += ` L${w.x + pad},${w.y2 + pad}`;
              cy = w.y2 + pad;
            }
            curveTo(b.x + pad + layout.nodeWidth / 2, b.y + pad - 2);
            return (
              <path
                key={`${e.from}->${e.to}`}
                d={d}
                fill="none"
                stroke={e.active ? "var(--primary)" : "var(--border-strong)"}
                strokeWidth={e.active ? 2 : 1.5}
                markerEnd={`url(#${e.active ? "rm-arrow-active" : "rm-arrow"})`}
                data-edge={`${e.from}->${e.to}`}
              />
            );
          })}
        </svg>
        {nodes.map((n) => (
          <Link
            key={n.id}
            href={n.href}
            role="listitem"
            title={n.tooltip}
            data-testid="roadmap-node"
            data-id={n.id}
            data-status={n.status}
            data-next={n.next ? "true" : undefined}
            className={cn(
              "hover:border-primary absolute flex flex-col justify-between rounded-lg border px-2.5 py-1.5 transition-colors",
              NODE_STYLE[n.status],
              n.next && "ring-primary ring-2 ring-offset-1 ring-offset-[var(--surface)]",
            )}
            style={{ left: n.x + pad, top: n.y + pad, width: layout.nodeWidth, height: layout.nodeHeight }}
          >
            <span className="line-clamp-2 text-xs leading-snug font-medium">{n.title}</span>
            {n.progress !== undefined ? (
              <span className="bg-surface-3 block h-1 w-full overflow-hidden rounded-full">
                <span
                  className="bg-primary block h-full rounded-full"
                  style={{ width: `${Math.round(n.progress * 100)}%` }}
                />
              </span>
            ) : null}
            <span className="text-muted-foreground flex items-center gap-1.5 text-[10px]">
              <StatusDot status={n.status} />
              <span className="truncate">{n.next ? nextLabel : (n.meta ?? statusLabel[n.status])}</span>
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
