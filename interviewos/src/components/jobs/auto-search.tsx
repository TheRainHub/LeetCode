"use client";

import { Loader2, Play, Repeat, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  createAutoSearchAction,
  deleteAutoSearchAction,
  markSearchViewedAction,
  updateAutoSearchAction,
} from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { useI18n } from "@/lib/i18n/client";
import { AUTO_INTERVALS, type AutoInterval, type SearchCriteria } from "@/lib/jobs/model";

/** Saves the criteria currently in the job finder as an automatic search. */
export function SaveAutoSearch({
  criteria,
  disabled,
  atLimit,
  limit,
}: {
  criteria: SearchCriteria;
  disabled: boolean;
  atLimit: boolean;
  limit: number;
}) {
  const { m } = useI18n();
  const A = m.jobs.auto;
  const router = useRouter();
  const [name, setName] = useState("");
  const [interval, setInterval] = useState<AutoInterval>(7);
  const [pending, start] = useTransition();
  const save = () =>
    start(async () => {
      const res = await createAutoSearchAction({
        name: name.trim() || criteria.roles || A.title,
        criteria,
        intervalDays: interval,
      });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      toast.success(A.saved);
      setName("");
      router.refresh();
      // The first run is due immediately; let the runner on this page start it.
      window.dispatchEvent(new Event("jobs:auto-due"));
    });
  return (
    <div className="border-border flex flex-col gap-2 border-t pt-3" data-testid="auto-save">
      <p className="text-xs font-medium">{A.saveTitle}</p>
      <div className="grid gap-2 sm:grid-cols-[minmax(0,1fr)_160px_auto] sm:items-end">
        <Field label={A.name} htmlFor="auto-name">
          <Input
            id="auto-name"
            maxLength={80}
            placeholder={A.namePlaceholder}
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
        </Field>
        <Field label={A.interval} htmlFor="auto-interval">
          <Select
            id="auto-interval"
            value={interval}
            onChange={(e) => setInterval(Number(e.target.value) as AutoInterval)}
          >
            {AUTO_INTERVALS.map((n) => (
              <option key={n} value={n}>
                {A.intervals[n]}
              </option>
            ))}
          </Select>
        </Field>
        <Button
          type="button"
          size="md"
          variant="secondary"
          disabled={disabled || atLimit || pending}
          onClick={save}
          data-testid="auto-save-button"
        >
          <Repeat />
          {A.save}
        </Button>
      </div>
      {atLimit ? <p className="text-subtle-foreground text-[11px]">{A.limit(limit)}</p> : null}
    </div>
  );
}

export interface AutoSearchItem {
  id: number;
  name: string;
  summary: string;
  intervalDays: number;
  enabled: boolean;
  nextLabel: string;
  lastLabel: string | null;
  lastError: string | null;
}

export function AutoSearchList({ items }: { items: AutoSearchItem[] }) {
  const { m } = useI18n();
  const A = m.jobs.auto;
  const router = useRouter();
  const [pending, start] = useTransition();
  const update = (input: Parameters<typeof updateAutoSearchAction>[0], after?: () => void) =>
    start(async () => {
      const res = await updateAutoSearchAction(input);
      if (!res.ok) toast.error(res.error);
      router.refresh();
      after?.();
    });

  if (!items.length) return <p className="text-muted-foreground text-xs">{A.empty}</p>;
  return (
    <ul className="flex flex-col gap-3" data-testid="auto-list">
      {items.map((a) => (
        <li key={a.id} className="flex flex-col gap-1.5 text-xs" data-testid="auto-item" data-id={a.id}>
          <div className="flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-sm font-medium">{a.name}</p>
            <Switch
              checked={a.enabled}
              disabled={pending}
              aria-label={A.on}
              onCheckedChange={(enabled) => update({ id: a.id, enabled })}
            />
          </div>
          {a.summary ? <p className="text-muted-foreground truncate">{a.summary}</p> : null}
          <div className="flex items-center gap-2">
            <Select
              className="h-7 w-36 text-xs"
              value={a.intervalDays}
              disabled={pending}
              aria-label={A.interval}
              onChange={(e) => update({ id: a.id, intervalDays: Number(e.target.value) })}
            >
              {AUTO_INTERVALS.map((n) => (
                <option key={n} value={n}>
                  {A.intervals[n]}
                </option>
              ))}
            </Select>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={pending}
              title={A.runNow}
              aria-label={A.runNow}
              data-testid="auto-run-now"
              onClick={() =>
                update({ id: a.id, runNow: true }, () => window.dispatchEvent(new Event("jobs:auto-due")))
              }
            >
              <Play />
            </Button>
            <Button
              size="icon-sm"
              variant="ghost"
              disabled={pending}
              title={A.remove}
              aria-label={A.remove}
              onClick={() => {
                if (!window.confirm(A.removeConfirm)) return;
                start(async () => {
                  const res = await deleteAutoSearchAction({ id: a.id });
                  if (!res.ok) toast.error(res.error);
                  router.refresh();
                });
              }}
            >
              <Trash2 />
            </Button>
          </div>
          <p className="text-subtle-foreground">
            {a.enabled ? a.nextLabel : null}
            {a.enabled && a.lastLabel ? " · " : null}
            {a.lastLabel ?? (a.enabled ? "" : A.never)}
          </p>
          {a.lastError ? <p className="text-danger">{A.lastError(a.lastError)}</p> : null}
        </li>
      ))}
    </ul>
  );
}

type RunEvent =
  | { type: "search"; query: string }
  | { type: "fetch"; url: string }
  | { type: "results"; count: number }
  | { type: "writing" }
  | {
      type: "result";
      status: "idle" | "done" | "failed";
      searchId?: number;
      name?: string;
      newCount?: number;
      error?: string;
    };

/**
 * When an automatic search is due, runs it while the page is open (catch-up for times the
 * scheduler did not run, e.g. locally) and shows its progress. "Run now" triggers it as well.
 */
export function AutoSearchRunner({ due }: { due: boolean }) {
  const { m } = useI18n();
  const A = m.jobs.auto;
  const F = m.jobs.find;
  const router = useRouter();
  const [state, setState] = useState<
    | { kind: "idle" }
    | { kind: "running"; line: string | null }
    | { kind: "done"; text: string; searchId: number | null; failed: boolean }
  >({ kind: "idle" });
  const running = useRef(false);

  useEffect(() => {
    const run = async () => {
      if (running.current) return;
      running.current = true;
      setState({ kind: "running", line: null });
      try {
        const res = await fetch("/api/jobs/auto/run", { method: "POST" });
        if (!res.ok || !res.body) throw new Error(`HTTP ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          let nl: number;
          while ((nl = buffer.indexOf("\n")) >= 0) {
            const raw = buffer.slice(0, nl).trim();
            buffer = buffer.slice(nl + 1);
            if (!raw) continue;
            const ev = JSON.parse(raw) as RunEvent;
            if (ev.type === "search") setState({ kind: "running", line: F.progress.search(ev.query) });
            if (ev.type === "fetch") setState({ kind: "running", line: F.progress.fetch(ev.url) });
            if (ev.type === "writing") setState({ kind: "running", line: F.progress.writing });
            if (ev.type === "result") {
              if (ev.status === "idle") setState({ kind: "idle" });
              else
                setState({
                  kind: "done",
                  failed: ev.status === "failed",
                  searchId: ev.searchId ?? null,
                  text:
                    ev.status === "failed"
                      ? A.failed(ev.name ?? "", ev.error ?? "")
                      : A.finished(ev.name ?? "", ev.newCount ?? 0),
                });
              router.refresh();
            }
          }
        }
      } catch {
        setState({ kind: "idle" });
      } finally {
        running.current = false;
      }
    };
    const timer = due ? window.setTimeout(run, 0) : null;
    const onDue = () => void run();
    window.addEventListener("jobs:auto-due", onDue);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("jobs:auto-due", onDue);
    };
    // The runner starts once per page load; "Run now" triggers it through the event.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (state.kind === "idle") return null;
  return (
    <div
      className="border-primary/30 bg-primary-soft mb-4 flex flex-wrap items-center gap-2 rounded-md border px-3 py-2 text-xs"
      role="status"
      data-testid="auto-runner"
      data-state={state.kind}
    >
      {state.kind === "running" ? (
        <>
          <Loader2 className="text-primary size-3.5 animate-spin" aria-hidden />
          <span className="font-medium">{A.running}</span>
          {state.line ? <span className="text-muted-foreground min-w-0 truncate">{state.line}</span> : null}
        </>
      ) : (
        <>
          <Repeat className={state.failed ? "text-danger size-3.5" : "text-primary size-3.5"} aria-hidden />
          <span className="flex-1">{state.text}</span>
          {state.searchId ? (
            <Link
              href={`/jobs/find?search=${state.searchId}`}
              className="text-primary font-medium hover:underline"
            >
              {A.view}
            </Link>
          ) : null}
        </>
      )}
    </div>
  );
}

/** Marks an automatic run as seen once its results are on screen. */
export function MarkViewed({ id }: { id: number }) {
  useEffect(() => {
    void markSearchViewedAction({ id });
  }, [id]);
  return null;
}
