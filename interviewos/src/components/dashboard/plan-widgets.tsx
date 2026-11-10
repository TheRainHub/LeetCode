"use client";

import { CalendarOff, Check, ExternalLink, TriangleAlert } from "lucide-react";
import Link from "next/link";
import { useTransition } from "react";
import { toast } from "sonner";
import { markTodayUnavailableAction, setTaskStatusAction } from "@/app/schedule/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tooltip } from "@/components/ui/tooltip";
import { useI18n } from "@/lib/i18n/client";
import { taskHref, type TaskKind } from "@/lib/tasks";
import { cn } from "@/lib/utils";

export interface PlanTask {
  id: number;
  kind: string;
  title: string;
  refSlug: string | null;
  minutes: number;
  status: "todo" | "done" | "skipped";
  overCapacity: boolean;
  timesMoved: number;
  sessionTitle: string;
}

export function TaskRow({ task, showSession = true }: { task: PlanTask; showSession?: boolean }) {
  const { m } = useI18n();
  const [pending, start] = useTransition();
  const done = task.status === "done";
  const toggle = () =>
    start(async () => {
      const res = await setTaskStatusAction({ taskId: task.id, status: done ? "todo" : "done" });
      if (!res.ok) toast.error(res.error);
    });
  return (
    <li className={cn("group flex items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-2", pending && "opacity-60")}>
      <button
        type="button"
        onClick={toggle}
        disabled={pending}
        aria-label={done ? m.common.actions.undo : m.common.actions.markDone}
        aria-pressed={done}
        className={cn(
          "flex size-4 shrink-0 cursor-pointer items-center justify-center rounded border transition-colors",
          done ? "border-success bg-success text-white" : "border-border-strong hover:border-primary",
        )}
      >
        {done ? <Check className="size-3" /> : null}
      </button>
      <div className="min-w-0 flex-1">
        <Link
          href={taskHref(task.kind as TaskKind, task.refSlug)}
          className={cn("block truncate text-sm hover:text-primary", done && "text-muted-foreground line-through")}
        >
          {task.title}
        </Link>
        {showSession ? <p className="truncate text-[11px] text-subtle-foreground">{task.sessionTitle}</p> : null}
      </div>
      {task.timesMoved > 0 ? <Badge tone="warning">{m.dashboard.plan.carried}</Badge> : null}
      {task.overCapacity ? (
        <Tooltip content={m.dashboard.plan.overCapacity}>
          <TriangleAlert className="size-3.5 text-warning" aria-label={m.dashboard.plan.overCapacity} />
        </Tooltip>
      ) : null}
      <span className="shrink-0 text-xs tabular-nums text-subtle-foreground">{m.common.minutes(task.minutes)}</span>
      <Link
        href={taskHref(task.kind as TaskKind, task.refSlug)}
        className="text-subtle-foreground opacity-0 group-hover:opacity-100 hover:text-foreground"
        aria-label={m.common.actions.open}
      >
        <ExternalLink className="size-3.5" />
      </Link>
    </li>
  );
}

export function MarkUnavailableButton() {
  const { m } = useI18n();
  const [pending, start] = useTransition();
  return (
    <Tooltip content={m.dashboard.plan.markUnavailableHelp}>
      <Button
        variant="ghost"
        size="sm"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const res = await markTodayUnavailableAction();
            if (res.ok) toast.success(m.dashboard.plan.unavailableDone(res.data?.moved ?? 0));
            else toast.error(res.error);
          })
        }
      >
        <CalendarOff />
        {m.dashboard.plan.markUnavailable}
      </Button>
    </Tooltip>
  );
}
