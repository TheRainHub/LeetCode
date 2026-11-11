"use client";

import { Check, X } from "lucide-react";
import { useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { submitQuizAction, type QuizFeedback } from "@/app/learn/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface QuizQuestion {
  id: number;
  prompt: string;
  options: string[];
}

export function Quiz({ lessonId, questions }: { lessonId: number; questions: QuizQuestion[] }) {
  const { m } = useI18n();
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [result, setResult] = useState<{
    feedback: QuizFeedback[];
    correct: number;
    total: number;
    passed: boolean;
  } | null>(null);
  const [pending, start] = useTransition();
  const startedAt = useRef<number>(0);

  const submit = () => {
    if (questions.some((q) => answers[q.id] === undefined)) {
      toast.error(m.learn.quiz.answerAll);
      return;
    }
    start(async () => {
      const res = await submitQuizAction({
        lessonId,
        answers: questions.map((q) => ({ exerciseId: q.id, selected: answers[q.id]! })),
        durationSeconds: startedAt.current ? (Date.now() - startedAt.current) / 1000 : 0,
      });
      if (res.ok && res.data) setResult(res.data);
      else if (!res.ok) toast.error(res.error);
    });
  };

  const reset = () => {
    setAnswers({});
    setResult(null);
    startedAt.current = Date.now();
  };

  return (
    <div className="flex flex-col gap-4" data-testid="quiz">
      {questions.map((q, qi) => {
        const fb = result?.feedback.find((f) => f.exerciseId === q.id);
        return (
          <fieldset key={q.id} className="border-border bg-surface rounded-lg border p-4">
            <legend className="sr-only">{q.prompt}</legend>
            <p className="mb-3 text-sm font-medium">
              <span className="text-subtle-foreground mr-2 tabular-nums">{qi + 1}.</span>
              {q.prompt}
            </p>
            <div className="flex flex-col gap-1.5">
              {q.options.map((opt, oi) => {
                const selected = answers[q.id] === oi;
                const isCorrectOpt = fb && fb.correctOption === oi;
                const isWrongPick = fb && selected && !fb.isCorrect;
                return (
                  <label
                    key={oi}
                    className={cn(
                      "flex cursor-pointer items-start gap-2.5 rounded-md border px-3 py-2 text-sm transition-colors",
                      selected ? "border-primary bg-primary-soft" : "border-border hover:bg-surface-2",
                      isCorrectOpt && "border-success bg-success-soft",
                      isWrongPick && "border-danger bg-danger-soft",
                      result && "cursor-default",
                    )}
                  >
                    <input
                      type="radio"
                      name={`q-${q.id}`}
                      className="mt-0.5 accent-[var(--primary)]"
                      checked={selected}
                      disabled={Boolean(result)}
                      onChange={() => {
                        if (!startedAt.current) startedAt.current = Date.now();
                        setAnswers((a) => ({ ...a, [q.id]: oi }));
                      }}
                    />
                    <span className="flex-1">{opt}</span>
                    {isCorrectOpt ? <Check className="text-success size-4" /> : null}
                    {isWrongPick ? <X className="text-danger size-4" /> : null}
                  </label>
                );
              })}
            </div>
            {fb ? (
              <p className="text-muted-foreground mt-3 text-xs leading-relaxed">
                <Badge tone={fb.isCorrect ? "success" : "danger"} className="mr-2">
                  {fb.isCorrect ? m.learn.quiz.correct : m.learn.quiz.incorrect}
                </Badge>
                {fb.explanation}
              </p>
            ) : null}
          </fieldset>
        );
      })}
      <div className="flex items-center gap-3">
        {result ? (
          <>
            <Badge tone={result.passed ? "success" : "warning"} className="text-xs">
              {m.learn.quiz.score(result.correct, result.total)}
            </Badge>
            <span className="text-muted-foreground text-xs">
              {result.passed ? m.learn.quiz.passed : m.learn.quiz.failed}
            </span>
            <Button size="sm" variant="ghost" onClick={reset}>
              {m.learn.quiz.retry}
            </Button>
          </>
        ) : (
          <Button variant="primary" size="sm" onClick={submit} disabled={pending} data-testid="quiz-submit">
            {m.learn.quiz.submit}
          </Button>
        )}
      </div>
    </div>
  );
}
