"use client";

import { Check, TriangleAlert, X } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { recordAttemptAction, type AttemptReview } from "@/app/practice/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { COMMON_COMPLEXITIES } from "@/lib/complexity";
import type { Language } from "@/lib/content/types";
import { formatDay, formatDuration } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";
import type { Execution } from "./tests-panel";

function ComplexityInput({ label, value, onChange, id }: { label: string; value: string; onChange: (v: string) => void; id: string }) {
  const { m } = useI18n();
  const custom = value !== "" && !COMMON_COMPLEXITIES.includes(value);
  const [other, setOther] = useState(custom);
  return (
    <Field label={label} htmlFor={id}>
      <Select
        id={id}
        value={other ? "__other" : value}
        onChange={(e) => {
          if (e.target.value === "__other") {
            setOther(true);
            onChange("");
          } else {
            setOther(false);
            onChange(e.target.value);
          }
        }}
      >
        <option value="" disabled>
          —
        </option>
        {COMMON_COMPLEXITIES.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
        <option value="__other">{m.practice.ws.other}</option>
      </Select>
      {other ? <Input className="mt-1.5 font-mono" value={value} onChange={(e) => onChange(e.target.value)} placeholder="O(…)" aria-label={label} /> : null}
    </Field>
  );
}

export function SubmitDialog({
  open,
  onOpenChange,
  problemId,
  language,
  code,
  execution,
  durationSeconds,
  hintsUsed,
  viewedSolution,
  onRecorded,
  onShowSolution,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  problemId: number;
  language: Language;
  code: string;
  execution: Execution;
  durationSeconds: number;
  hintsUsed: number;
  viewedSolution: boolean;
  onRecorded: () => void;
  onShowSolution: () => void;
}) {
  const { m, locale } = useI18n();
  const w = m.practice.ws;
  const [time, setTime] = useState("");
  const [space, setSpace] = useState("");
  const [reflection, setReflection] = useState("");
  const [confidence, setConfidence] = useState(3);
  const [review, setReview] = useState<AttemptReview | null>(null);
  const [pending, start] = useTransition();

  const valid = execution.mode !== "none" && execution.code === code && execution.language === language;
  const effective: Execution = valid ? execution : { mode: "none" };
  const independence = viewedSolution ? "with_solution" : hintsUsed > 0 ? "with_hints" : "independent";

  const submit = () =>
    start(async () => {
      const res = await recordAttemptAction({
        problemId,
        language,
        code,
        durationSeconds: Math.round(durationSeconds),
        hintsUsed,
        viewedSolution,
        execution:
          effective.mode === "browser"
            ? { mode: "browser", results: effective.results }
            : effective.mode === "local"
              ? { mode: "local", output: effective.output, testNames: effective.testNames }
              : { mode: "none" },
        claimedTime: time,
        claimedSpace: space,
        reflection,
        confidence,
      });
      if (!res.ok) return void toast.error(res.error);
      setReview(res.data!);
      onRecorded();
    });

  const close = (o: boolean) => {
    if (!o) {
      setReview(null);
      setReflection("");
    }
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent title={review ? w.review.title : w.submitTitle} wide>
        {review ? (
          <div className="flex flex-col gap-4" data-testid="attempt-review">
            <div className="flex flex-wrap gap-1.5">
              <Badge tone={review.outcome === "passed" ? "success" : review.outcome === "not_run" ? "outline" : "danger"}>{w.outcomes[review.outcome]}</Badge>
              <Badge>{w.executionModes[review.executionMode]}</Badge>
              <Badge tone={review.independence === "independent" ? "primary" : "warning"}>{w.independenceValues[review.independence]}</Badge>
              {review.testsTotal ? <Badge tone="neutral">{w.passedOf(review.testsPassed, review.testsTotal)}</Badge> : null}
            </div>
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] text-muted-foreground">
                <tr>
                  <th className="pb-1 font-medium" />
                  <th className="pb-1 font-medium">{w.review.yourClaim}</th>
                  <th className="pb-1 font-medium">{w.review.expected}</th>
                  <th />
                </tr>
              </thead>
              <tbody>
                {(
                  [
                    ["Time", time, review.expectedTime, review.timeCorrect],
                    ["Space", space, review.expectedSpace, review.spaceCorrect],
                  ] as const
                ).map(([label, claim, expected, ok]) => (
                  <tr key={label} className="border-t border-border">
                    <td className="py-1.5 text-muted-foreground">{label}</td>
                    <td className="py-1.5 font-mono">{claim}</td>
                    <td className="py-1.5 font-mono">{expected}</td>
                    <td className="py-1.5">
                      <span className={cn("flex items-center gap-1 text-xs", ok ? "text-success" : "text-danger")}>
                        {ok ? <Check className="size-3.5" /> : <X className="size-3.5" />}
                        {ok ? w.review.correct : w.review.incorrect}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-sm text-muted-foreground">{review.complexityNotes}</p>
            <p className="text-xs text-subtle-foreground">{w.review.nextReview(formatDay(review.nextReviewOn, locale))}</p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={() => {
                  onShowSolution();
                  close(false);
                }}
              >
                {w.review.viewSolution}
              </Button>
              <Button size="sm" onClick={() => close(false)}>
                {m.common.actions.close}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-4">
            <div className="grid grid-cols-1 gap-3 rounded-md border border-border bg-surface-2 p-3 text-xs sm:grid-cols-3">
              <div>
                <p className="text-muted-foreground">{w.execution}</p>
                <p className="mt-0.5 font-medium">
                  {w.executionModes[effective.mode]}
                  {effective.mode !== "none" ? ` · ${w.passedOf(effective.results.filter((r) => r.passed).length, effective.results.length)}` : ""}
                </p>
              </div>
              <div>
                <p className="text-muted-foreground">{w.independence}</p>
                <p className="mt-0.5 font-medium">{w.independenceValues[independence]}</p>
              </div>
              <div>
                <p className="text-muted-foreground">{m.practice.ws.timer.label}</p>
                <p className="mt-0.5 font-medium tabular-nums">{formatDuration(durationSeconds)}</p>
              </div>
            </div>
            {effective.mode === "none" ? (
              <p className="flex items-start gap-2 rounded-md bg-warning-soft px-3 py-2 text-xs text-warning">
                <TriangleAlert className="mt-0.5 size-3.5 shrink-0" />
                {w.notExecutedWarning}
              </p>
            ) : null}
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              <ComplexityInput id="claim-time" label={w.claimedTime} value={time} onChange={setTime} />
              <ComplexityInput id="claim-space" label={w.claimedSpace} value={space} onChange={setSpace} />
            </div>
            <Field label={w.reflection} htmlFor="reflection">
              <Textarea id="reflection" rows={3} value={reflection} onChange={(e) => setReflection(e.target.value)} placeholder={w.reflectionPlaceholder} />
            </Field>
            <Field label={w.confidence}>
              <div className="flex gap-1.5" role="radiogroup" aria-label={w.confidence}>
                {[1, 2, 3, 4, 5].map((v) => (
                  <button
                    key={v}
                    type="button"
                    role="radio"
                    aria-checked={confidence === v}
                    onClick={() => setConfidence(v)}
                    className={cn(
                      "size-8 cursor-pointer rounded-md border text-sm",
                      confidence === v ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:bg-surface-2",
                    )}
                  >
                    {v}
                  </button>
                ))}
              </div>
            </Field>
            <Button variant="primary" className="self-start" onClick={submit} disabled={pending || !time.trim() || !space.trim()} data-testid="record-attempt">
              {w.record}
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
