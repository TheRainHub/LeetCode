"use client";

import { CircleCheck } from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { finishReviewSessionAction, gradeCardAction } from "@/app/practice/review/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export interface ReviewCardData {
  scheduleId: number;
  prompt: string;
  answer: string;
  source: "lesson" | "interview" | "manual";
  topicTitle: string | null;
}

const GRADES = ["again", "hard", "good", "easy"] as const;

export function ReviewSession({ cards }: { cards: ReviewCardData[] }) {
  const { m } = useI18n();
  const R = m.review;
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [typed, setTyped] = useState("");
  const [results, setResults] = useState<{ grade: string; interval: number }[]>([]);
  const [pending, start] = useTransition();
  const shownAt = useRef<number>(0);
  const card = cards[index];
  const done = index >= cards.length;

  useEffect(() => {
    shownAt.current = Date.now();
  }, [index]);

  const grade = useCallback(
    (g: (typeof GRADES)[number]) =>
      start(async () => {
        if (!card) return;
        const res = await gradeCardAction({ scheduleId: card.scheduleId, grade: g, elapsedSeconds: (Date.now() - shownAt.current) / 1000 });
        if (!res.ok) return void toast.error(res.error);
        setResults((r) => [...r, { grade: g, interval: res.data!.intervalDays }]);
        setRevealed(false);
        setTyped("");
        const next = index + 1;
        setIndex(next);
        if (next >= cards.length) await finishReviewSessionAction();
      }),
    [card, cards.length, index],
  );

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.target as HTMLElement)?.tagName === "TEXTAREA" || done || pending) return;
      if (e.key === " " && !revealed) {
        e.preventDefault();
        setRevealed(true);
      } else if (revealed && ["1", "2", "3", "4"].includes(e.key)) {
        grade(GRADES[Number(e.key) - 1]!);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [revealed, done, pending, grade]);

  if (cards.length === 0) return <p className="text-sm text-muted-foreground">{R.empty}</p>;

  if (done) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-lg border border-border bg-surface p-8 text-center" data-testid="review-done">
        <CircleCheck className="size-6 text-success" />
        <p className="text-base font-semibold">{R.done}</p>
        <p className="text-sm text-muted-foreground">{R.doneSummary(results.length, results.filter((r) => r.grade === "again").length)}</p>
        <Button asChild variant="primary" size="sm">
          <Link href="/">{m.common.nav.dashboard}</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4" data-testid="review-session">
      <div className="flex items-center gap-3">
        <Progress value={(index / cards.length) * 100} />
        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{R.progress(index + 1, cards.length)}</span>
      </div>
      <div className="rounded-lg border border-border bg-surface p-6">
        <div className="mb-3 flex flex-wrap gap-1.5">
          <Badge tone="outline">{R.source[card!.source]}</Badge>
          {card!.topicTitle ? <Badge>{card!.topicTitle}</Badge> : null}
        </div>
        <p className="text-lg leading-relaxed font-medium">{card!.prompt}</p>
        {!revealed ? (
          <div className="mt-5 flex flex-col gap-3">
            <p className="text-xs text-muted-foreground">{R.recall}</p>
            <Textarea rows={3} value={typed} onChange={(e) => setTyped(e.target.value)} placeholder={R.yourAnswer} aria-label={R.yourAnswer} />
            <Button variant="primary" className="self-start" onClick={() => setRevealed(true)} data-testid="review-reveal">
              {R.reveal}
            </Button>
          </div>
        ) : (
          <div className="mt-5 border-t border-border pt-4">
            <p className="text-sm leading-relaxed whitespace-pre-wrap">{card!.answer}</p>
            {typed ? <p className="mt-3 text-xs text-muted-foreground italic">“{typed}”</p> : null}
            <div className="mt-5 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {GRADES.map((g, i) => (
                <button
                  key={g}
                  type="button"
                  disabled={pending}
                  onClick={() => grade(g)}
                  data-testid={`grade-${g}`}
                  className={cn(
                    "flex cursor-pointer flex-col items-start rounded-md border px-3 py-2 text-left transition-colors disabled:opacity-50",
                    g === "again" ? "border-danger/40 hover:bg-danger-soft" : g === "hard" ? "border-warning/40 hover:bg-warning-soft" : g === "good" ? "border-primary/40 hover:bg-primary-soft" : "border-success/40 hover:bg-success-soft",
                  )}
                >
                  <span className="text-sm font-medium">
                    <span className="mr-1.5 text-subtle-foreground">{i + 1}</span>
                    {R.grades[g]}
                  </span>
                  <span className="text-[11px] text-muted-foreground">{R.gradeHelp[g]}</span>
                </button>
              ))}
            </div>
          </div>
        )}
      </div>
      <p className="text-[11px] text-subtle-foreground">{R.shortcuts}</p>
    </div>
  );
}
