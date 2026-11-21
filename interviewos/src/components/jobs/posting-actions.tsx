"use client";

import { Loader2, Pencil, Play, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  analyzePostingAction,
  deletePostingAction,
  fetchPostingTextAction,
  startJobInterviewAction,
} from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Select } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import type { PostingInput } from "@/lib/jobs/model";
import { PostingForm } from "./posting-form";

export function AnalyzeButton({
  id,
  rerun,
  disabledReason,
}: {
  id: number;
  rerun: boolean;
  disabledReason: string | null;
}) {
  const { m } = useI18n();
  const A = m.jobs.analysis;
  const router = useRouter();
  const [research, setResearch] = useState(false);
  const [pending, start] = useTransition();
  const run = () =>
    start(async () => {
      const res = await analyzePostingAction({ id, research });
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      router.refresh();
    });
  return (
    <div className="flex flex-col gap-2" data-testid="analyze">
      <label className="flex items-start gap-2 text-xs">
        <Checkbox
          className="mt-0.5"
          checked={research}
          onChange={(e) => setResearch(e.target.checked)}
          disabled={pending}
        />
        <span>
          {A.research}
          <span className="text-subtle-foreground block text-[11px]">{A.researchHelp}</span>
        </span>
      </label>
      <div className="flex flex-wrap items-center gap-2">
        <Button
          size="sm"
          variant={rerun ? "secondary" : "primary"}
          onClick={run}
          disabled={pending || Boolean(disabledReason)}
          title={disabledReason ?? undefined}
          data-testid="analyze-run"
        >
          {pending ? <Loader2 className="animate-spin" /> : <Sparkles />}
          {pending ? A.running : rerun ? A.rerun : A.run}
        </Button>
        {disabledReason ? <span className="text-subtle-foreground text-[11px]">{disabledReason}</span> : null}
      </div>
    </div>
  );
}

export function FetchTextButton({ id }: { id: number }) {
  const { m } = useI18n();
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      data-testid="fetch-text"
      onClick={() =>
        start(async () => {
          const res = await fetchPostingTextAction({ id });
          if (!res.ok) toast.error(res.error);
          router.refresh();
        })
      }
    >
      {pending ? <Loader2 className="animate-spin" /> : null}
      {pending ? m.jobs.posting.fetching : m.jobs.posting.fetchText}
    </Button>
  );
}

export function EditPosting({ id, initial }: { id: number; initial: PostingInput }) {
  const { m } = useI18n();
  const [open, setOpen] = useState(false);
  return open ? (
    <PostingForm postingId={id} initial={initial} onDone={() => setOpen(false)} />
  ) : (
    <Button
      size="sm"
      variant="ghost"
      onClick={() => setOpen(true)}
      className="self-start"
      data-testid="posting-edit"
    >
      <Pencil />
      {m.jobs.form.edit}
    </Button>
  );
}

const TYPES = ["algorithms", "backend", "fullstack", "system_design", "behavioral"] as const;

export function StartJobInterview({ id, enabled }: { id: number; enabled: boolean }) {
  const { m } = useI18n();
  const I = m.jobs.interview;
  const [type, setType] = useState<(typeof TYPES)[number]>("backend");
  const [pending, start] = useTransition();
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select
        className="w-40"
        value={type}
        onChange={(e) => setType(e.target.value as (typeof TYPES)[number])}
        aria-label={I.type}
      >
        {TYPES.map((t) => (
          <option key={t} value={t}>
            {I.types[t]}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        variant="primary"
        disabled={!enabled || pending}
        data-testid="job-interview-start"
        onClick={() =>
          start(async () => {
            const res = await startJobInterviewAction({ id, type });
            if (res && !res.ok) toast.error(res.error);
          })
        }
      >
        {pending ? <Loader2 className="animate-spin" /> : <Play />}
        {I.start}
      </Button>
    </div>
  );
}

export function DeletePosting({ id }: { id: number }) {
  const { m } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="ghost"
      className="text-danger self-start"
      disabled={pending}
      onClick={() => {
        if (!window.confirm(m.jobs.posting.deleteConfirm)) return;
        start(async () => {
          const res = await deletePostingAction({ id });
          if (res && !res.ok) toast.error(res.error);
        });
      }}
    >
      <Trash2 />
      {m.jobs.posting.delete}
    </Button>
  );
}
