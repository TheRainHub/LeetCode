"use client";

import { Mic, Sparkles, Timer } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { revealRubricAction, saveExplainAttemptAction } from "@/app/learn/actions";
import { Markdown } from "@/components/content/markdown-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Textarea } from "@/components/ui/input";
import { formatDuration } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { useInterviewMode } from "./lesson-shell";

type AiGrader = (input: { exerciseId: number; response: string }) => Promise<
  { ok: true; data?: { score: number; rubricChecks: boolean[]; feedback: string } } | { ok: false; error: string }
>;

export function ExplainExercise({
  exerciseId,
  prompt,
  attempts,
  best,
  aiGrader,
}: {
  exerciseId: number;
  prompt: string;
  attempts: number;
  best: number;
  aiGrader?: AiGrader;
}) {
  const { m } = useI18n();
  const e = m.learn.explain;
  const { active, setActive } = useInterviewMode();
  const [response, setResponse] = useState("");
  const [rubric, setRubric] = useState<{ rubric: string[]; modelAnswer: string } | null>(null);
  const [checks, setChecks] = useState<boolean[]>([]);
  const [elapsed, setElapsed] = useState(0);
  const [aiFeedback, setAiFeedback] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef<number>(0);
  const frozen = useRef<number | null>(null);

  useEffect(() => {
    if (!active || rubric) return;
    const id = window.setInterval(() => setElapsed((Date.now() - startedAt.current) / 1000), 1000);
    return () => window.clearInterval(id);
  }, [active, rubric]);

  const begin = () => {
    startedAt.current = Date.now();
    frozen.current = null;
    setElapsed(0);
    setResponse("");
    setRubric(null);
    setAiFeedback(null);
    setActive(true);
  };

  const reveal = () =>
    start(async () => {
      const res = await revealRubricAction({ exerciseId, response });
      if (!res.ok) return void toast.error(res.error);
      frozen.current = (Date.now() - startedAt.current) / 1000;
      setRubric(res.data!);
      setChecks(res.data!.rubric.map(() => false));
      setActive(false);
    });

  const save = (gradedBy: "self" | "ai", aiScore?: number, feedback?: string, aiChecks?: boolean[]) =>
    start(async () => {
      const res = await saveExplainAttemptAction({
        exerciseId,
        response,
        rubricChecks: aiChecks ?? checks,
        durationSeconds: frozen.current ?? 0,
        interviewMode: true,
        gradedBy,
        aiScore,
        feedback,
      });
      if (!res.ok) return void toast.error(res.error);
      toast.success(e.saved(Math.round((res.data?.score ?? 0) * 100)));
      setRubric(null);
      setResponse("");
    });

  const gradeWithAi = () =>
    start(async () => {
      if (!aiGrader) return;
      const res = await aiGrader({ exerciseId, response });
      if (!res.ok) return void toast.error(res.error);
      setChecks(res.data!.rubricChecks);
      setAiFeedback(res.data!.feedback);
      save("ai", res.data!.score, res.data!.feedback, res.data!.rubricChecks);
    });

  return (
    <div className="rounded-lg border border-border bg-surface p-4" data-testid="explain-exercise">
      <p className="text-sm font-medium">{prompt}</p>
      <p className="mt-1 text-xs text-muted-foreground">{e.intro}</p>
      {attempts > 0 ? (
        <p className="mt-2 text-[11px] text-subtle-foreground">
          {e.history(attempts)} · best {Math.round(best * 100)}%
        </p>
      ) : null}

      {!active && !rubric ? (
        <Button className="mt-3" variant="primary" size="sm" onClick={begin} data-testid="explain-start">
          <Mic />
          {e.start}
        </Button>
      ) : null}

      {active ? (
        <div className="mt-3 flex flex-col gap-2">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <Timer className="size-3.5" />
              {e.timer}: <span className="tabular-nums text-foreground">{formatDuration(elapsed)}</span>
            </span>
            <Button size="sm" variant="ghost" onClick={() => setActive(false)}>
              {e.cancel}
            </Button>
          </div>
          <Textarea
            autoFocus
            rows={9}
            value={response}
            onChange={(ev) => setResponse(ev.target.value)}
            placeholder={e.placeholder}
            aria-label={e.placeholder}
          />
          <Button variant="primary" size="sm" className="self-start" onClick={reveal} disabled={pending || response.trim().length < 40}>
            {e.done}
          </Button>
        </div>
      ) : null}

      {rubric ? (
        <div className="mt-4 grid gap-4 lg:grid-cols-2">
          <div>
            <p className="mb-2 text-xs font-medium text-muted-foreground">{e.rubric}</p>
            <ul className="flex flex-col gap-1.5">
              {rubric.rubric.map((r, i) => (
                <li key={i}>
                  <label className="flex cursor-pointer items-start gap-2 text-sm">
                    <Checkbox
                      className="mt-0.5"
                      checked={checks[i] ?? false}
                      onChange={(ev) => setChecks((c) => c.map((v, j) => (j === i ? ev.target.checked : v)))}
                    />
                    <span>{r}</span>
                  </label>
                </li>
              ))}
            </ul>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge tone="neutral">{Math.round((checks.filter(Boolean).length / Math.max(1, checks.length)) * 100)}%</Badge>
              <Button size="sm" variant="primary" onClick={() => save("self")} disabled={pending} data-testid="explain-save">
                {e.save}
              </Button>
              {aiGrader ? (
                <Button size="sm" onClick={gradeWithAi} disabled={pending}>
                  <Sparkles />
                  {pending ? e.aiGrading : e.aiGrade}
                </Button>
              ) : (
                <span className="text-[11px] text-subtle-foreground">{e.aiUnavailable}</span>
              )}
            </div>
            {aiFeedback ? (
              <div className="mt-3 rounded-md border border-border bg-surface-2 p-3">
                <p className="mb-1 text-xs font-medium">{e.aiFeedback}</p>
                <Markdown compact>{aiFeedback}</Markdown>
              </div>
            ) : null}
          </div>
          <div className="rounded-md border border-border bg-surface-2 p-3">
            <p className="mb-1 text-xs font-medium text-muted-foreground">{e.modelAnswer}</p>
            <p className="text-sm leading-relaxed">{rubric.modelAnswer}</p>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs text-muted-foreground">{e.yourAnswer}</summary>
              <p className="mt-2 text-sm whitespace-pre-wrap text-muted-foreground">{response}</p>
            </details>
          </div>
        </div>
      ) : null}
    </div>
  );
}
