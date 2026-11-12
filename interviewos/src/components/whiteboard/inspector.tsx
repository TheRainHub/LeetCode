"use client";

import { Copy, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { EDGE_TRAFFIC, type EdgeTraffic } from "@/lib/whiteboard/board";
import { hasHitRate, isManaged, roleOf } from "@/lib/whiteboard/catalog";
import type { FailureMode } from "@/lib/whiteboard/simulate";
import type { ComponentData, ComponentFlowNode, FlowEdge, FlowNode } from "./flow";
import { KindIcon } from "./kind-icon";

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));

/** Number input that commits only valid values; remounted (via key) when the board changes underneath. */
function NumberInput({
  id,
  value,
  min,
  max,
  step = 1,
  integer,
  onCommit,
  testId,
}: {
  id: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  integer?: boolean;
  onCommit: (v: number) => void;
  testId?: string;
}) {
  return (
    <Input
      id={id}
      type="number"
      inputMode="decimal"
      min={min}
      max={max}
      step={step}
      defaultValue={value}
      data-testid={testId}
      onChange={(e) => {
        const raw = e.target.valueAsNumber;
        if (!Number.isFinite(raw)) return;
        onCommit(clamp(integer ? Math.round(raw) : raw, min, max));
      }}
    />
  );
}

export function Inspector({
  node,
  edge,
  nodes,
  failure,
  onChangeNode,
  onChangeEdge,
  onFailure,
  onDuplicate,
  onDelete,
}: {
  node: FlowNode | null;
  edge: FlowEdge | null;
  nodes: FlowNode[];
  failure: FailureMode | undefined;
  onChangeNode: (id: string, patch: Partial<ComponentData>, field: string) => void;
  onChangeEdge: (id: string, traffic: EdgeTraffic) => void;
  onFailure: (id: string, mode: FailureMode | null) => void;
  onDuplicate: (id: string) => void;
  onDelete: () => void;
}) {
  const { m } = useI18n();
  const W = m.whiteboard;
  const I = W.inspector;

  if (edge) {
    const source = nodes.find((n) => n.id === edge.source);
    const target = nodes.find((n) => n.id === edge.target);
    const name = (n: FlowNode | undefined) => (n?.type === "component" ? n.data.label : "?");
    const sourceRole = source?.type === "component" ? roleOf(source.data.kind) : null;
    return (
      <section className="flex flex-col gap-3" data-testid="wb-inspector" aria-label={I.edgeTitle}>
        <div>
          <p className="text-muted-foreground text-xs font-medium">{I.edgeTitle}</p>
          <p className="text-sm font-medium">{I.from(name(source), name(target))}</p>
        </div>
        {sourceRole === "queue" ? (
          <p className="text-muted-foreground text-xs">{I.asyncQueue}</p>
        ) : sourceRole === "store" ? (
          <p className="text-muted-foreground text-xs">{I.asyncStore}</p>
        ) : sourceRole === "external" ? (
          <p className="text-muted-foreground text-xs">{I.ignoredExternal}</p>
        ) : (
          <Field label={I.carries} htmlFor="wb-edge-traffic">
            <Select
              id="wb-edge-traffic"
              value={edge.data?.traffic ?? "all"}
              onChange={(e) => onChangeEdge(edge.id, e.target.value as EdgeTraffic)}
              data-testid="wb-edge-traffic"
            >
              {EDGE_TRAFFIC.map((t) => (
                <option key={t} value={t}>
                  {I.traffic[t]}
                </option>
              ))}
            </Select>
          </Field>
        )}
        <Button size="sm" variant="ghost" onClick={onDelete} className="self-start">
          <Trash2 />
          {I.remove}
        </Button>
      </section>
    );
  }

  if (!node) return null;
  if (node.type === "note")
    return (
      <section className="flex flex-col gap-2" data-testid="wb-inspector" aria-label={I.noteTitle}>
        <p className="text-muted-foreground text-xs font-medium">{I.noteTitle}</p>
        <Button size="sm" variant="ghost" onClick={onDelete} className="self-start">
          <Trash2 />
          {I.remove}
        </Button>
      </section>
    );

  const c = (node as ComponentFlowNode).data;
  const managed = isManaged(c.kind);
  const isClient = c.kind === "client";
  const fid = (f: string) => `wb-${node.id}-${f}`;
  const set = (field: keyof ComponentData) => (v: number) => onChangeNode(node.id, { [field]: v }, field);
  return (
    <section className="flex flex-col gap-3" data-testid="wb-inspector" aria-label={I.title}>
      <div className="flex items-center gap-2">
        <KindIcon kind={c.kind} />
        <div className="min-w-0">
          <p className="text-muted-foreground text-xs font-medium">{W.kinds[c.kind]}</p>
          <p className="text-subtle-foreground text-[11px] leading-snug">{W.kindHelp[c.kind]}</p>
        </div>
      </div>
      <Field label={I.name} htmlFor={fid("label")}>
        <Input
          id={fid("label")}
          defaultValue={c.label}
          maxLength={60}
          data-testid="wb-field-label"
          onChange={(e) => {
            const v = e.target.value.trim();
            if (v) onChangeNode(node.id, { label: v }, "label");
          }}
        />
      </Field>
      {!isClient ? (
        <div className="grid grid-cols-2 gap-2">
          {!managed ? (
            <Field
              label={c.kind === "sql" ? I.replicasSql : I.replicas}
              htmlFor={fid("replicas")}
              className="col-span-2"
              hint={I.replicasHelp}
            >
              <NumberInput
                id={fid("replicas")}
                value={c.replicas}
                min={1}
                max={1000}
                integer
                onCommit={set("replicas")}
                testId="wb-field-replicas"
              />
            </Field>
          ) : null}
          <Field
            label={managed ? I.capacityManaged : I.capacity}
            htmlFor={fid("capacity")}
            className="col-span-2"
          >
            <NumberInput
              id={fid("capacity")}
              value={c.capacity}
              min={0}
              max={1_000_000_000}
              step={100}
              onCommit={set("capacity")}
              testId="wb-field-capacity"
            />
          </Field>
          <Field label={I.latency} htmlFor={fid("latency")}>
            <NumberInput
              id={fid("latency")}
              value={c.latencyMs}
              min={0}
              max={60_000}
              onCommit={set("latencyMs")}
            />
          </Field>
          {hasHitRate(c.kind) ? (
            <Field label={I.hitRate} htmlFor={fid("hit")}>
              <NumberInput
                id={fid("hit")}
                value={Math.round((c.hitRate ?? 0) * 100)}
                min={0}
                max={100}
                onCommit={(v) => onChangeNode(node.id, { hitRate: v / 100 }, "hitRate")}
                testId="wb-field-hit"
              />
            </Field>
          ) : null}
          {c.kind === "sql" ? (
            <Field label={I.shards} htmlFor={fid("shards")}>
              <NumberInput
                id={fid("shards")}
                value={c.shards ?? 1}
                min={1}
                max={1000}
                integer
                onCommit={set("shards")}
              />
            </Field>
          ) : null}
        </div>
      ) : null}
      {managed && !isClient ? <p className="text-subtle-foreground text-[11px]">{I.managed}</p> : null}
      {!isClient ? (
        <Field label={I.failure} htmlFor={fid("failure")}>
          <Select
            id={fid("failure")}
            value={failure ?? "none"}
            onChange={(e) =>
              onFailure(node.id, e.target.value === "none" ? null : (e.target.value as FailureMode))
            }
            data-testid="wb-field-failure"
          >
            <option value="none">{I.failures.none}</option>
            {!managed && c.replicas >= 2 ? <option value="instance">{I.failures.instance}</option> : null}
            <option value="down">{I.failures.down}</option>
          </Select>
        </Field>
      ) : null}
      <div className="flex flex-wrap gap-1">
        <Button size="sm" variant="ghost" onClick={() => onDuplicate(node.id)}>
          <Copy />
          {I.duplicate}
        </Button>
        <Button size="sm" variant="ghost" onClick={onDelete} data-testid="wb-delete">
          <Trash2 />
          {I.remove}
        </Button>
      </div>
      <p className="text-subtle-foreground text-[11px]">{I.defaultsNote}</p>
    </section>
  );
}
