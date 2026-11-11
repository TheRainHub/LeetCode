"use client";

import { Eye, EyeOff, Loader2, Pause, Play, RotateCcw, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import { SD_PHASES, type SdSectionKey } from "@content/system-design";
import {
  reviewSdDesignAction,
  saveSdDraftAction,
  saveSdSelfAssessmentAction,
} from "@/app/practice/system-design/actions";
import { Markdown } from "@/components/content/markdown-client";
import { useStopwatch } from "@/components/practice/use-stopwatch";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox, Textarea } from "@/components/ui/input";
import type { SdQuestionDef } from "@/lib/content/defs";
import { useI18n } from "@/lib/i18n/client";
import { draftChars, SD_DRAFT_MIN_CHARS } from "@/lib/system-design/status";
import { cn } from "@/lib/utils";

type Guide = Pick<
  SdQuestionDef,
  | "clarify"
  | "functional"
  | "nonFunctional"
  | "estimates"
  | "components"
  | "deepDives"
  | "pitfalls"
  | "followUps"
>;
type SaveState = "idle" | "dirty" | "saving" | "saved" | "error";

const AUTOSAVE_MS = 1200;
const backupKey = (slug: string) => `interviewos:sd-draft:${slug}`;

/** Unsaved edits are mirrored to localStorage so a reload or crash before autosave loses nothing. */
function writeBackup(slug: string, sections: Record<string, string> | null) {
  try {
    if (sections) window.localStorage.setItem(backupKey(slug), JSON.stringify(sections));
    else window.localStorage.removeItem(backupKey(slug));
  } catch {
    // Storage unavailable (private mode, quota): autosave still works.
  }
}

function readBackup(slug: string): Record<string, string> | null {
  try {
    const raw = window.localStorage.getItem(backupKey(slug));
    const parsed: unknown = raw ? JSON.parse(raw) : null;
    if (!parsed || typeof parsed !== "object") return null;
    const entries = Object.entries(parsed as Record<string, unknown>).filter(
      (e): e is [string, string] => typeof e[1] === "string",
    );
    return Object.fromEntries(entries);
  } catch {
    return null;
  }
}
const mmss = (s: number) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, "0")}`;

/** Index of the phase the elapsed time falls into, for the suggested 45-minute pace. */
function phaseAt(elapsedSeconds: number): number {
  let acc = 0;
  for (let i = 0; i < SD_PHASES.length; i++) {
    acc += SD_PHASES[i]!.minutes * 60;
    if (elapsedSeconds < acc) return i;
  }
  return SD_PHASES.length - 1;
}

export function SdWorkspace({
  slug,
  rubric,
  initialSections,
  guide,
  aiEnabled,
}: {
  slug: string;
  rubric: string[];
  initialSections: Record<string, string>;
  guide: Guide;
  aiEnabled: boolean;
}) {
  const { m } = useI18n();
  const W = m.sd.ws;
  const router = useRouter();
  const timer = useStopwatch();
  const [sections, setSections] = useState<Record<string, string>>(initialSections);
  const [saveState, setSaveState] = useState<SaveState>(
    Object.keys(initialSections).length ? "saved" : "idle",
  );
  const [showGuide, setShowGuide] = useState(false);
  const [checks, setChecks] = useState<boolean[]>(() => rubric.map(() => false));
  const [result, setResult] = useState<{ kind: "self" | "ai"; score: number; feedback?: string } | null>(
    null,
  );
  const [pending, start] = useTransition();
  const saveTimer = useRef<number | null>(null);
  const pendingSave = useRef<Record<string, string> | null>(null);

  const persist = async (next: Record<string, string>) => {
    pendingSave.current = null;
    setSaveState("saving");
    const res = await saveSdDraftAction({ slug, sections: next });
    setSaveState(res.ok ? "saved" : "error");
    if (res.ok && !pendingSave.current) writeBackup(slug, null);
  };

  const onChange = (key: SdSectionKey, value: string) => {
    const next = { ...sections, [key]: value };
    setSections(next);
    setSaveState("dirty");
    if (!timer.running && timer.read() === 0) timer.start();
    pendingSave.current = next;
    writeBackup(slug, next);
    if (saveTimer.current) window.clearTimeout(saveTimer.current);
    saveTimer.current = window.setTimeout(() => void persist(next), AUTOSAVE_MS);
  };

  // Restore edits that never reached the server (e.g. the tab was closed within the autosave delay).
  useEffect(() => {
    const backup = readBackup(slug);
    if (!backup || JSON.stringify(backup) === JSON.stringify(initialSections)) {
      writeBackup(slug, null);
      return;
    }
    const t = window.setTimeout(() => {
      setSections(backup);
      setSaveState("dirty");
      pendingSave.current = backup;
      void persist(backup);
    }, 0);
    return () => window.clearTimeout(t);
    // Runs once per question; persist is stable enough for this one-off restore.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slug]);

  // Flush an unsaved edit when leaving the page.
  useEffect(
    () => () => {
      if (saveTimer.current) window.clearTimeout(saveTimer.current);
      if (pendingSave.current) void saveSdDraftAction({ slug, sections: pendingSave.current });
    },
    [slug],
  );

  const written = draftChars(sections);
  const current = phaseAt(timer.elapsed);
  const durationSeconds = () => Math.round(timer.read());

  const saveSelf = () =>
    start(async () => {
      const res = await saveSdSelfAssessmentAction({ slug, checks, durationSeconds: durationSeconds() });
      if (!res.ok || !res.data) {
        toast.error(res.ok ? "Error" : res.error);
        return;
      }
      setResult({ kind: "self", score: res.data.score });
      router.refresh();
    });

  const reviewWithAi = () =>
    start(async () => {
      if (pendingSave.current) await persist(pendingSave.current);
      const res = await reviewSdDesignAction({ slug, sections, durationSeconds: durationSeconds() });
      if (!res.ok || !res.data) {
        toast.error(res.ok ? "Error" : res.error);
        return;
      }
      setChecks(res.data.checks);
      setResult({ kind: "ai", score: res.data.score, feedback: res.data.feedback });
      router.refresh();
    });

  const list = (title: string, items: string[]) => (
    <div>
      <p className="text-muted-foreground mb-1 text-xs font-medium">{title}</p>
      <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm">
        {items.map((x) => (
          <li key={x}>{x}</li>
        ))}
      </ul>
    </div>
  );

  return (
    <div className="flex flex-col gap-4" data-testid="sd-workspace">
      <Card className="flex flex-wrap items-center gap-3 p-3">
        <span className="text-muted-foreground text-xs">{W.timer}</span>
        <span className="font-mono text-sm tabular-nums" data-testid="sd-timer">
          {mmss(timer.elapsed)} / 45:00
        </span>
        <Button size="sm" variant="ghost" onClick={timer.running ? timer.pause : timer.start}>
          {timer.running ? <Pause /> : <Play />}
          {timer.running ? W.pause : W.start}
        </Button>
        <Button size="sm" variant="ghost" onClick={timer.reset} aria-label={W.reset}>
          <RotateCcw />
        </Button>
        <span
          className={cn(
            "ml-auto text-[11px]",
            saveState === "error" ? "text-danger" : "text-subtle-foreground",
          )}
          data-testid="sd-save-state"
          aria-live="polite"
        >
          {saveState === "saving"
            ? W.saving
            : saveState === "saved"
              ? W.saved
              : saveState === "error"
                ? W.saveError
                : saveState === "dirty"
                  ? W.unsaved
                  : ""}
        </span>
        <ol className="flex w-full flex-wrap gap-1" aria-label={W.pace}>
          {SD_PHASES.map((p, i) => (
            <li
              key={p.key}
              className={cn(
                "rounded border px-1.5 py-0.5 text-[11px]",
                timer.elapsed > 0 && i === current
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted-foreground",
              )}
            >
              {W.phases[p.key]} · {p.minutes}′
            </li>
          ))}
        </ol>
      </Card>

      <div className="flex flex-col gap-3">
        {SD_PHASES.map((p) => (
          <label key={p.key} className="flex flex-col gap-1">
            <span className="text-sm font-medium">{W.phases[p.key]}</span>
            <Textarea
              rows={p.key === "highLevel" || p.key === "deepDives" ? 7 : 4}
              value={sections[p.key] ?? ""}
              onChange={(e) => onChange(p.key, e.target.value)}
              placeholder={W.placeholders[p.key]}
              data-testid={`sd-section-${p.key}`}
            />
          </label>
        ))}
      </div>

      <Card className="p-4" data-testid="sd-guide">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-semibold">{W.guide.title}</p>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setShowGuide((s) => !s)}
            data-testid="sd-guide-toggle"
          >
            {showGuide ? <EyeOff /> : <Eye />}
            {showGuide ? W.guide.hide : W.guide.reveal}
          </Button>
        </div>
        {showGuide ? (
          <div className="mt-3 grid gap-4 md:grid-cols-2">
            {list(W.guide.clarify, guide.clarify)}
            {list(W.guide.functional, guide.functional)}
            {list(W.guide.nonFunctional, guide.nonFunctional)}
            {list(W.guide.estimates, guide.estimates)}
            {list(W.guide.components, guide.components)}
            <div className="md:col-span-2">
              <p className="text-muted-foreground mb-1 text-xs font-medium">{W.guide.deepDives}</p>
              <ul className="flex flex-col gap-2 text-sm">
                {guide.deepDives.map((d) => (
                  <li key={d.title}>
                    <span className="font-medium">{d.title}.</span>{" "}
                    <span className="text-muted-foreground">{d.notes}</span>
                  </li>
                ))}
              </ul>
            </div>
            {list(W.guide.pitfalls, guide.pitfalls)}
            {list(W.guide.followUps, guide.followUps)}
          </div>
        ) : (
          <p className="text-muted-foreground mt-1 text-xs">{W.guide.hidden}</p>
        )}
      </Card>

      <Card className="p-4" data-testid="sd-assess">
        <p className="text-sm font-semibold">{W.assess.title}</p>
        <p className="text-muted-foreground mb-3 text-xs">{W.assess.help}</p>
        <ul className="flex flex-col gap-1.5">
          {rubric.map((r, i) => (
            <li key={r}>
              <label className="flex cursor-pointer items-start gap-2 text-sm">
                <Checkbox
                  className="mt-0.5"
                  checked={checks[i] ?? false}
                  onChange={(e) => setChecks((c) => c.map((v, j) => (j === i ? e.target.checked : v)))}
                />
                <span>{r}</span>
              </label>
            </li>
          ))}
        </ul>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <Badge tone="neutral">
            {Math.round((checks.filter(Boolean).length / Math.max(1, checks.length)) * 100)}%
          </Badge>
          <Button
            size="sm"
            variant="primary"
            onClick={saveSelf}
            disabled={pending || written < SD_DRAFT_MIN_CHARS}
            data-testid="sd-save-assessment"
          >
            {W.assess.save}
          </Button>
          {aiEnabled ? (
            <Button
              size="sm"
              onClick={reviewWithAi}
              disabled={pending || written < 200}
              title={written < 200 ? W.assess.tooShort : undefined}
            >
              {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
              {pending ? W.assess.aiReviewing : W.assess.aiReview}
            </Button>
          ) : (
            <span className="text-subtle-foreground text-[11px]">{W.assess.aiDisabled}</span>
          )}
        </div>
        {written < SD_DRAFT_MIN_CHARS ? (
          <p className="text-subtle-foreground mt-2 text-[11px]">{W.assess.tooShort}</p>
        ) : null}
        {result ? (
          <div className="border-border bg-surface-2 mt-3 rounded-md border p-3" data-testid="sd-result">
            <p className="text-sm font-medium">
              {result.kind === "ai"
                ? W.assess.aiResult(Math.round(result.score * 100))
                : W.assess.saved(Math.round(result.score * 100))}
            </p>
            {result.feedback ? (
              <Markdown compact className="mt-2">
                {result.feedback}
              </Markdown>
            ) : null}
          </div>
        ) : null}
      </Card>
    </div>
  );
}
