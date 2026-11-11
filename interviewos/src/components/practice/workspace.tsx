"use client";

import {
  ChevronLeft,
  Keyboard,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Send,
  Timer,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Group, Panel, Separator } from "react-resizable-panels";
import { toast } from "sonner";
import { saveDraftAction } from "@/app/practice/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Select } from "@/components/ui/input";
import { Kbd } from "@/components/ui/misc";
import { Tooltip } from "@/components/ui/tooltip";
import { browserTypeScriptRunner } from "@/lib/code-runner/browser-runner";
import { LANGUAGES, type Language, type ProblemTest } from "@/lib/content/types";
import { formatDuration } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { WorkspaceData } from "@/server/practice";
import { ActiveTimer } from "../learn/active-timer";
import { CodeEditor } from "./code-editor";
import { ProblemPanel } from "./problem-panel";
import { SubmitDialog } from "./submit-dialog";
import { TestsPanel, type Execution } from "./tests-panel";
import { useStopwatch } from "./use-stopwatch";

type Solution = Parameters<React.ComponentProps<typeof ProblemPanel>["onSolution"]>[0];

const SHORTCUTS: [string, string][] = [
  ["Ctrl/⌘ + Enter", "Run tests (TypeScript) / open local runner"],
  ["Ctrl/⌘ + S", "Save draft"],
  ["Ctrl/⌘ + Shift + Enter", "Submit attempt"],
  ["Ctrl/⌘ + .", "Toggle focus mode"],
  ["Ctrl/⌘ + K", "Command palette"],
];

function storageKey(slug: string, lang: Language) {
  return `interviewos:draft:${slug}:${lang}`;
}

export function Workspace({
  data,
  defaultLanguage,
  theme,
}: {
  data: WorkspaceData;
  defaultLanguage: Language;
  theme: "dark" | "light";
}) {
  const { m } = useI18n();
  const w = m.practice.ws;
  const router = useRouter();
  const p = data.problem;
  const [language, setLanguage] = useState<Language>(defaultLanguage);
  // Prefer an unsaved local backup (e.g. after a crash) over the server draft. Monaco renders
  // client-side only, so reading localStorage in the initializer cannot cause a hydration mismatch.
  const [code, setCode] = useState<Record<Language, string>>(() => {
    const initial = {
      java: data.drafts.java ?? p.starterCode.java,
      typescript: data.drafts.typescript ?? p.starterCode.typescript,
      python: data.drafts.python ?? p.starterCode.python,
    };
    if (typeof window === "undefined") return initial;
    try {
      for (const lang of LANGUAGES) {
        const local = window.localStorage.getItem(storageKey(p.slug, lang));
        if (local) initial[lang] = local;
      }
    } catch {
      /* storage unavailable */
    }
    return initial;
  });
  const [execution, setExecution] = useState<Execution>({ mode: "none" });
  const [running, setRunning] = useState(false);
  const [hints, setHints] = useState<string[]>([]);
  const [solution, setSolution] = useState<Solution | null>(null);
  const [viewedSolution, setViewedSolution] = useState(false);
  const [leftTab, setLeftTab] = useState("description");
  const [bottomTab, setBottomTab] = useState("tests");
  const [focus, setFocus] = useState(false);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);
  const watch = useStopwatch();
  const saveTimer = useRef<number | null>(null);
  const current = code[language];

  const persist = useCallback(
    async (lang: Language, value: string, notify = false) => {
      const res = await saveDraftAction({ problemId: p.id, language: lang, code: value });
      if (res.ok) {
        try {
          window.localStorage.removeItem(storageKey(p.slug, lang));
        } catch {
          /* ignore */
        }
        if (notify) toast.success(w.saved);
      } else toast.error(res.error);
    },
    [p.id, p.slug, w.saved],
  );

  const onChange = (value: string) => {
    if (!watch.running && watch.elapsed === 0) watch.start();
    setCode((c) => ({ ...c, [language]: value }));
    try {
      window.localStorage.setItem(storageKey(p.slug, language), value);
    } catch {
      /* ignore */
    }
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void persist(language, value), 1500);
  };

  const allTests: ProblemTest[] = useMemo(
    () => [
      ...p.tests,
      ...data.customTests.map((c) => ({ name: `custom: ${c.name}`, args: c.args, expected: c.expected })),
    ],
    [p.tests, data.customTests],
  );

  const run = useCallback(async () => {
    if (language !== "typescript") {
      setBottomTab("local");
      return;
    }
    setRunning(true);
    setBottomTab("results");
    try {
      const res = await browserTypeScriptRunner.run({
        language,
        code: current,
        signature: p.signature,
        comparator: p.comparator,
        tests: allTests,
      });
      setExecution({
        mode: "browser",
        results: res.results,
        logs: res.logs,
        compileError: res.compileError,
        message: res.message,
        code: current,
        language,
      });
    } finally {
      setRunning(false);
    }
  }, [language, current, p.signature, p.comparator, allTests]);

  const openSubmit = useCallback(() => {
    watch.pause();
    setSubmitOpen(true);
  }, [watch]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const mod = e.metaKey || e.ctrlKey;
      if (!mod) return;
      if (e.key === "Enter" && e.shiftKey) {
        e.preventDefault();
        openSubmit();
      } else if (e.key === "Enter") {
        e.preventDefault();
        void run();
      } else if (e.key.toLowerCase() === "s") {
        e.preventDefault();
        void persist(language, current, true);
      } else if (e.key === ".") {
        e.preventDefault();
        setFocus((f) => !f);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [run, openSubmit, persist, language, current]);

  const showSolution = (s: Solution, beforeSubmit: boolean) => {
    setSolution(s);
    if (beforeSubmit) setViewedSolution(true);
    setLeftTab("solution");
  };

  return (
    <div className="flex h-dvh flex-col">
      <ActiveTimer kind="problem" refId={`view:${p.slug}`} />
      <header className="border-border bg-surface flex h-12 shrink-0 items-center gap-2 border-b px-3">
        <Link
          href="/practice"
          className="text-muted-foreground hover:text-foreground flex items-center gap-1 text-xs"
        >
          <ChevronLeft className="size-4" />
          <span className="hidden sm:inline">{w.back}</span>
        </Link>
        <h1 className="ml-1 truncate text-sm font-semibold">{p.title}</h1>
        <Badge tone={p.difficulty === "easy" ? "success" : p.difficulty === "medium" ? "warning" : "danger"}>
          {m.common.difficulty[p.difficulty]}
        </Badge>
        {viewedSolution ? (
          <Badge tone="danger">{w.independenceValues.with_solution}</Badge>
        ) : hints.length ? (
          <Badge tone="warning">{w.independenceValues.with_hints}</Badge>
        ) : null}

        <div className="ml-auto flex items-center gap-1.5">
          <div
            className="border-border bg-surface-2 flex items-center gap-1 rounded-md border px-2 py-1"
            aria-label={w.timer.label}
          >
            <Timer className="text-subtle-foreground size-3.5" />
            <span className="w-14 text-xs tabular-nums" data-testid="stopwatch">
              {formatDuration(watch.elapsed)}
            </span>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-0.5"
              onClick={watch.running ? watch.pause : watch.start}
              aria-label={watch.running ? w.timer.pause : w.timer.start}
            >
              {watch.running ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
            </button>
            <button
              type="button"
              className="text-muted-foreground hover:text-foreground p-0.5"
              onClick={watch.reset}
              aria-label={w.timer.reset}
            >
              <RotateCcw className="size-3.5" />
            </button>
          </div>
          <Select
            className="h-7 w-32 text-xs"
            value={language}
            onChange={(e) => {
              setLanguage(e.target.value as Language);
            }}
            aria-label={w.language}
            data-testid="language-select"
          >
            {LANGUAGES.map((l) => (
              <option key={l} value={l}>
                {m.common.languages[l]}
              </option>
            ))}
          </Select>
          <Tooltip content={w.resetCode}>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={w.resetCode}
              onClick={() => {
                if (window.confirm(w.resetConfirm)) onChange(p.starterCode[language]);
              }}
            >
              <RotateCcw />
            </Button>
          </Tooltip>
          <Tooltip content={w.shortcuts}>
            <Button size="icon-sm" variant="ghost" aria-label={w.shortcuts} onClick={() => setHelpOpen(true)}>
              <Keyboard />
            </Button>
          </Tooltip>
          <Tooltip content={focus ? w.exitFocus : w.focus}>
            <Button
              size="icon-sm"
              variant="ghost"
              aria-label={focus ? w.exitFocus : w.focus}
              aria-pressed={focus}
              onClick={() => setFocus((f) => !f)}
              data-testid="focus-toggle"
            >
              {focus ? <Minimize2 /> : <Maximize2 />}
            </Button>
          </Tooltip>
          <Button size="sm" variant="primary" onClick={openSubmit} data-testid="submit-attempt">
            <Send />
            <span className="hidden sm:inline">{w.submit}</span>
          </Button>
        </div>
      </header>

      <Group orientation="horizontal" className="min-h-0 flex-1">
        {!focus ? (
          <>
            <Panel id="problem" defaultSize="42%" minSize="25%" className="bg-background">
              <ProblemPanel
                data={data}
                tab={leftTab}
                onTabChange={setLeftTab}
                hints={hints}
                onHint={(h) => setHints((x) => [...x, h])}
                solution={solution}
                onSolution={showSolution}
                theme={theme}
                language={language}
              />
            </Panel>
            <Separator className="w-px" />
          </>
        ) : null}
        <Panel id="code" minSize="35%">
          <Group orientation="vertical" className="h-full">
            <Panel id="editor" defaultSize="64%" minSize="25%">
              <CodeEditor
                path={`file:///${p.slug}/solution.${language === "typescript" ? "ts" : language === "python" ? "py" : "java"}`}
                language={language}
                value={current}
                onChange={onChange}
                theme={theme}
                commands={{
                  onRun: () => void run(),
                  onSave: () => void persist(language, current, true),
                  onSubmit: openSubmit,
                }}
              />
            </Panel>
            <Separator className="h-px" />
            <Panel id="tests" defaultSize="36%" minSize="15%" className="bg-background">
              <TestsPanel
                problemId={p.id}
                signature={p.signature}
                comparator={p.comparator}
                tests={p.tests}
                customTests={data.customTests}
                language={language}
                code={current}
                execution={execution}
                running={running}
                onRun={() => void run()}
                onLocalResults={(e) => {
                  setExecution(e);
                  setBottomTab("results");
                }}
                tab={bottomTab}
                onTabChange={setBottomTab}
              />
            </Panel>
          </Group>
        </Panel>
      </Group>

      <SubmitDialog
        open={submitOpen}
        onOpenChange={(o) => {
          setSubmitOpen(o);
          if (!o && watch.elapsed > 0) watch.start();
        }}
        problemId={p.id}
        language={language}
        code={current}
        execution={execution}
        durationSeconds={watch.elapsed}
        hintsUsed={hints.length}
        viewedSolution={viewedSolution}
        onRecorded={() => {
          watch.reset();
          void persist(language, current);
          router.refresh();
        }}
        onShowSolution={async () => {
          const { getSolutionAction } = await import("@/app/practice/actions");
          const res = await getSolutionAction({ problemId: p.id });
          if (res.ok && res.data) showSolution(res.data, false);
        }}
      />

      <Dialog open={helpOpen} onOpenChange={setHelpOpen}>
        <DialogContent title={w.shortcuts}>
          <ul className="flex flex-col gap-2 text-sm">
            {SHORTCUTS.map(([k, d]) => (
              <li key={k} className="flex items-center justify-between gap-4">
                <span className="text-muted-foreground">{d}</span>
                <Kbd>{k}</Kbd>
              </li>
            ))}
          </ul>
          <p className="text-subtle-foreground mt-4 text-xs">{m.practice.executionNote}</p>
        </DialogContent>
      </Dialog>
    </div>
  );
}
