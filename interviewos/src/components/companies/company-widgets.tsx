"use client";

import { CalendarPlus, Pencil, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addChecklistItemAction,
  addInterviewDateAction,
  createApplicationAction,
  deleteChecklistItemAction,
  saveCompanyNotesAction,
  setFocusWeightAction,
  toggleChecklistItemAction,
  updateApplicationStageAction,
  updateCompanyAction,
} from "@/app/companies/actions";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Checkbox, Field, Input, Select, Textarea } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

const STAGES = ["applied", "screening", "technical", "final", "offer", "rejected"] as const;

export function WeightSelect({ companyId, topicId, weight }: { companyId: number; topicId: number; weight: number }) {
  const { m } = useI18n();
  const [pending, run] = useTransition();
  return (
    <Select
      className="h-7 w-24 text-xs"
      value={weight}
      disabled={pending}
      aria-label={m.companies.focus.weight}
      onChange={(e) =>
        run(async () => {
          const res = await setFocusWeightAction({ companyId, topicId, weight: Number(e.target.value) });
          if (!res.ok) toast.error(res.error);
        })
      }
    >
      <option value={3}>3 · core</option>
      <option value={2}>2 · important</option>
      <option value={1}>1 · useful</option>
      <option value={0}>0 · {m.companies.focus.excluded}</option>
    </Select>
  );
}

export function AddFocusTopic({ companyId, options }: { companyId: number; options: { id: number; title: string }[] }) {
  const { m } = useI18n();
  const [topic, setTopic] = useState("");
  const [pending, run] = useTransition();
  return (
    <div className="flex gap-2">
      <Select value={topic} onChange={(e) => setTopic(e.target.value)} aria-label={m.companies.focus.add} className="max-w-72">
        <option value="">{m.companies.focus.add}…</option>
        {options.map((o) => (
          <option key={o.id} value={o.id}>
            {o.title}
          </option>
        ))}
      </Select>
      <Button
        size="sm"
        disabled={!topic || pending}
        onClick={() =>
          run(async () => {
            const res = await setFocusWeightAction({ companyId, topicId: Number(topic), weight: 2 });
            if (res.ok) setTopic("");
            else toast.error(res.error);
          })
        }
      >
        <Plus />
      </Button>
    </div>
  );
}

export function Checklist({ companyId, items }: { companyId: number; items: { id: number; text: string; done: boolean }[] }) {
  const { m } = useI18n();
  const [text, setText] = useState("");
  const [pending, run] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      <ul className="flex flex-col gap-1">
        {items.map((i) => (
          <li key={i.id} className="group flex items-start gap-2 text-sm">
            <Checkbox className="mt-0.5" checked={i.done} aria-label={i.text} onChange={(e) => run(async () => void (await toggleChecklistItemAction({ id: i.id, done: e.target.checked })))} />
            <span className={cn("flex-1", i.done && "text-muted-foreground line-through")}>{i.text}</span>
            <button type="button" className="opacity-0 group-hover:opacity-100" aria-label={m.common.actions.delete} onClick={() => run(async () => void (await deleteChecklistItemAction({ id: i.id })))}>
              <Trash2 className="size-3.5 text-subtle-foreground hover:text-danger" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          run(async () => {
            const res = await addChecklistItemAction({ companyId, text });
            if (res.ok) setText("");
            else toast.error(res.error);
          });
        }}
      >
        <Input value={text} onChange={(e) => setText(e.target.value)} placeholder={m.companies.checklist.placeholder} aria-label={m.companies.checklist.add} />
        <Button type="submit" size="sm" disabled={pending || text.trim().length < 2}>
          <Plus />
        </Button>
      </form>
    </div>
  );
}

export function CompanyNotes({ companyId, initial }: { companyId: number; initial: string }) {
  const { m } = useI18n();
  const [value, setValue] = useState(initial);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | null>(null);
  useEffect(() => () => (timer.current ? window.clearTimeout(timer.current) : undefined), []);
  return (
    <div>
      <Textarea
        rows={6}
        value={value}
        placeholder={m.companies.notes.placeholder}
        aria-label={m.companies.notes.title}
        onChange={(e) => {
          const next = e.target.value;
          setValue(next);
          setSaved(false);
          if (timer.current) window.clearTimeout(timer.current);
          timer.current = window.setTimeout(async () => {
            const res = await saveCompanyNotesAction({ companyId, notes: next });
            if (res.ok) setSaved(true);
            else toast.error(res.error);
          }, 700);
        }}
      />
      <p className="mt-1 h-4 text-[11px] text-subtle-foreground">{saved ? m.common.actions.saved : ""}</p>
    </div>
  );
}

export function Pipeline({
  companyId,
  companyName,
  defaultRole,
  today,
  application,
}: {
  companyId: number;
  companyName: string;
  defaultRole: string;
  today: string;
  application: { id: number; role: string; stage: (typeof STAGES)[number]; events: { stage: (typeof STAGES)[number]; occurredOn: string; note: string }[] } | null;
}) {
  const { m } = useI18n();
  const P = m.companies.pipeline;
  const [role, setRole] = useState(defaultRole);
  const [stage, setStage] = useState<(typeof STAGES)[number]>(application?.stage ?? "applied");
  const [date, setDate] = useState(today);
  const [note, setNote] = useState("");
  const [ivDate, setIvDate] = useState("");
  const [pending, run] = useTransition();

  return (
    <div className="flex flex-col gap-4">
      <ol className="flex flex-wrap items-center gap-1" aria-label={P.title}>
        {STAGES.map((s, i) => {
          const reached = application && (STAGES.indexOf(application.stage) >= i || application.events.some((e) => e.stage === s));
          const current = application?.stage === s;
          return (
            <li key={s} className="flex items-center gap-1">
              <span
                className={cn(
                  "rounded-md border px-2 py-1 text-[11px]",
                  current ? (s === "rejected" ? "border-danger bg-danger-soft text-danger" : s === "offer" ? "border-success bg-success-soft text-success" : "border-primary bg-primary-soft text-primary") : reached ? "border-border text-foreground" : "border-border text-subtle-foreground",
                )}
                aria-current={current ? "step" : undefined}
              >
                {P.stages[s]}
              </span>
              {i < STAGES.length - 1 ? <span className="text-subtle-foreground">→</span> : null}
            </li>
          );
        })}
      </ol>
      <p className="text-[11px] text-subtle-foreground">{P.noFakeDates}</p>

      {!application ? (
        <div className="flex flex-wrap items-end gap-2">
          <Field label={P.role} htmlFor="app-role">
            <Input id="app-role" value={role} onChange={(e) => setRole(e.target.value)} className="w-72" />
          </Field>
          <Field label={P.date} htmlFor="app-date">
            <Input id="app-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          </Field>
          <Button
            size="sm"
            variant="primary"
            disabled={pending || role.trim().length < 2}
            onClick={() =>
              run(async () => {
                const res = await createApplicationAction({ companyId, role, date, note: "" });
                if (!res.ok) toast.error(res.error);
              })
            }
          >
            {P.create}
          </Button>
        </div>
      ) : (
        <>
          <div className="flex flex-wrap items-end gap-2">
            <Field label={m.companies.stage} htmlFor="app-stage">
              <Select id="app-stage" value={stage} onChange={(e) => setStage(e.target.value as (typeof STAGES)[number])}>
                {STAGES.map((s) => (
                  <option key={s} value={s}>
                    {P.stages[s]}
                  </option>
                ))}
              </Select>
            </Field>
            <Field label={P.date} htmlFor="app-stage-date">
              <Input id="app-stage-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </Field>
            <Field label={P.note} htmlFor="app-note" className="min-w-48 flex-1">
              <Input id="app-note" value={note} onChange={(e) => setNote(e.target.value)} />
            </Field>
            <Button
              size="sm"
              variant="primary"
              disabled={pending}
              onClick={() =>
                run(async () => {
                  const res = await updateApplicationStageAction({ applicationId: application.id, stage, date, note });
                  if (res.ok) setNote("");
                  else toast.error(res.error);
                })
              }
            >
              {P.update}
            </Button>
          </div>
          {application.events.length ? (
            <div>
              <p className="mb-1 text-[11px] font-medium text-muted-foreground">{P.history}</p>
              <ul className="flex flex-col gap-1 text-xs">
                {application.events.map((e, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="w-24 shrink-0 tabular-nums text-subtle-foreground">{e.occurredOn}</span>
                    <span className="font-medium">{P.stages[e.stage]}</span>
                    {e.note ? <span className="text-muted-foreground">— {e.note}</span> : null}
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </>
      )}
      <div className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
        <Field label={P.addInterview} htmlFor="iv-date">
          <Input id="iv-date" type="date" value={ivDate} onChange={(e) => setIvDate(e.target.value)} />
        </Field>
        <Button
          size="sm"
          disabled={pending || !ivDate}
          onClick={() =>
            run(async () => {
              const res = await addInterviewDateAction({ companyId, title: P.interviewTitle(companyName), date: ivDate, notes: "" });
              if (res.ok) setIvDate("");
              else toast.error(res.error);
            })
          }
        >
          <CalendarPlus />
          {m.common.actions.add}
        </Button>
      </div>
    </div>
  );
}

export function EditCompanyDialog({ companyId, role, overview, prepNotes }: { companyId: number; role: string; overview: string; prepNotes: string }) {
  const { m } = useI18n();
  const E = m.companies.edit;
  const [open, setOpen] = useState(false);
  const [r, setR] = useState(role);
  const [o, setO] = useState(overview);
  const [p, setP] = useState(prepNotes);
  const [pending, run] = useTransition();
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Pencil />
          {E.button}
        </Button>
      </DialogTrigger>
      <DialogContent title={E.title} wide>
        <div className="flex flex-col gap-3">
          <Field label={E.role} htmlFor="c-role">
            <Input id="c-role" value={r} onChange={(e) => setR(e.target.value)} />
          </Field>
          <Field label={E.overview} htmlFor="c-overview">
            <Textarea id="c-overview" rows={10} value={o} onChange={(e) => setO(e.target.value)} className="font-mono text-xs" />
          </Field>
          <Field label={E.prepNotes} htmlFor="c-prep">
            <Textarea id="c-prep" rows={5} value={p} onChange={(e) => setP(e.target.value)} className="font-mono text-xs" />
          </Field>
          <Button
            variant="primary"
            className="self-start"
            disabled={pending}
            onClick={() =>
              run(async () => {
                const res = await updateCompanyAction({ companyId, role: r, overview: o, prepNotes: p });
                if (!res.ok) return void toast.error(res.error);
                toast.success(E.saved);
                setOpen(false);
              })
            }
          >
            {m.common.actions.save}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
