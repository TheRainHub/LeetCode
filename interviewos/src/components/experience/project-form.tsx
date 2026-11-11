"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import { saveProjectAction } from "@/app/experience/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

const LONG_FIELDS = [
  "problem",
  "context",
  "responsibility",
  "architecture",
  "decisions",
  "tradeoffs",
  "challenges",
  "result",
  "lessonsLearned",
] as const;

export interface ProjectFormValue {
  id: number;
  title: string;
  organization: string;
  period: string;
  techStack: string[];
  problem: string;
  context: string;
  responsibility: string;
  architecture: string;
  decisions: string;
  tradeoffs: string;
  challenges: string;
  result: string;
  lessonsLearned: string;
  needsReview: boolean;
}

export function ProjectForm({ project }: { project: ProjectFormValue }) {
  const { m } = useI18n();
  const E = m.experience;
  const [v, setV] = useState(project);
  const [stack, setStack] = useState(project.techStack.join(", "));
  const [verified, setVerified] = useState(!project.needsReview);
  const [pending, run] = useTransition();
  const set = (k: keyof ProjectFormValue, value: string) => setV((x) => ({ ...x, [k]: value }));

  return (
    <form
      className="flex flex-col gap-4"
      onSubmit={(e) => {
        e.preventDefault();
        run(async () => {
          const res = await saveProjectAction({
            ...v,
            techStack: stack
              .split(",")
              .map((s) => s.trim())
              .filter(Boolean),
            verified,
          });
          if (res.ok) toast.success(E.saved);
          else toast.error(res.error);
        });
      }}
    >
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <Field label={E.fields.title} htmlFor="p-title">
          <Input id="p-title" value={v.title} onChange={(e) => set("title", e.target.value)} />
        </Field>
        <Field label={E.fields.organization} htmlFor="p-org">
          <Input id="p-org" value={v.organization} onChange={(e) => set("organization", e.target.value)} />
        </Field>
        <Field label={E.fields.period} htmlFor="p-period">
          <Input id="p-period" value={v.period} onChange={(e) => set("period", e.target.value)} />
        </Field>
      </div>
      <Field label={E.fields.techStack} htmlFor="p-stack">
        <Input id="p-stack" value={stack} onChange={(e) => setStack(e.target.value)} />
      </Field>
      {LONG_FIELDS.map((f) => (
        <Field
          key={f}
          label={E.fields[f]}
          htmlFor={`p-${f}`}
          hint={f === "responsibility" ? E.hints.responsibility : f === "result" ? E.hints.result : undefined}
        >
          <Textarea id={`p-${f}`} rows={3} value={v[f]} onChange={(e) => set(f, e.target.value)} />
        </Field>
      ))}
      <label className="flex items-center gap-2 text-sm">
        <Checkbox checked={verified} onChange={(e) => setVerified(e.target.checked)} />
        {E.markVerified}
      </label>
      <Button
        type="submit"
        variant="primary"
        className="self-start"
        disabled={pending}
        data-testid="save-project"
      >
        {E.save}
      </Button>
    </form>
  );
}
