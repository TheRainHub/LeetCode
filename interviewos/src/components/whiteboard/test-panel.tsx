"use client";

import { AlertCircle, AlertTriangle, CheckCircle2, Eye, EyeOff, Info, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import type { Traffic } from "@/lib/whiteboard/board";
import type { ComponentKind } from "@/lib/whiteboard/catalog";
import type { Check } from "@/lib/whiteboard/checks";
import type {
  FailureMode,
  Failures,
  ResilienceRow,
  ResilienceVerdict,
  SimResult,
} from "@/lib/whiteboard/simulate";
import { cn } from "@/lib/utils";
import { fmtMs, fmtPct, fmtRate } from "./format";

const RPS_PRESETS = [100, 1_000, 10_000, 100_000];
const VERDICT_TONE: Record<ResilienceVerdict, "danger" | "warning" | "neutral" | "success"> = {
  spof: "danger",
  noHeadroom: "warning",
  backlog: "neutral",
  ok: "success",
};
const STATUS_TEXT = {
  idle: "",
  ok: "text-success",
  hot: "text-warning",
  overloaded: "text-danger",
  down: "text-danger",
};
const BAR = {
  idle: "bg-success",
  ok: "bg-success",
  hot: "bg-warning",
  overloaded: "bg-danger",
  down: "bg-danger",
};

function Section({ title, children, testId }: { title: string; children: React.ReactNode; testId?: string }) {
  return (
    <section className="border-border flex flex-col gap-2 border-t pt-3" data-testid={testId}>
      <h3 className="text-xs font-semibold">{title}</h3>
      {children}
    </section>
  );
}

/** Text state follows external changes (undo, presets) without remounting while the user types. */
function useSyncedText(value: string) {
  const [text, setText] = useState(value);
  const [prev, setPrev] = useState(value);
  if (value !== prev) {
    setPrev(value);
    setText(value);
  }
  return [text, setText] as const;
}

export function TrafficControls({
  traffic,
  onChange,
}: {
  traffic: Traffic;
  onChange: (t: Traffic, field: string) => void;
}) {
  const { m } = useI18n();
  const T = m.whiteboard.test;
  const [rpsText, setRpsText] = useSyncedText(String(traffic.rps));
  const [readText, setReadText] = useSyncedText(String(Math.round(traffic.readRatio * 100)));
  return (
    <div className="flex flex-col gap-2">
      <div className="grid grid-cols-[1fr_auto] items-end gap-2">
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">{T.rps}</span>
          <Input
            type="number"
            min={0}
            max={100_000_000}
            step={100}
            value={rpsText}
            data-testid="wb-rps"
            onChange={(e) => {
              setRpsText(e.target.value);
              const v = e.target.valueAsNumber;
              if (Number.isFinite(v) && v >= 0 && v <= 100_000_000) onChange({ ...traffic, rps: v }, "rps");
            }}
            onBlur={() => setRpsText(String(traffic.rps))}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-muted-foreground text-xs font-medium">{T.readShare}</span>
          <Input
            type="number"
            min={0}
            max={100}
            className="w-20"
            value={readText}
            data-testid="wb-read-share"
            onChange={(e) => {
              setReadText(e.target.value);
              const v = e.target.valueAsNumber;
              if (Number.isFinite(v) && v >= 0 && v <= 100)
                onChange({ ...traffic, readRatio: v / 100 }, "readRatio");
            }}
            onBlur={() => setReadText(String(Math.round(traffic.readRatio * 100)))}
          />
        </label>
      </div>
      <div className="flex items-center gap-1" role="group" aria-label={T.presets}>
        {RPS_PRESETS.map((p) => (
          <Button
            key={p}
            size="sm"
            variant={traffic.rps === p ? "primary" : "ghost"}
            className="h-6 px-2 text-[11px]"
            onClick={() => onChange({ ...traffic, rps: p }, "rps-preset")}
            data-testid={`wb-preset-${p}`}
          >
            {fmtRate(p)}
          </Button>
        ))}
      </div>
    </div>
  );
}

export function TestResults({
  result,
  resilience,
  failures,
  names,
  componentCount,
  clientIds,
  onFailure,
  onHeal,
  onFocus,
}: {
  clientIds: Set<string>;
  result: SimResult;
  resilience: ResilienceRow[];
  failures: Failures;
  names: Map<string, string>;
  componentCount: number;
  onFailure: (id: string, mode: FailureMode | null) => void;
  onHeal: () => void;
  onFocus: (id: string) => void;
}) {
  const { m } = useI18n();
  const T = m.whiteboard.test;
  const [showOk, setShowOk] = useState(false);
  const name = (id: string) => names.get(id) ?? id;
  const nodeButton = (id: string) => (
    <button
      type="button"
      className="hover:text-primary truncate text-left font-medium"
      onClick={() => onFocus(id)}
    >
      {name(id)}
    </button>
  );

  if (!componentCount) return <p className="text-muted-foreground text-xs">{T.noComponents}</p>;
  if (!result.clients)
    return (
      <p className="text-muted-foreground text-xs" data-testid="wb-no-clients">
        {T.noClients}
      </p>
    );

  const pct = (x: number | null) => (x === null ? T.none : fmtPct(x));
  const overallTone =
    result.success.overall === null
      ? ""
      : result.success.overall >= 0.999
        ? "text-success"
        : result.success.overall >= 0.95
          ? "text-warning"
          : "text-danger";
  const busiest = Object.entries(result.nodes)
    .filter(([, n]) => n.demand > 0 || n.status === "down")
    .filter(([id]) => names.has(id) && !clientIds.has(id))
    .sort(
      (a, b) =>
        (b[1].status === "down" ? 1 : 0) - (a[1].status === "down" ? 1 : 0) ||
        b[1].utilization - a[1].utilization,
    )
    .slice(0, 6);
  const problems = resilience.filter((r) => r.verdict !== "ok");
  const fine = resilience.filter((r) => r.verdict === "ok");
  const injected = Object.entries(failures).filter(([id]) => names.has(id));

  return (
    <div className="flex flex-col gap-3" data-testid="wb-results">
      <div className="grid grid-cols-2 gap-2">
        <div className="bg-surface-2 rounded-md p-2">
          <p className="text-muted-foreground text-[11px]">{T.served}</p>
          <p className={cn("text-lg font-semibold tabular-nums", overallTone)} data-testid="wb-served">
            {pct(result.success.overall)}
          </p>
          <p className="text-subtle-foreground text-[10px] tabular-nums">
            {T.reads} {pct(result.success.reads)} · {T.writes} {pct(result.success.writes)}
          </p>
        </div>
        <div className="bg-surface-2 rounded-md p-2" title={T.latencyHelp}>
          <p className="text-muted-foreground text-[11px]">{T.latency}</p>
          <p className="text-lg font-semibold tabular-nums" data-testid="wb-latency">
            {result.latency.reads !== null
              ? fmtMs(result.latency.reads)
              : result.latency.writes !== null
                ? fmtMs(result.latency.writes)
                : T.none}
          </p>
          <p className="text-subtle-foreground text-[10px] tabular-nums">
            {T.reads} {result.latency.reads !== null ? fmtMs(result.latency.reads) : T.none} · {T.writes}{" "}
            {result.latency.writes !== null ? fmtMs(result.latency.writes) : T.none}
          </p>
        </div>
      </div>
      {result.limit ? (
        <p className="text-xs" data-testid="wb-limit">
          {result.limit.rps > 0
            ? T.limit(fmtRate(result.limit.rps), name(result.limit.bottleneck))
            : T.limitZero(name(result.limit.bottleneck))}
        </p>
      ) : null}

      <Section title={T.busiest} testId="wb-busiest">
        {busiest.length ? (
          <ul className="flex flex-col gap-1.5">
            {busiest.map(([id, n]) => (
              <li key={id} className="grid grid-cols-[minmax(0,1fr)_64px_48px] items-center gap-2 text-xs">
                {nodeButton(id)}
                <span className="bg-surface-3 h-1.5 overflow-hidden rounded-full">
                  <span
                    className={cn("block h-full rounded-full", BAR[n.status])}
                    style={{ width: `${Math.min(100, n.utilization * 100)}%` }}
                  />
                </span>
                <span className={cn("text-right tabular-nums", STATUS_TEXT[n.status])}>
                  {n.status === "down" ? T.status.down : fmtPct(n.utilization)}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">{T.allIdle}</p>
        )}
      </Section>

      {result.backlogs.length ? (
        <Section title={T.queues} testId="wb-queues">
          <ul className="flex flex-col gap-1 text-xs">
            {result.backlogs.map((b) => (
              <li
                key={`${b.queueId}:${b.consumerId}`}
                className={b.growth > 0.01 ? "text-warning" : "text-muted-foreground"}
              >
                {b.consumerId === null
                  ? T.noConsumer(name(b.queueId), fmtRate(b.growth))
                  : b.growth > 0.01
                    ? T.backlog(name(b.queueId), name(b.consumerId), fmtRate(b.growth))
                    : T.keepsUp(name(b.queueId), name(b.consumerId))}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      <Section title={T.resilience} testId="wb-resilience">
        <p className="text-subtle-foreground text-[11px]">{T.resilienceHelp}</p>
        {resilience.length ? (
          <ul className="flex flex-col gap-2">
            {[...problems, ...(showOk ? fine : [])].map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-0.5 text-xs"
                data-testid="wb-resilience-row"
                data-verdict={r.verdict}
                data-id={r.id}
              >
                <div className="flex items-center gap-2">
                  {nodeButton(r.id)}
                  <Badge tone={VERDICT_TONE[r.verdict]} className="ml-auto">
                    {T.verdicts[r.verdict]}
                  </Badge>
                </div>
                <div className="text-muted-foreground flex items-center gap-2 text-[11px]">
                  <span className="min-w-0 flex-1">
                    {T.scenario[r.scenario]}
                    {r.success !== null ? ` · ${T.servedAfter(fmtPct(r.success))}` : ""}
                    {r.overloads.length ? ` · ${T.overloads(r.overloads.map(name).join(", "))}` : ""}
                  </span>
                  <button
                    type="button"
                    className="text-primary shrink-0 hover:underline"
                    onClick={() => onFailure(r.id, r.scenario)}
                    data-testid="wb-inject"
                  >
                    {T.inject}
                  </button>
                </div>
              </li>
            ))}
            {fine.length ? (
              <li>
                <button
                  type="button"
                  className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-[11px]"
                  onClick={() => setShowOk((s) => !s)}
                >
                  <CheckCircle2 className="text-success size-3.5" aria-hidden />
                  {T.verdicts.ok}: {fine.length}
                  {showOk ? (
                    <EyeOff className="size-3" aria-hidden />
                  ) : (
                    <Eye className="size-3" aria-hidden />
                  )}
                </button>
              </li>
            ) : null}
          </ul>
        ) : (
          <p className="text-muted-foreground text-xs">{T.resilienceEmpty}</p>
        )}
      </Section>

      {injected.length ? (
        <Section title={T.injected} testId="wb-injected">
          <ul className="flex flex-col gap-1 text-xs">
            {injected.map(([id, mode]) => (
              <li key={id} className="flex items-center gap-2">
                <XCircle className="text-danger size-3.5 shrink-0" aria-hidden />
                {nodeButton(id)}
                <span className="text-muted-foreground">
                  {mode === "down"
                    ? m.whiteboard.inspector.failures.down
                    : m.whiteboard.inspector.failures.instance}
                </span>
              </li>
            ))}
          </ul>
          <Button size="sm" variant="ghost" className="self-start" onClick={onHeal} data-testid="wb-heal">
            {T.heal}
          </Button>
        </Section>
      ) : null}
    </div>
  );
}

const LEVEL_ICON = { error: AlertCircle, warning: AlertTriangle, info: Info } as const;
const LEVEL_TONE = { error: "text-danger", warning: "text-warning", info: "text-muted-foreground" } as const;

export function ChecksList({
  checks,
  names,
  onFocus,
}: {
  checks: Check[];
  names: Map<string, string>;
  onFocus: (id: string) => void;
}) {
  const { m } = useI18n();
  const C = m.whiteboard.checks;
  return (
    <Section title={`${C.title}${checks.length ? ` (${checks.length})` : ""}`} testId="wb-checks">
      {checks.length ? (
        <ul className="flex flex-col gap-2">
          {checks.map((c, i) => {
            const Icon = LEVEL_ICON[c.level];
            const text = C.messages[c.code](c.nodes.map((id) => names.get(id) ?? id));
            return (
              <li
                key={`${c.code}-${i}`}
                className="flex gap-2 text-xs"
                data-testid="wb-check"
                data-code={c.code}
              >
                <Icon
                  className={cn("mt-0.5 size-3.5 shrink-0", LEVEL_TONE[c.level])}
                  aria-label={C.levels[c.level]}
                />
                {c.nodes[0] ? (
                  <button
                    type="button"
                    className="hover:text-primary text-left"
                    onClick={() => onFocus(c.nodes[0]!)}
                  >
                    {text}
                  </button>
                ) : (
                  <span>{text}</span>
                )}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="text-muted-foreground inline-flex items-center gap-1.5 text-xs">
          <CheckCircle2 className="text-success size-3.5" aria-hidden />
          {C.none}
        </p>
      )}
    </Section>
  );
}

export function ExpectedBlocks({
  blocks,
  reference,
}: {
  blocks: { kinds: ComponentKind[]; met: boolean }[];
  reference: string[];
}) {
  const { m } = useI18n();
  const W = m.whiteboard;
  const B = W.blocks;
  const [open, setOpen] = useState(false);
  const met = blocks.filter((b) => b.met).length;
  return (
    <Section title={B.title} testId="wb-blocks">
      <div className="flex items-center justify-between gap-2">
        <p className="text-subtle-foreground text-[11px]">{open ? B.met(met, blocks.length) : B.help}</p>
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)} data-testid="wb-blocks-toggle">
          {open ? <EyeOff /> : <Eye />}
          {open ? B.hide : B.reveal}
        </Button>
      </div>
      {open ? (
        <>
          <ul className="flex flex-col gap-1 text-xs">
            {blocks.map((b) => (
              <li
                key={b.kinds.join("|")}
                className="flex items-center gap-1.5"
                data-testid="wb-block"
                data-met={b.met}
              >
                {b.met ? (
                  <CheckCircle2 className="text-success size-3.5 shrink-0" aria-hidden />
                ) : (
                  <XCircle className="text-subtle-foreground size-3.5 shrink-0" aria-hidden />
                )}
                <span className={b.met ? "" : "text-muted-foreground"}>
                  {b.kinds.map((k) => W.kinds[k]).join(` ${B.or} `)}
                </span>
              </li>
            ))}
          </ul>
          {reference.length ? (
            <div>
              <p className="text-muted-foreground mb-1 text-[11px] font-medium">{B.reference}</p>
              <ul className="text-muted-foreground flex list-disc flex-col gap-0.5 pl-4 text-[11px]">
                {reference.map((r) => (
                  <li key={r}>{r}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      ) : null}
    </Section>
  );
}
