"use client";

import { Check, ExternalLink, Eye, Lightbulb, Lock, X } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { getHintAction, getSolutionAction, saveProblemNotesAction } from "@/app/practice/actions";
import { Markdown } from "@/components/content/markdown-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Language } from "@/lib/content/types";
import { formatDuration } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import type { WorkspaceData } from "@/server/practice";
import { CodeEditor } from "./code-editor";

type Solution = {
  approach: string;
  solutionCode: Record<Language, string>;
  expectedTime: string;
  expectedSpace: string;
  complexityNotes: string;
  commonMistakes: string[];
};

export function ProblemPanel({
  data,
  tab,
  onTabChange,
  hints,
  onHint,
  solution,
  onSolution,
  theme,
  language,
}: {
  data: WorkspaceData;
  tab: string;
  onTabChange: (t: string) => void;
  hints: string[];
  onHint: (hint: string) => void;
  solution: Solution | null;
  onSolution: (s: Solution, beforeSubmit: boolean) => void;
  theme: "dark" | "light";
  language: Language;
}) {
  const { m, locale } = useI18n();
  const w = m.practice.ws;
  const p = data.problem;
  const [pending, start] = useTransition();
  const [viewCode, setViewCode] = useState<{ code: string; language: Language } | null>(null);

  const nextHint = () =>
    start(async () => {
      const res = await getHintAction({ problemId: p.id, index: hints.length });
      if (res.ok && res.data) onHint(res.data.hint);
      else if (!res.ok) toast.error(res.error);
    });

  const reveal = (beforeSubmit: boolean) =>
    start(async () => {
      const res = await getSolutionAction({ problemId: p.id });
      if (res.ok && res.data) onSolution(res.data, beforeSubmit);
      else if (!res.ok) toast.error(res.error);
    });

  return (
    <Tabs value={tab} onValueChange={onTabChange} className="flex h-full flex-col">
      <div className="border-border border-b px-3 py-1.5">
        <TabsList className="flex-wrap">
          <TabsTrigger value="description">{w.description}</TabsTrigger>
          <TabsTrigger value="hints">
            {w.hints}
            {hints.length ? <Badge tone="warning">{hints.length}</Badge> : null}
          </TabsTrigger>
          <TabsTrigger value="solution">{w.solution}</TabsTrigger>
          <TabsTrigger value="notes">{w.notes}</TabsTrigger>
          <TabsTrigger value="attempts">
            {w.attempts}
            {data.attempts.length ? <Badge>{data.attempts.length}</Badge> : null}
          </TabsTrigger>
        </TabsList>
      </div>

      <TabsContent value="description" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge
            tone={p.difficulty === "easy" ? "success" : p.difficulty === "medium" ? "warning" : "danger"}
          >
            {m.common.difficulty[p.difficulty]}
          </Badge>
          <Badge tone="primary">{p.pattern}</Badge>
          {p.tags.map((t) => (
            <Badge key={t} tone="outline">
              {t}
            </Badge>
          ))}
        </div>
        <Markdown>{p.statement}</Markdown>
        <h3 className="text-muted-foreground mt-5 mb-2 text-xs font-semibold tracking-wide uppercase">
          {w.examples}
        </h3>
        <div className="flex flex-col gap-2">
          {p.examples.map((ex, i) => (
            <div key={i} className="border-border bg-surface-2 rounded-md border p-3 font-mono text-xs">
              <div>
                <span className="text-subtle-foreground">Input: </span>
                {ex.input}
              </div>
              <div>
                <span className="text-subtle-foreground">Output: </span>
                {ex.output}
              </div>
              {ex.explanation ? (
                <div className="text-muted-foreground mt-1 font-sans">{ex.explanation}</div>
              ) : null}
            </div>
          ))}
        </div>
        <h3 className="text-muted-foreground mt-5 mb-2 text-xs font-semibold tracking-wide uppercase">
          {w.constraints}
        </h3>
        <ul className="flex list-disc flex-col gap-0.5 pl-5 font-mono text-xs">
          {p.constraints.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <h3 className="text-muted-foreground mt-5 mb-2 text-xs font-semibold tracking-wide uppercase">
          {w.edgeCases}
        </h3>
        <ul className="text-muted-foreground flex list-disc flex-col gap-0.5 pl-5 text-sm">
          {p.edgeCases.map((c) => (
            <li key={c}>{c}</li>
          ))}
        </ul>
        <h3 className="text-muted-foreground mt-5 mb-2 text-xs font-semibold tracking-wide uppercase">
          {w.external}
        </h3>
        {p.externalLinks.map((l) => (
          <a
            key={l.url}
            href={l.url}
            target="_blank"
            rel="noreferrer noopener"
            className="text-primary flex items-center gap-1.5 text-sm hover:underline"
          >
            <ExternalLink className="size-3.5" />
            {l.title}
          </a>
        ))}
      </TabsContent>

      <TabsContent value="hints" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {hints.length > 0 ? <p className="text-warning mb-3 text-xs">{w.hintsUsed(hints.length)}</p> : null}
        <ol className="flex flex-col gap-2">
          {hints.map((h, i) => (
            <li key={i} className="border-border bg-surface rounded-md border p-3 text-sm">
              <p className="text-muted-foreground mb-1 flex items-center gap-1.5 text-[11px] font-medium">
                <Lightbulb className="text-warning size-3.5" />
                {w.hintN(i + 1)}
              </p>
              {h}
            </li>
          ))}
        </ol>
        {hints.length < p.hintCount ? (
          <Button className="mt-3" size="sm" onClick={nextHint} disabled={pending} data-testid="reveal-hint">
            <Lightbulb />
            {w.revealHint(hints.length + 1)}
          </Button>
        ) : (
          <p className="text-subtle-foreground mt-3 text-xs">{w.noMoreHints}</p>
        )}
      </TabsContent>

      <TabsContent value="solution" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {solution ? (
          <div className="flex flex-col gap-5">
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                {w.approach}
              </h3>
              <Markdown>{solution.approach}</Markdown>
            </div>
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                {w.complexity}
              </h3>
              <p className="text-sm">
                Time <code className="bg-surface-3 rounded px-1 font-mono">{solution.expectedTime}</code> ·
                Space <code className="bg-surface-3 rounded px-1 font-mono">{solution.expectedSpace}</code>
              </p>
              <p className="text-muted-foreground mt-1 text-sm">{solution.complexityNotes}</p>
            </div>
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                {w.commonMistakes}
              </h3>
              <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                {solution.commonMistakes.map((c) => (
                  <li key={c}>{c}</li>
                ))}
              </ul>
            </div>
            <div>
              <h3 className="text-muted-foreground mb-2 text-xs font-semibold tracking-wide uppercase">
                {w.referenceCode} · {m.common.languages[language]}
              </h3>
              <div className="border-border h-80 overflow-hidden rounded-md border">
                <CodeEditor
                  language={language}
                  value={solution.solutionCode[language]}
                  theme={theme}
                  readOnly
                />
              </div>
            </div>
          </div>
        ) : (
          <div className="border-border text-muted-foreground flex flex-col items-start gap-3 rounded-md border border-dashed p-4 text-sm">
            <Lock className="size-4" />
            {data.hasSubmitted ? (
              <Button size="sm" onClick={() => reveal(false)} disabled={pending}>
                <Eye />
                {w.solution}
              </Button>
            ) : (
              <>
                <p>{w.solutionAfterSubmit}</p>
                <p className="text-warning text-xs">{w.solutionLocked}</p>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => reveal(true)}
                  disabled={pending}
                  data-testid="reveal-solution"
                >
                  <Eye />
                  {w.revealSolution}
                </Button>
              </>
            )}
          </div>
        )}
      </TabsContent>

      <TabsContent value="notes" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        <ProblemNotes problemId={p.id} initial={data.notes} />
      </TabsContent>

      <TabsContent value="attempts" className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
        {data.attempts.length === 0 ? (
          <p className="text-muted-foreground text-sm">{w.history.empty}</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {data.attempts.map((a) => (
              <li key={a.id} className="border-border bg-surface rounded-md border p-3 text-xs">
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge
                    tone={a.outcome === "passed" ? "success" : a.outcome === "not_run" ? "outline" : "danger"}
                  >
                    {w.outcomes[a.outcome]}
                  </Badge>
                  <Badge tone="neutral">{w.executionModes[a.executionMode]}</Badge>
                  <Badge tone={a.independence === "independent" ? "primary" : "warning"}>
                    {w.independenceValues[a.independence]}
                  </Badge>
                  <span className="text-subtle-foreground ml-auto">
                    {new Date(a.createdAt).toLocaleString(locale === "ru" ? "ru-RU" : "en-GB")}
                  </span>
                </div>
                <div className="text-muted-foreground mt-2 grid grid-cols-2 gap-x-4 gap-y-1 sm:grid-cols-4">
                  <span>{m.common.languages[a.language]}</span>
                  <span>
                    {w.history.duration}: {formatDuration(a.durationSeconds)}
                  </span>
                  <span>
                    {w.history.hints}: {a.hintsUsed}
                  </span>
                  <span>{a.testsTotal ? `${a.testsPassed}/${a.testsTotal}` : "—"}</span>
                  <span className="col-span-2 flex items-center gap-1">
                    T: <code className="font-mono">{a.claimedTime}</code>
                    {a.timeCorrect ? (
                      <Check className="text-success size-3" />
                    ) : (
                      <X className="text-danger size-3" />
                    )}
                  </span>
                  <span className="col-span-2 flex items-center gap-1">
                    S: <code className="font-mono">{a.claimedSpace}</code>
                    {a.spaceCorrect ? (
                      <Check className="text-success size-3" />
                    ) : (
                      <X className="text-danger size-3" />
                    )}
                  </span>
                </div>
                {a.reflection ? <p className="text-muted-foreground mt-2 italic">“{a.reflection}”</p> : null}
                <Button
                  size="sm"
                  variant="ghost"
                  className="mt-1 -ml-2"
                  onClick={() => setViewCode({ code: a.code, language: a.language })}
                >
                  {w.history.viewCode}
                </Button>
              </li>
            ))}
          </ul>
        )}
        <Dialog open={viewCode !== null} onOpenChange={(o) => !o && setViewCode(null)}>
          {viewCode ? (
            <DialogContent title={w.history.viewCode} wide>
              <div className="border-border h-96 overflow-hidden rounded-md border">
                <CodeEditor language={viewCode.language} value={viewCode.code} theme={theme} readOnly />
              </div>
            </DialogContent>
          ) : null}
        </Dialog>
      </TabsContent>
    </Tabs>
  );
}

function ProblemNotes({ problemId, initial }: { problemId: number; initial: string }) {
  const { m } = useI18n();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => (timer.current ? window.clearTimeout(timer.current) : undefined), []);
  return (
    <div>
      <Textarea
        rows={14}
        value={value}
        placeholder={m.practice.ws.notesPlaceholder}
        aria-label={m.practice.ws.notes}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          setSaved(false);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(async () => {
            const res = await saveProblemNotesAction({ problemId, notes: next });
            if (res.ok) setSaved(true);
            else toast.error(res.error);
          }, 700);
        }}
      />
      <p className="text-subtle-foreground mt-1 h-4 text-[11px]">{saved ? m.common.actions.saved : ""}</p>
    </div>
  );
}
