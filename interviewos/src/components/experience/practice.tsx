"use client";

import { MessageCircleQuestion, Sparkles, Timer } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { generateAiQuestionsAction, savePracticeAnswerAction } from "@/app/experience/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { formatDuration } from "@/lib/dates";
import type { GeneratedQuestion } from "@/lib/experience";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

type Q = { id: string; question: string; lookFor: string; needsField?: string; category?: string };

function PracticeBox({ projectId, question, onDone }: { projectId: number; question: Q; onDone: () => void }) {
  const { m } = useI18n();
  const P = m.experience.practice;
  const [answer, setAnswer] = useState("");
  const [score, setScore] = useState(3);
  const [elapsed, setElapsed] = useState(0);
  const started = useRef(0);
  const [pending, run] = useTransition();
  useEffect(() => {
    started.current = Date.now();
    const t = window.setInterval(() => setElapsed((Date.now() - started.current) / 1000), 1000);
    return () => window.clearInterval(t);
  }, []);
  return (
    <div className="mt-3 flex flex-col gap-2 rounded-md border border-border bg-surface-2 p-3">
      <p className="flex items-center justify-between text-xs text-muted-foreground">
        {P.title}
        <span className="flex items-center gap-1 tabular-nums">
          <Timer className="size-3.5" />
          {formatDuration(elapsed)}
        </span>
      </p>
      <Textarea rows={5} value={answer} onChange={(e) => setAnswer(e.target.value)} aria-label={P.answer} placeholder={P.answer} />
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-xs text-muted-foreground">{P.selfScore}</span>
        {[1, 2, 3, 4, 5].map((v) => (
          <button
            key={v}
            type="button"
            aria-pressed={score === v}
            onClick={() => setScore(v)}
            className={cn("size-7 cursor-pointer rounded-md border text-xs", score === v ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground")}
          >
            {v}
          </button>
        ))}
        <Button
          size="sm"
          variant="primary"
          className="ml-auto"
          disabled={pending || answer.trim().length < 10}
          onClick={() =>
            run(async () => {
              const res = await savePracticeAnswerAction({ projectId, question: question.question, answer, selfScore: score, durationSeconds: elapsed });
              if (!res.ok) return void toast.error(res.error);
              toast.success(P.saved);
              onDone();
            })
          }
        >
          {P.save}
        </Button>
      </div>
    </div>
  );
}

export function QuestionList({
  projectId,
  questions,
  aiEnabled,
  fieldLabels,
}: {
  projectId: number;
  questions: GeneratedQuestion[];
  aiEnabled: boolean;
  fieldLabels: Record<string, string>;
}) {
  const { m } = useI18n();
  const Qm = m.experience.questions;
  const [open, setOpen] = useState<string | null>(null);
  const [aiQs, setAiQs] = useState<Q[]>([]);
  const [pending, run] = useTransition();
  const all: Q[] = [...questions, ...aiQs];
  return (
    <div className="flex flex-col gap-2">
      {aiEnabled ? (
        <Button
          size="sm"
          className="self-start"
          disabled={pending}
          onClick={() =>
            run(async () => {
              const res = await generateAiQuestionsAction({ projectId });
              if (!res.ok) return void toast.error(res.error);
              setAiQs(res.data!.map((q, i) => ({ id: `ai-${Date.now()}-${i}`, question: q.question, lookFor: q.lookFor, category: "AI" })));
            })
          }
        >
          <Sparkles />
          {pending ? Qm.aiGenerating : Qm.ai}
        </Button>
      ) : null}
      <ul className="flex flex-col gap-2">
        {all.map((q) => (
          <li key={q.id} className="rounded-md border border-border bg-surface p-3">
            <div className="flex items-start gap-2">
              <MessageCircleQuestion className="mt-0.5 size-4 shrink-0 text-subtle-foreground" />
              <div className="min-w-0 flex-1">
                <p className="text-sm">{q.question}</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  <span className="text-subtle-foreground">{Qm.lookFor}: </span>
                  {q.lookFor}
                </p>
                <div className="mt-1.5 flex flex-wrap gap-1.5">
                  {q.category ? <Badge tone="outline">{q.category}</Badge> : null}
                  {q.needsField ? <Badge tone="warning">{Qm.needsField(fieldLabels[q.needsField] ?? q.needsField)}</Badge> : null}
                </div>
              </div>
              <Button size="sm" variant="ghost" onClick={() => setOpen(open === q.id ? null : q.id)}>
                {Qm.practice}
              </Button>
            </div>
            {open === q.id ? <PracticeBox projectId={projectId} question={q} onDone={() => setOpen(null)} /> : null}
          </li>
        ))}
      </ul>
    </div>
  );
}
