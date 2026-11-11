"use client";

import { Check, CircleDashed, ShieldCheck, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  saveReflectionsAction,
  saveStepEvidenceAction,
  startLabAction,
  verifyLabAction,
} from "@/app/practice/labs/actions";
import { Markdown } from "@/components/content/markdown-client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox, Input, Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import type { LabStep } from "@/lib/content/types";
import type { StepEvidence } from "@/lib/db/schema";
import { useI18n } from "@/lib/i18n/client";
import { MIN_REFLECTION_CHARS } from "@/lib/labs";
import { cn } from "@/lib/utils";

interface AttemptState {
  id: number;
  status: "in_progress" | "verified";
  stepEvidence: Record<string, StepEvidence>;
  reflections: string[];
  minutesSpent: number;
}

function StepCard({
  step,
  index,
  attempt,
  disabled,
}: {
  step: LabStep;
  index: number;
  attempt: AttemptState | null;
  disabled: boolean;
}) {
  const { m } = useI18n();
  const L = m.labs;
  const ev = attempt?.stepEvidence[step.id];
  const [text, setText] = useState(ev?.text ?? "");
  const [checked, setChecked] = useState(ev?.checked ?? false);
  const [result, setResult] = useState<{ passed: boolean; reason?: string } | null>(
    ev ? { passed: ev.passed } : null,
  );
  const [pending, start] = useTransition();

  const save = (payload: { text?: string; checked?: boolean }) =>
    start(async () => {
      if (!attempt) return;
      const res = await saveStepEvidenceAction({ attemptId: attempt.id, stepId: step.id, ...payload });
      if (!res.ok) return void toast.error(res.error);
      setResult(res.data!);
    });

  const v = step.verification;
  return (
    <li className="border-border bg-surface rounded-lg border p-4" data-testid={`lab-step-${step.id}`}>
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full text-[11px] font-medium",
            result?.passed ? "bg-success text-white" : "bg-surface-3 text-muted-foreground",
          )}
        >
          {result?.passed ? <Check className="size-3" /> : index + 1}
        </span>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">{step.title}</h3>
          <div className="mt-2">
            <Markdown>{step.instructions}</Markdown>
          </div>
          {step.expectedOutput ? (
            <div className="border-border bg-surface-2 mt-3 rounded-md border p-3">
              <p className="text-muted-foreground mb-1 text-[11px] font-medium">{L.expectedOutput}</p>
              <Markdown compact>{step.expectedOutput}</Markdown>
            </div>
          ) : null}
          <div className="mt-3">
            <p className="text-muted-foreground mb-1.5 text-[11px] font-medium">
              {L.evidence}: {v.prompt}
            </p>
            {v.kind === "paste" ? (
              <>
                <Textarea
                  rows={5}
                  className="font-mono text-xs"
                  value={text}
                  onChange={(e) => setText(e.target.value)}
                  disabled={disabled || pending}
                  aria-label={v.prompt}
                />
                <div className="mt-2 flex flex-wrap items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => save({ text })}
                    disabled={disabled || pending || !text.trim()}
                  >
                    {L.saveEvidence}
                  </Button>
                  {result ? (
                    result.passed ? (
                      <Badge tone="success">
                        <Check />
                        {L.evidenceOk}
                      </Badge>
                    ) : (
                      <Badge tone="danger">
                        <X />
                        {result.reason === "short" ? L.tooShort(v.minLength ?? 20) : L.evidenceBad}
                      </Badge>
                    )
                  ) : null}
                  {result && !result.passed && v.patternHint ? (
                    <span className="text-muted-foreground text-[11px]">{v.patternHint}</span>
                  ) : null}
                </div>
              </>
            ) : (
              <label className="flex items-center gap-2 text-sm">
                <Checkbox
                  checked={checked}
                  disabled={disabled || pending}
                  onChange={(e) => {
                    setChecked(e.target.checked);
                    save({ checked: e.target.checked });
                  }}
                />
                {L.checkboxConfirm}
              </label>
            )}
          </div>
        </div>
      </div>
    </li>
  );
}

export function LabRunner({
  labId,
  steps,
  reflectionQuestions,
  attempt,
}: {
  labId: number;
  steps: LabStep[];
  reflectionQuestions: string[];
  attempt: AttemptState | null;
}) {
  const { m } = useI18n();
  const L = m.labs;
  const [reflections, setReflections] = useState<string[]>(() =>
    reflectionQuestions.map((_, i) => attempt?.reflections[i] ?? ""),
  );
  const [minutes, setMinutes] = useState(attempt?.minutesSpent ?? 0);
  const [pending, start] = useTransition();
  const verified = attempt?.status === "verified";
  const passedSteps = steps.filter((s) => attempt?.stepEvidence[s.id]?.passed).length;

  const startAttempt = () =>
    start(async () => {
      const res = await startLabAction({ labId });
      if (!res.ok) toast.error(res.error);
      else toast.success(L.reopened);
    });

  const saveReflections = async () => {
    if (!attempt) return false;
    const res = await saveReflectionsAction({ attemptId: attempt.id, reflections, minutesSpent: minutes });
    if (!res.ok) toast.error(res.error);
    return res.ok;
  };

  const verify = () =>
    start(async () => {
      if (!(await saveReflections())) return;
      const res = await verifyLabAction({ attemptId: attempt!.id });
      if (!res.ok) toast.error(L.notVerifiable);
      else toast.success(L.verified);
    });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center gap-3">
        {!attempt || verified ? (
          <Button
            variant={verified ? "secondary" : "primary"}
            size="sm"
            onClick={startAttempt}
            disabled={pending}
            data-testid="lab-start"
          >
            {verified ? L.restart : L.start}
          </Button>
        ) : null}
        {attempt ? (
          <div className="flex min-w-48 flex-1 items-center gap-2">
            <Progress value={(passedSteps / steps.length) * 100} tone={verified ? "success" : "primary"} />
            <span className="text-muted-foreground shrink-0 text-xs">
              {L.progress(passedSteps, steps.length)}
            </span>
          </div>
        ) : null}
        {verified ? (
          <Badge tone="success">
            <ShieldCheck />
            {L.status.verified}
          </Badge>
        ) : null}
      </div>
      <p className="text-subtle-foreground text-[11px]">{L.honesty}</p>

      <section>
        <h2 className="mb-3 text-base font-semibold">{L.stepsTitle}</h2>
        <ol className="flex flex-col gap-3">
          {steps.map((s, i) => (
            <StepCard
              key={`${attempt?.id ?? 0}-${s.id}`}
              step={s}
              index={i}
              attempt={attempt}
              disabled={!attempt || verified}
            />
          ))}
        </ol>
      </section>

      <section>
        <h2 className="mb-3 text-base font-semibold">{L.reflection}</h2>
        <ol className="flex flex-col gap-3">
          {reflectionQuestions.map((q, i) => (
            <li key={q}>
              <p className="mb-1.5 text-sm">{q}</p>
              <Textarea
                rows={3}
                value={reflections[i]}
                disabled={!attempt || verified}
                placeholder={L.reflectionPlaceholder}
                aria-label={q}
                onChange={(e) => setReflections((r) => r.map((x, j) => (j === i ? e.target.value : x)))}
                onBlur={() => void saveReflections()}
              />
              <p className="text-subtle-foreground mt-1 flex items-center gap-1 text-[11px]">
                {reflections[i]!.trim().length >= MIN_REFLECTION_CHARS ? (
                  <Check className="text-success size-3" />
                ) : (
                  <CircleDashed className="size-3" />
                )}
                {reflections[i]!.trim().length}/{MIN_REFLECTION_CHARS}
              </p>
            </li>
          ))}
        </ol>
      </section>

      {attempt && !verified ? (
        <div className="border-border flex flex-wrap items-end gap-3 border-t pt-4">
          <label className="text-muted-foreground flex flex-col gap-1 text-xs">
            {L.minutesSpent}
            <Input
              type="number"
              min={0}
              max={1000}
              className="w-28"
              value={minutes}
              onChange={(e) => setMinutes(Number(e.target.value) || 0)}
            />
          </label>
          <Button variant="primary" onClick={verify} disabled={pending} data-testid="lab-verify">
            <ShieldCheck />
            {L.verify}
          </Button>
        </div>
      ) : null}
    </div>
  );
}
