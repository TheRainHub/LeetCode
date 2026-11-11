"use client";

import { Pencil, Plus, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteStoryAction, saveStoryAction } from "@/app/experience/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Field, Input, Select, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

export interface Story {
  id: number | null;
  projectId: number | null;
  title: string;
  competency: string;
  situation: string;
  task: string;
  action: string;
  result: string;
  reflection: string;
}

const EMPTY: Story = {
  id: null,
  projectId: null,
  title: "",
  competency: "",
  situation: "",
  task: "",
  action: "",
  result: "",
  reflection: "",
};

export function StoryDialog({
  story,
  projects,
  defaultProjectId,
}: {
  story?: Story;
  projects: { id: number; title: string }[];
  defaultProjectId?: number;
}) {
  const { m } = useI18n();
  const S = m.experience.star;
  const [open, setOpen] = useState(false);
  const [v, setV] = useState<Story>(story ?? { ...EMPTY, projectId: defaultProjectId ?? null });
  const [pending, run] = useTransition();
  const set = <K extends keyof Story>(k: K, value: Story[K]) => setV((x) => ({ ...x, [k]: value }));
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {story ? (
          <Button size="icon-sm" variant="ghost" aria-label={S.edit}>
            <Pencil />
          </Button>
        ) : (
          <Button size="sm">
            <Plus />
            {S.add}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent title={story ? S.edit : S.add} wide>
        <div className="flex flex-col gap-3">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Field label={S.title} htmlFor="s-title" className="sm:col-span-2">
              <Input id="s-title" value={v.title} onChange={(e) => set("title", e.target.value)} />
            </Field>
            <Field label={S.project} htmlFor="s-project">
              <Select
                id="s-project"
                value={v.projectId ?? ""}
                onChange={(e) => set("projectId", e.target.value ? Number(e.target.value) : null)}
              >
                <option value="">{S.none}</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.title}
                  </option>
                ))}
              </Select>
            </Field>
          </div>
          <Field label={S.competency} htmlFor="s-comp">
            <Input id="s-comp" value={v.competency} onChange={(e) => set("competency", e.target.value)} />
          </Field>
          {(["situation", "task", "action", "result", "reflection"] as const).map((k) => (
            <Field key={k} label={S[k]} htmlFor={`s-${k}`}>
              <Textarea
                id={`s-${k}`}
                rows={k === "action" ? 4 : 2}
                value={v[k]}
                onChange={(e) => set(k, e.target.value)}
              />
            </Field>
          ))}
          <div className="flex gap-2">
            <Button
              variant="primary"
              disabled={pending || v.title.trim().length < 2 || v.competency.trim().length < 2}
              onClick={() =>
                run(async () => {
                  const res = await saveStoryAction(v);
                  if (!res.ok) return void toast.error(res.error);
                  toast.success(S.saved);
                  setOpen(false);
                  if (!story) setV({ ...EMPTY, projectId: defaultProjectId ?? null });
                })
              }
            >
              {m.common.actions.save}
            </Button>
            {story?.id ? (
              <Button
                variant="danger"
                disabled={pending}
                onClick={() =>
                  run(async () => {
                    if (!window.confirm(S.delete)) return;
                    const res = await deleteStoryAction({ id: story.id! });
                    if (!res.ok) return void toast.error(res.error);
                    setOpen(false);
                  })
                }
              >
                <Trash2 />
                {S.delete}
              </Button>
            ) : null}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
