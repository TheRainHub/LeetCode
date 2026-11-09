"use client";

import { BookCheck, ChevronDown } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { markLessonReadAction, saveLessonConfidenceAction, saveLessonNotesAction } from "@/app/learn/actions";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function MarkReadButton({ lessonId, read }: { lessonId: number; read: boolean }) {
  const { m } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Tooltip content={m.learn.lesson.readHelp}>
      <Button
        size="sm"
        variant={read ? "secondary" : "primary"}
        disabled={pending}
        data-testid="mark-read"
        onClick={() =>
          start(async () => {
            const res = await markLessonReadAction({ lessonId, read: !read });
            if (!res.ok) toast.error(res.error);
          })
        }
      >
        <BookCheck />
        {read ? m.learn.lesson.markedRead : m.learn.lesson.markRead}
      </Button>
    </Tooltip>
  );
}

export function ConfidencePicker({ lessonId, value }: { lessonId: number; value: number | null }) {
  const { m } = useI18n();
  const [pending, start] = useTransition();
  return (
    <div>
      <p className="mb-2 text-sm">{m.learn.lesson.confidencePrompt}</p>
      <div className="flex flex-wrap gap-1.5" role="radiogroup" aria-label={m.common.labels.confidence}>
        {m.learn.lesson.confidenceScale.map((label, i) => {
          const v = i + 1;
          return (
            <button
              key={v}
              type="button"
              role="radio"
              aria-checked={value === v}
              disabled={pending}
              onClick={() =>
                start(async () => {
                  const res = await saveLessonConfidenceAction({ lessonId, confidence: v });
                  if (!res.ok) toast.error(res.error);
                })
              }
              className={cn(
                "cursor-pointer rounded-md border px-2.5 py-1 text-xs transition-colors",
                value === v ? "border-primary bg-primary-soft text-primary" : "border-border text-muted-foreground hover:bg-surface-2",
              )}
            >
              {v} · {label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function NotesEditor({ lessonId, initial }: { lessonId: number; initial: string }) {
  const { m } = useI18n();
  const [value, setValue] = useState(initial);
  const [status, setStatus] = useState<"idle" | "saving" | "saved">("idle");
  const timer = useRef<number | null>(null);
  useEffect(() => () => (timer.current ? window.clearTimeout(timer.current) : undefined), []);
  return (
    <div>
      <Textarea
        value={value}
        rows={6}
        placeholder={m.learn.lesson.notesPlaceholder}
        aria-label={m.learn.lesson.notes}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          setStatus("saving");
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(async () => {
            const res = await saveLessonNotesAction({ lessonId, notes: next });
            setStatus(res.ok ? "saved" : "idle");
            if (!res.ok) toast.error(res.error);
          }, 700);
        }}
      />
      <p className="mt-1 h-4 text-[11px] text-subtle-foreground">
        {status === "saving" ? m.common.actions.saving : status === "saved" ? m.common.actions.saved : ""}
      </p>
    </div>
  );
}

export function RevealAnswer({ question, answer }: { question: string; answer: string }) {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  return (
    <li className="rounded-md border border-border bg-surface">
      <button
        type="button"
        className="flex w-full cursor-pointer items-start justify-between gap-3 px-3 py-2.5 text-left text-sm"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
      >
        <span>{question}</span>
        <span className="flex shrink-0 items-center gap-1 text-[11px] text-subtle-foreground">
          {open ? m.learn.lesson.hideKeyPoints : m.learn.lesson.showKeyPoints}
          <ChevronDown className={cn("size-3.5 transition-transform", open && "rotate-180")} />
        </span>
      </button>
      {open ? <p className="border-t border-border px-3 py-2.5 text-sm leading-relaxed text-muted-foreground">{answer}</p> : null}
    </li>
  );
}
