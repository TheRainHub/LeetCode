"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { createPostingAction, updatePostingAction } from "@/app/jobs/actions";
import { Button } from "@/components/ui/button";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { type PostingInput, WORK_MODES } from "@/lib/jobs/model";

const EMPTY: PostingInput = {
  title: "",
  company: "",
  location: "",
  workMode: null,
  url: null,
  description: "",
  notes: "",
};

/** Create a posting (no `postingId`) or edit an existing one. */
export function PostingForm({
  postingId,
  initial,
  onDone,
}: {
  postingId?: number;
  initial?: PostingInput;
  onDone?: () => void;
}) {
  const { m } = useI18n();
  const F = m.jobs.form;
  const router = useRouter();
  const [v, setV] = useState<PostingInput>(initial ?? EMPTY);
  const [pending, start] = useTransition();
  const set = <K extends keyof PostingInput>(k: K, value: PostingInput[K]) =>
    setV((s) => ({ ...s, [k]: value }));

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    start(async () => {
      const payload = { ...v, url: v.url?.trim() ? v.url.trim() : null };
      const res = postingId
        ? await updatePostingAction({ id: postingId, posting: payload })
        : await createPostingAction(payload);
      if (!res.ok) {
        toast.error(res.error);
        return;
      }
      if (!postingId && res.data && "id" in res.data) router.push(`/jobs/${res.data.id}`);
      else router.refresh();
      onDone?.();
    });
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3" data-testid="posting-form">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={F.title} htmlFor="pf-title">
          <Input
            id="pf-title"
            required
            maxLength={200}
            value={v.title}
            onChange={(e) => set("title", e.target.value)}
          />
        </Field>
        <Field label={F.company} htmlFor="pf-company">
          <Input
            id="pf-company"
            required
            maxLength={200}
            value={v.company}
            onChange={(e) => set("company", e.target.value)}
          />
        </Field>
        <Field label={F.location} htmlFor="pf-location">
          <Input
            id="pf-location"
            maxLength={200}
            value={v.location}
            onChange={(e) => set("location", e.target.value)}
          />
        </Field>
        <Field label={F.workMode} htmlFor="pf-mode">
          <Select
            id="pf-mode"
            value={v.workMode ?? ""}
            onChange={(e) => set("workMode", (e.target.value || null) as PostingInput["workMode"])}
          >
            <option value="">{F.workModeAny}</option>
            {WORK_MODES.map((w) => (
              <option key={w} value={w}>
                {m.jobs.workMode[w]}
              </option>
            ))}
          </Select>
        </Field>
      </div>
      <Field label={F.url} htmlFor="pf-url">
        <Input
          id="pf-url"
          type="url"
          maxLength={2000}
          placeholder="https://"
          value={v.url ?? ""}
          onChange={(e) => set("url", e.target.value)}
        />
      </Field>
      <Field label={F.description} htmlFor="pf-description" hint={F.descriptionHelp}>
        <Textarea
          id="pf-description"
          rows={10}
          maxLength={40_000}
          value={v.description}
          onChange={(e) => set("description", e.target.value)}
        />
      </Field>
      <Field label={F.notes} htmlFor="pf-notes">
        <Textarea
          id="pf-notes"
          rows={3}
          maxLength={5000}
          value={v.notes}
          onChange={(e) => set("notes", e.target.value)}
        />
      </Field>
      <div className="flex gap-2">
        <Button type="submit" variant="primary" size="sm" disabled={pending} data-testid="posting-save">
          {postingId ? F.saveChanges : F.save}
        </Button>
        {onDone ? (
          <Button type="button" variant="ghost" size="sm" onClick={onDone}>
            {F.cancel}
          </Button>
        ) : null}
      </div>
    </form>
  );
}
