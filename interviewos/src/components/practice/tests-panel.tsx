"use client";

import { Check, Clipboard, Download, FlaskConical, Loader2, Play, Plus, Terminal, Trash2, TriangleAlert, X } from "lucide-react";
import { useMemo, useState, useTransition } from "react";
import { toast } from "sonner";
import { addCustomTestAction, deleteCustomTestAction } from "@/app/practice/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input, Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { generateHarness, HARNESS_COMMANDS, HARNESS_FILENAMES, parseHarnessOutput } from "@/lib/code-runner/harness";
import type { TestOutcome } from "@/lib/code-runner/types";
import type { Comparator, Language, ProblemSignature, ProblemTest } from "@/lib/content/types";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export type Execution =
  | { mode: "none" }
  | { mode: "browser"; results: TestOutcome[]; logs: string[]; compileError?: string; message?: string; code: string; language: Language }
  | { mode: "local"; output: string; testNames: string[]; results: TestOutcome[]; code: string; language: Language };

export interface CustomTest {
  id: number;
  name: string;
  args: unknown[];
  expected: unknown;
}

function short(value: unknown) {
  const s = JSON.stringify(value);
  return s.length > 120 ? `${s.slice(0, 117)}…` : s;
}

export function TestsPanel({
  problemId,
  signature,
  comparator,
  tests,
  customTests,
  language,
  code,
  execution,
  running,
  onRun,
  onLocalResults,
  tab,
  onTabChange,
}: {
  problemId: number;
  signature: ProblemSignature;
  comparator: Comparator;
  tests: ProblemTest[];
  customTests: CustomTest[];
  language: Language;
  code: string;
  execution: Execution;
  running: boolean;
  onRun: () => void;
  onLocalResults: (e: Extract<Execution, { mode: "local" }>) => void;
  tab: string;
  onTabChange: (t: string) => void;
}) {
  const { m } = useI18n();
  const w = m.practice.ws;
  const allTests: ProblemTest[] = useMemo(
    () => [...tests, ...customTests.map((c) => ({ name: `custom: ${c.name}`, args: c.args, expected: c.expected }))],
    [tests, customTests],
  );
  const stale = execution.mode !== "none" && (execution.code !== code || execution.language !== language);

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-border px-3 py-1.5">
        <TabsList>
          <TabsTrigger value="tests">
            <FlaskConical />
            {w.tests}
          </TabsTrigger>
          <TabsTrigger value="results">
            {w.results}
            {execution.mode !== "none" && execution.results.length > 0 ? (
              <Badge tone={execution.results.every((r) => r.passed) ? "success" : "danger"}>
                {execution.results.filter((r) => r.passed).length}/{execution.results.length}
              </Badge>
            ) : null}
          </TabsTrigger>
          <TabsTrigger value="local">
            <Terminal />
            {w.runLocally}
          </TabsTrigger>
        </TabsList>
        {language === "typescript" ? (
          <Button size="sm" variant="primary" onClick={onRun} disabled={running} data-testid="run-tests">
            {running ? <Loader2 className="animate-spin" /> : <Play />}
            {running ? w.running : w.run}
          </Button>
        ) : (
          <Button size="sm" onClick={() => onTabChange("local")}>
            <Terminal />
            {w.runLocally}
          </Button>
        )}
      </div>

      <TabsContent value="tests" className="min-h-0 flex-1 overflow-y-auto p-3">
        <ul className="flex flex-col gap-1.5">
          {tests.map((t) => (
            <li key={t.name} className="rounded-md border border-border bg-surface px-3 py-2 font-mono text-xs">
              <span className="font-sans text-[11px] text-muted-foreground">{t.name}</span>
              <div className="mt-1 break-all text-foreground">{signature.params.map((p, i) => `${p.name} = ${short(t.args[i])}`).join(", ")}</div>
              <div className="text-subtle-foreground">→ {short(t.expected)}</div>
            </li>
          ))}
        </ul>
        <CustomTests problemId={problemId} signature={signature} customTests={customTests} />
      </TabsContent>

      <TabsContent value="results" className="min-h-0 flex-1 overflow-y-auto p-3" data-testid="results-panel">
        {stale ? (
          <p className="mb-2 flex items-center gap-1.5 rounded-md bg-warning-soft px-2.5 py-1.5 text-xs text-warning">
            <TriangleAlert className="size-3.5" />
            {w.staleRun}
          </p>
        ) : null}
        {execution.mode === "none" ? (
          <div className="flex flex-col gap-2 text-xs text-muted-foreground">
            <Badge tone="outline" className="self-start">{m.common.labels.notExecuted}</Badge>
            <p>{w.notExecutedYet}</p>
            {language !== "typescript" ? <p>{w.onlyTsInBrowser}</p> : null}
          </div>
        ) : (
          <div className="flex flex-col gap-2">
            <p className="text-[11px] text-muted-foreground">
              {execution.mode === "browser" ? w.runInBrowserNote : w.local.parsed}
            </p>
            {execution.mode === "browser" && execution.compileError ? (
              <div className="rounded-md border border-danger/40 bg-danger-soft p-2.5 font-mono text-xs text-danger">
                <p className="mb-1 font-sans font-medium">{w.compileError}</p>
                {execution.compileError}
              </div>
            ) : null}
            {execution.mode === "browser" && execution.message ? <p className="text-xs text-warning">{execution.message}</p> : null}
            {execution.results.length > 0 ? (
              <p className="text-sm font-medium">{w.passedOf(execution.results.filter((r) => r.passed).length, execution.results.length)}</p>
            ) : null}
            <ul className="flex flex-col gap-1.5">
              {execution.results.map((r) => (
                <li
                  key={r.name}
                  className={cn("rounded-md border px-3 py-2 text-xs", r.passed ? "border-success/30 bg-success-soft/40" : "border-danger/30 bg-danger-soft/40")}
                >
                  <div className="flex items-center gap-2">
                    {r.passed ? <Check className="size-3.5 text-success" /> : <X className="size-3.5 text-danger" />}
                    <span className="font-medium">{r.name}</span>
                    {r.durationMs !== undefined ? <span className="ml-auto text-subtle-foreground tabular-nums">{r.durationMs.toFixed(1)} ms</span> : null}
                  </div>
                  {!r.passed ? (
                    <div className="mt-1.5 grid gap-0.5 font-mono break-all">
                      {r.expected !== undefined ? <span><span className="text-subtle-foreground">{w.expected}: </span>{r.expected}</span> : null}
                      {r.actual !== undefined ? <span><span className="text-subtle-foreground">{w.actual}: </span>{r.actual}</span> : null}
                      {r.error ? <span className="text-danger"><span className="text-subtle-foreground">{w.error}: </span>{r.error}</span> : null}
                    </div>
                  ) : null}
                </li>
              ))}
            </ul>
            {execution.mode === "browser" && execution.logs.length > 0 ? (
              <div>
                <p className="mb-1 text-[11px] text-muted-foreground">{w.logs}</p>
                <pre className="max-h-40 overflow-auto rounded-md bg-surface-2 p-2 font-mono text-[11px]">{execution.logs.join("\n")}</pre>
              </div>
            ) : null}
          </div>
        )}
      </TabsContent>

      <TabsContent value="local" className="min-h-0 flex-1 overflow-y-auto p-3">
        <LocalRunner signature={signature} comparator={comparator} tests={allTests} language={language} code={code} onResults={onLocalResults} />
      </TabsContent>
    </Tabs>
  );
}

function CustomTests({ problemId, signature, customTests }: { problemId: number; signature: ProblemSignature; customTests: CustomTest[] }) {
  const { m } = useI18n();
  const w = m.practice.ws;
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [args, setArgs] = useState("");
  const [expected, setExpected] = useState("");
  const [pending, start] = useTransition();

  const add = () => {
    let parsedArgs: unknown;
    let parsedExpected: unknown;
    try {
      parsedArgs = JSON.parse(args);
      parsedExpected = JSON.parse(expected);
    } catch {
      toast.error(w.invalidJson);
      return;
    }
    if (!Array.isArray(parsedArgs)) return void toast.error(w.argsMustBeArray);
    start(async () => {
      const res = await addCustomTestAction({ problemId, name: name || `case ${customTests.length + 1}`, args: parsedArgs as unknown[], expected: parsedExpected });
      if (!res.ok) return void toast.error(res.error);
      setName("");
      setArgs("");
      setExpected("");
      setOpen(false);
    });
  };

  return (
    <div className="mt-4">
      <div className="mb-1.5 flex items-center justify-between">
        <p className="text-[11px] font-medium text-muted-foreground">{w.customTests}</p>
        <Button size="sm" variant="ghost" onClick={() => setOpen((o) => !o)}>
          <Plus />
          {w.addTest}
        </Button>
      </div>
      {customTests.length ? (
        <ul className="mb-2 flex flex-col gap-1.5">
          {customTests.map((c) => (
            <li key={c.id} className="flex items-start justify-between gap-2 rounded-md border border-dashed border-border px-3 py-2 font-mono text-xs">
              <div className="min-w-0">
                <span className="font-sans text-[11px] text-muted-foreground">{c.name}</span>
                <div className="break-all">{short(c.args)} → {short(c.expected)}</div>
              </div>
              <button
                type="button"
                aria-label={m.common.actions.delete}
                className="text-subtle-foreground hover:text-danger"
                onClick={async () => {
                  const res = await deleteCustomTestAction({ id: c.id });
                  if (!res.ok) toast.error(res.error);
                }}
              >
                <Trash2 className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
      {open ? (
        <div className="flex flex-col gap-2 rounded-md border border-border bg-surface p-3">
          <Input placeholder={w.testName} value={name} onChange={(e) => setName(e.target.value)} aria-label={w.testName} />
          <label className="text-[11px] text-muted-foreground">
            {w.argsLabel}: <span className="font-mono">[{signature.params.map((p) => `${p.name}: ${p.type}`).join(", ")}]</span>
          </label>
          <Textarea rows={2} className="font-mono text-xs" value={args} onChange={(e) => setArgs(e.target.value)} placeholder='[[2,7,11,15], 9]' aria-label={w.argsLabel} />
          <label className="text-[11px] text-muted-foreground">{w.expectedLabel}</label>
          <Textarea rows={1} className="min-h-0 font-mono text-xs" value={expected} onChange={(e) => setExpected(e.target.value)} placeholder="[0,1]" aria-label={w.expectedLabel} />
          <Button size="sm" variant="primary" className="self-start" onClick={add} disabled={pending}>
            {m.common.actions.add}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

function LocalRunner({
  signature,
  comparator,
  tests,
  language,
  code,
  onResults,
}: {
  signature: ProblemSignature;
  comparator: Comparator;
  tests: ProblemTest[];
  language: Language;
  code: string;
  onResults: (e: Extract<Execution, { mode: "local" }>) => void;
}) {
  const { m } = useI18n();
  const l = m.practice.ws.local;
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const harness = useMemo(() => generateHarness(language, { code, signature, comparator, tests }), [language, code, signature, comparator, tests]);
  const names = tests.map((t) => t.name);

  const download = () => {
    const url = URL.createObjectURL(new Blob([harness], { type: "text/plain" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = HARNESS_FILENAMES[language];
    a.click();
    URL.revokeObjectURL(url);
  };

  const use = () => {
    const parsed = parseHarnessOutput(output, names);
    if (!parsed.valid) return void toast.error(l.invalid);
    onResults({
      mode: "local",
      output,
      testNames: names,
      code,
      language,
      results: parsed.results.map((r) => ({ name: r.name, passed: r.passed, error: r.passed ? undefined : r.detail })),
    });
    toast.success(l.parsed);
  };

  return (
    <div className="flex flex-col gap-3 text-xs">
      <p className="font-medium">{l.title}</p>
      <ol className="flex list-decimal flex-col gap-2 pl-4 text-muted-foreground">
        <li>
          {l.step1}
          <div className="mt-1.5 flex gap-2">
            <Button size="sm" onClick={download}>
              <Download />
              {l.download} {HARNESS_FILENAMES[language]}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                await navigator.clipboard.writeText(harness);
                setCopied(true);
                window.setTimeout(() => setCopied(false), 1500);
              }}
            >
              <Clipboard />
              {copied ? l.copied : l.copy}
            </Button>
          </div>
        </li>
        <li>
          {l.step2} <code className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-foreground">{HARNESS_COMMANDS[language]}</code>{" "}
          <span className="text-subtle-foreground">({l.requires[language]})</span>
        </li>
        <li>
          {l.step3}
          <Textarea
            rows={6}
            className="mt-1.5 font-mono text-xs"
            value={output}
            onChange={(e) => setOutput(e.target.value)}
            placeholder={l.paste}
            aria-label={l.paste}
          />
          <Button size="sm" variant="primary" className="mt-2" onClick={use} disabled={!output.trim()}>
            {l.parse}
          </Button>
        </li>
      </ol>
    </div>
  );
}
