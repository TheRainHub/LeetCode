"use client";

import { ExternalLink, FileText, Loader2, Search, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { JOB_LEVELS, type SearchCriteria, WORK_MODES } from "@/lib/jobs/model";

type Line = { kind: "search" | "fetch" | "results" | "writing"; text: string };

export function JobFinder({
  initial,
  enabled,
  disabledReason,
}: {
  initial: SearchCriteria;
  enabled: boolean;
  disabledReason: string | null;
}) {
  const { m } = useI18n();
  const F = m.jobs.find;
  const router = useRouter();
  const [c, setC] = useState<SearchCriteria>(initial);
  const [running, setRunning] = useState(false);
  const [lines, setLines] = useState<Line[]>([]);
  const [error, setError] = useState<string | null>(null);
  const toggle = <T extends string>(list: T[], item: T) =>
    list.includes(item) ? list.filter((x) => x !== item) : [...list, item];

  const run = async (e: React.FormEvent) => {
    e.preventDefault();
    setRunning(true);
    setLines([]);
    setError(null);
    try {
      const res = await fetch("/api/jobs/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(c),
      });
      if (!res.ok || !res.body) {
        const body = (await res.json().catch(() => null)) as { error?: string } | null;
        throw new Error(body?.error ?? `HTTP ${res.status}`);
      }
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
          const ev = JSON.parse(raw) as
            | { type: "search"; query: string }
            | { type: "fetch"; url: string }
            | { type: "results"; count: number }
            | { type: "writing" }
            | { type: "done"; searchId: number }
            | { type: "error"; message: string };
          if (ev.type === "search")
            setLines((l) => [...l, { kind: "search", text: F.progress.search(ev.query) }]);
          if (ev.type === "fetch") setLines((l) => [...l, { kind: "fetch", text: F.progress.fetch(ev.url) }]);
          if (ev.type === "results")
            setLines((l) => [...l, { kind: "results", text: F.progress.results(ev.count) }]);
          if (ev.type === "writing")
            setLines((l) =>
              l.at(-1)?.kind === "writing" ? l : [...l, { kind: "writing", text: F.progress.writing }],
            );
          if (ev.type === "error") setError(ev.message);
          if (ev.type === "done") {
            router.push(`/jobs/find?search=${ev.searchId}`);
            router.refresh();
          }
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setRunning(false);
    }
  };

  return (
    <form onSubmit={run} className="flex flex-col gap-3" data-testid="job-finder">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={F.roles} htmlFor="jf-roles">
          <Input
            id="jf-roles"
            maxLength={300}
            placeholder={F.rolesPlaceholder}
            value={c.roles}
            onChange={(e) => setC({ ...c, roles: e.target.value })}
          />
        </Field>
        <Field label={F.locations} htmlFor="jf-locations">
          <Input
            id="jf-locations"
            maxLength={300}
            placeholder={F.locationsPlaceholder}
            value={c.locations}
            onChange={(e) => setC({ ...c, locations: e.target.value })}
          />
        </Field>
        <fieldset>
          <legend className="text-muted-foreground mb-1.5 text-xs font-medium">{F.modes}</legend>
          <div className="flex flex-wrap gap-3">
            {WORK_MODES.map((w) => (
              <label key={w} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={c.workModes.includes(w)}
                  onChange={() => setC({ ...c, workModes: toggle(c.workModes, w) })}
                />
                {m.jobs.workMode[w]}
              </label>
            ))}
          </div>
        </fieldset>
        <fieldset>
          <legend className="text-muted-foreground mb-1.5 text-xs font-medium">{F.levels}</legend>
          <div className="flex flex-wrap gap-3">
            {JOB_LEVELS.map((l) => (
              <label key={l} className="flex items-center gap-1.5 text-sm">
                <Checkbox
                  checked={c.levels.includes(l)}
                  onChange={() => setC({ ...c, levels: toggle(c.levels, l) })}
                />
                {m.jobs.level[l]}
              </label>
            ))}
          </div>
        </fieldset>
      </div>
      <Field label={F.focus} htmlFor="jf-focus">
        <Textarea
          id="jf-focus"
          rows={2}
          maxLength={1000}
          placeholder={F.focusPlaceholder}
          value={c.focus}
          onChange={(e) => setC({ ...c, focus: e.target.value })}
        />
      </Field>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          type="submit"
          variant="primary"
          size="sm"
          disabled={!enabled || running}
          data-testid="job-finder-run"
        >
          {running ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {running ? F.running : F.run}
        </Button>
        <span className="text-subtle-foreground text-[11px]">{disabledReason ?? F.takesTime}</span>
      </div>
      {lines.length || running ? (
        <ol
          className="border-border bg-surface-2 flex max-h-56 flex-col gap-1 overflow-y-auto rounded-md border p-2 text-xs"
          aria-live="polite"
          data-testid="job-finder-progress"
        >
          {lines.map((l, i) => (
            <li key={i} className="text-muted-foreground flex items-start gap-1.5">
              {l.kind === "search" ? (
                <Search className="mt-0.5 size-3 shrink-0" aria-hidden />
              ) : l.kind === "fetch" ? (
                <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
              ) : (
                <FileText className="mt-0.5 size-3 shrink-0" aria-hidden />
              )}
              <span className="min-w-0 break-words">{l.text}</span>
            </li>
          ))}
          {running ? <li className="text-subtle-foreground">…</li> : null}
        </ol>
      ) : null}
      {error ? (
        <p className="text-danger text-xs" role="alert" data-testid="job-finder-error">
          {F.failed(error)}
        </p>
      ) : null}
    </form>
  );
}
