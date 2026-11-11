"use client";

import { CalendarOff, CalendarPlus, Plus, RefreshCw, Trash2 } from "lucide-react";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  addEventAction,
  addObjectiveAction,
  deleteEventAction,
  deleteObjectiveAction,
  generatePlanAction,
  markDayUnavailableAction,
  moveTaskAction,
  rescheduleAction,
  toggleObjectiveAction,
  updateScheduleSettingsAction,
} from "@/app/schedule/actions";
import { Button } from "@/components/ui/button";
import { Checkbox, Field, Input, Select } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/client";
import { cn } from "@/lib/utils";

export function CreatePlanForm({
  templateKey,
  defaultStart,
  regenerate,
}: {
  templateKey: string;
  defaultStart: string;
  regenerate?: boolean;
}) {
  const { m } = useI18n();
  const C = m.schedule.create;
  const [start, setStart] = useState(defaultStart);
  const [pending, run] = useTransition();
  return (
    <div className="flex flex-wrap items-end gap-3">
      <Field label={C.startDate} htmlFor="plan-start">
        <Input
          id="plan-start"
          type="date"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          className="w-44"
        />
      </Field>
      <Button
        variant={regenerate ? "secondary" : "primary"}
        disabled={pending || !start}
        data-testid="generate-plan"
        onClick={() =>
          run(async () => {
            if (regenerate && !window.confirm(C.regenerateWarning)) return;
            const res = await generatePlanAction({ templateKey, startDate: start });
            if (!res.ok) toast.error(res.error);
          })
        }
      >
        <CalendarPlus />
        {regenerate ? C.regenerate : C.generate}
      </Button>
    </div>
  );
}

export function CapacitySettingsForm({
  budget,
  restWeekdays,
  prioritizeUniversity,
}: {
  budget: number;
  restWeekdays: number[];
  prioritizeUniversity: boolean;
}) {
  const { m } = useI18n();
  const S = m.schedule.settings;
  const [b, setB] = useState(budget);
  const [rest, setRest] = useState<number[]>(restWeekdays);
  const [uni, setUni] = useState(prioritizeUniversity);
  const [pending, run] = useTransition();
  return (
    <div className="flex flex-col gap-4">
      <Field label={S.budget} htmlFor="budget">
        <Input
          id="budget"
          type="number"
          min={10}
          max={480}
          step={5}
          value={b}
          onChange={(e) => setB(Number(e.target.value) || 0)}
          className="w-32"
        />
      </Field>
      <Field label={S.restDays}>
        <div className="flex flex-wrap gap-1">
          {[1, 2, 3, 4, 5, 6, 0].map((d) => (
            <button
              key={d}
              type="button"
              aria-pressed={rest.includes(d)}
              onClick={() => setRest((r) => (r.includes(d) ? r.filter((x) => x !== d) : [...r, d]))}
              className={cn(
                "h-7 w-10 cursor-pointer rounded-md border text-xs",
                rest.includes(d)
                  ? "border-primary bg-primary-soft text-primary"
                  : "border-border text-muted-foreground hover:bg-surface-2",
              )}
            >
              {m.schedule.weekdays[d]}
            </button>
          ))}
        </div>
      </Field>
      <label className="flex items-start gap-3">
        <Switch checked={uni} onCheckedChange={setUni} aria-label={S.prioritizeUniversity} />
        <span>
          <span className="block text-sm">{S.prioritizeUniversity}</span>
          <span className="text-muted-foreground block text-xs">{S.prioritizeHelp}</span>
        </span>
      </label>
      <Button
        className="self-start"
        size="sm"
        variant="primary"
        disabled={pending}
        onClick={() =>
          run(async () => {
            const res = await updateScheduleSettingsAction({
              dailyBudgetMinutes: b,
              restWeekdays: rest,
              prioritizeUniversity: uni,
            });
            if (res.ok) toast.success(S.saved(res.data?.moved ?? 0));
            else toast.error(res.error);
          })
        }
      >
        {S.save}
      </Button>
    </div>
  );
}

export function DayActions({ date }: { date: string }) {
  const { m } = useI18n();
  const [pending, run] = useTransition();
  return (
    <Tooltip content={m.dashboard.plan.markUnavailableHelp}>
      <Button
        size="icon-sm"
        variant="ghost"
        aria-label={m.schedule.days.markUnavailable}
        disabled={pending}
        onClick={() =>
          run(async () => {
            const res = await markDayUnavailableAction({ date });
            if (res.ok) toast.success(m.dashboard.plan.unavailableDone(res.data?.moved ?? 0));
            else toast.error(res.error);
          })
        }
      >
        <CalendarOff />
      </Button>
    </Tooltip>
  );
}

export function MoveTask({ taskId, date }: { taskId: number; date: string }) {
  const { m } = useI18n();
  const [pending, run] = useTransition();
  return (
    <input
      type="date"
      aria-label={m.schedule.days.move}
      title={m.schedule.days.move}
      defaultValue={date}
      disabled={pending}
      className="border-border bg-surface-2 text-muted-foreground h-6 w-[7.5rem] rounded border px-1 text-[11px]"
      onChange={(e) => {
        const value = e.target.value;
        if (!value || value === date) return;
        run(async () => {
          const res = await moveTaskAction({ taskId, date: value });
          if (res.ok) toast.success(m.schedule.days.moved);
          else toast.error(res.error);
        });
      }}
    />
  );
}

export function PullForwardButton() {
  const { m } = useI18n();
  const [pending, run] = useTransition();
  return (
    <Tooltip content={m.schedule.days.pullForwardHelp}>
      <Button
        size="sm"
        variant="ghost"
        disabled={pending}
        onClick={() =>
          run(async () => {
            const res = await rescheduleAction({ pullForward: true });
            if (res.ok) toast.success(m.schedule.days.rescheduled(res.data?.moved ?? 0));
            else toast.error(res.error);
          })
        }
      >
        <RefreshCw />
        {m.schedule.days.pullForward}
      </Button>
    </Tooltip>
  );
}

export function AddEventForm({
  companies,
  today,
}: {
  companies: { slug: string; name: string }[];
  today: string;
}) {
  const { m } = useI18n();
  const E = m.schedule.events;
  const [kind, setKind] = useState<"university" | "interview" | "unavailable" | "other">("university");
  const [title, setTitle] = useState("");
  const [date, setDate] = useState(today);
  const [light, setLight] = useState(2);
  const [company, setCompany] = useState("");
  const [pending, run] = useTransition();
  return (
    <div className="flex flex-col gap-2.5">
      <div className="grid grid-cols-2 gap-2">
        <Field label={E.kind} htmlFor="ev-kind">
          <Select id="ev-kind" value={kind} onChange={(e) => setKind(e.target.value as typeof kind)}>
            {(["university", "interview", "unavailable", "other"] as const).map((k) => (
              <option key={k} value={k}>
                {E.kinds[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={E.date} htmlFor="ev-date">
          <Input id="ev-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
      </div>
      <Field label={E.name} htmlFor="ev-title">
        <Input id="ev-title" value={title} onChange={(e) => setTitle(e.target.value)} />
      </Field>
      {kind === "university" ? (
        <Field label={E.lightDays} htmlFor="ev-light">
          <Input
            id="ev-light"
            type="number"
            min={0}
            max={14}
            value={light}
            onChange={(e) => setLight(Number(e.target.value) || 0)}
            className="w-24"
          />
        </Field>
      ) : null}
      {kind === "interview" ? (
        <Field label={E.company} htmlFor="ev-company">
          <Select id="ev-company" value={company} onChange={(e) => setCompany(e.target.value)}>
            <option value="">—</option>
            {companies.map((c) => (
              <option key={c.slug} value={c.slug}>
                {c.name}
              </option>
            ))}
          </Select>
        </Field>
      ) : null}
      <Button
        size="sm"
        variant="primary"
        className="self-start"
        disabled={pending || !title.trim() || !date}
        onClick={() =>
          run(async () => {
            const res = await addEventAction({
              kind,
              title,
              date,
              lightDaysBefore: light,
              companySlug: company || undefined,
              notes: "",
            });
            if (!res.ok) return void toast.error(res.error);
            toast.success(E.added);
            setTitle("");
          })
        }
      >
        <Plus />
        {E.add}
      </Button>
    </div>
  );
}

export function DeleteEventButton({ id }: { id: number }) {
  const { m } = useI18n();
  const [pending, run] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={m.common.actions.delete}
      className="text-subtle-foreground hover:text-danger"
      onClick={() =>
        run(async () => {
          const res = await deleteEventAction({ id });
          if (!res.ok) toast.error(res.error);
        })
      }
    >
      <Trash2 className="size-3.5" />
    </button>
  );
}

export function Objectives({
  weekStart,
  items,
}: {
  weekStart: string;
  items: { id: number; text: string; done: boolean }[];
}) {
  const { m } = useI18n();
  const O = m.schedule.objectives;
  const [text, setText] = useState("");
  const [pending, run] = useTransition();
  return (
    <div className="flex flex-col gap-2">
      {items.length === 0 ? <p className="text-muted-foreground text-xs">{O.empty}</p> : null}
      <ul className="flex flex-col gap-1">
        {items.map((o) => (
          <li key={o.id} className="group flex items-center gap-2 text-sm">
            <Checkbox
              checked={o.done}
              onChange={(e) =>
                run(async () => void (await toggleObjectiveAction({ id: o.id, done: e.target.checked })))
              }
              aria-label={o.text}
            />
            <span className={cn("flex-1", o.done && "text-muted-foreground line-through")}>{o.text}</span>
            <button
              type="button"
              className="opacity-0 group-hover:opacity-100"
              aria-label={m.common.actions.delete}
              onClick={() => run(async () => void (await deleteObjectiveAction({ id: o.id })))}
            >
              <Trash2 className="text-subtle-foreground hover:text-danger size-3.5" />
            </button>
          </li>
        ))}
      </ul>
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (!text.trim()) return;
          run(async () => {
            const res = await addObjectiveAction({ weekStart, text });
            if (res.ok) setText("");
            else toast.error(res.error);
          });
        }}
      >
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={O.placeholder}
          aria-label={O.title}
        />
        <Button type="submit" size="sm" disabled={pending || !text.trim()}>
          <Plus />
        </Button>
      </form>
    </div>
  );
}
