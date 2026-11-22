"use client";

import { ChevronDown, ExternalLink, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { toast } from "sonner";
import { deleteMentorNoteAction, setMentorTaskStatusAction } from "@/app/mentor/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useI18n } from "@/lib/i18n/client";

export interface PanelTask {
  id: number;
  title: string;
  details: string;
  kind: string;
  href: string | null;
  dueOn: string | null;
  estimateMinutes: number | null;
  status: "open" | "done" | "skipped";
  userNote: string;
}

function TaskItem({ task }: { task: PanelTask }) {
  const { m } = useI18n();
  const T = m.mentor.tasks;
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [note, setNote] = useState(task.userNote);
  const [pending, start] = useTransition();
  const set = (status: PanelTask["status"]) =>
    start(async () => {
      const res = await setMentorTaskStatusAction({ id: task.id, status, note: note.trim() || undefined });
      if (!res.ok) toast.error(res.error);
      router.refresh();
    });
  const external = task.href?.startsWith("http");
  return (
    <li
      className="border-border flex flex-col gap-1.5 rounded-md border p-2 text-xs"
      data-testid="mentor-task"
      data-status={task.status}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          className="text-muted-foreground hover:text-foreground mt-0.5"
          onClick={() => setOpen((o) => !o)}
          aria-expanded={open}
          aria-label={task.title}
        >
          <ChevronDown className={`size-3.5 transition-transform ${open ? "" : "-rotate-90"}`} />
        </button>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium">{task.title}</p>
          <div className="text-subtle-foreground mt-0.5 flex flex-wrap items-center gap-1.5">
            <Badge tone="neutral">{T.kinds[task.kind as keyof typeof T.kinds] ?? task.kind}</Badge>
            {task.estimateMinutes ? <span>{T.minutes(task.estimateMinutes)}</span> : null}
            {task.dueOn ? <span className="text-warning">{T.due(task.dueOn)}</span> : null}
            {task.href ? (
              external ? (
                <a
                  href={task.href}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="text-primary inline-flex items-center gap-0.5 hover:underline"
                >
                  <ExternalLink className="size-3" aria-hidden />
                  LeetCode
                </a>
              ) : (
                <Link
                  href={task.href}
                  className="text-primary hover:underline"
                  data-testid="mentor-task-link"
                >
                  →
                </Link>
              )
            ) : null}
          </div>
        </div>
      </div>
      {open ? (
        <div className="flex flex-col gap-2 pl-5">
          {task.details ? <p className="text-muted-foreground whitespace-pre-wrap">{task.details}</p> : null}
          <Input
            className="h-7 text-xs"
            placeholder={T.notePlaceholder}
            value={note}
            maxLength={1000}
            onChange={(e) => setNote(e.target.value)}
            aria-label={T.notePlaceholder}
          />
        </div>
      ) : null}
      <div className="flex gap-1 pl-5">
        {task.status === "open" ? (
          <>
            <Button
              size="sm"
              variant="secondary"
              className="h-6 px-2 text-[11px]"
              disabled={pending}
              onClick={() => set("done")}
              data-testid="mentor-task-done"
            >
              {T.markDone}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              className="h-6 px-2 text-[11px]"
              disabled={pending}
              onClick={() => set("skipped")}
            >
              {T.skip}
            </Button>
          </>
        ) : (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            disabled={pending}
            onClick={() => set("open")}
          >
            {T.reopen}
          </Button>
        )}
        {open && task.status !== "open" ? (
          <Button
            size="sm"
            variant="ghost"
            className="h-6 px-2 text-[11px]"
            disabled={pending}
            onClick={() => set(task.status)}
          >
            {T.save}
          </Button>
        ) : null}
      </div>
    </li>
  );
}

export function MentorTasks({ tasks }: { tasks: PanelTask[] }) {
  const { m } = useI18n();
  const T = m.mentor.tasks;
  const open = tasks.filter((t) => t.status === "open");
  const closed = tasks.filter((t) => t.status !== "open");
  if (!tasks.length) return <p className="text-muted-foreground text-xs">{T.none}</p>;
  return (
    <div className="flex flex-col gap-2" data-testid="mentor-tasks">
      <ul className="flex flex-col gap-2">
        {open.map((t) => (
          <TaskItem key={t.id} task={t} />
        ))}
      </ul>
      {closed.length ? (
        <details className="text-xs">
          <summary className="text-muted-foreground cursor-pointer">
            {T.done} / {T.skipped}: {closed.length}
          </summary>
          <ul className="mt-2 flex flex-col gap-2">
            {closed.map((t) => (
              <TaskItem key={t.id} task={t} />
            ))}
          </ul>
        </details>
      ) : null}
    </div>
  );
}

export function MentorNotes({ notes }: { notes: { id: number; text: string }[] }) {
  const { m } = useI18n();
  const N = m.mentor.notes;
  const router = useRouter();
  const [pending, start] = useTransition();
  if (!notes.length) return <p className="text-muted-foreground text-xs">{N.none}</p>;
  return (
    <ul className="flex flex-col gap-1.5" data-testid="mentor-notes">
      {notes.map((n) => (
        <li key={n.id} className="flex items-start gap-1.5 text-xs" data-testid="mentor-note">
          <span className="flex-1">{n.text}</span>
          <button
            type="button"
            className="text-muted-foreground hover:text-danger"
            disabled={pending}
            title={N.remove}
            aria-label={N.remove}
            onClick={() =>
              start(async () => {
                const res = await deleteMentorNoteAction({ id: n.id });
                if (!res.ok) toast.error(res.error);
                router.refresh();
              })
            }
          >
            <Trash2 className="size-3.5" />
          </button>
        </li>
      ))}
    </ul>
  );
}

export function NewThreadButton({ label }: { label: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  return (
    <Button
      size="sm"
      variant="secondary"
      disabled={pending}
      data-testid="mentor-new-thread"
      onClick={() =>
        start(async () => {
          const { createMentorThreadAction } = await import("@/app/mentor/actions");
          const { id } = await createMentorThreadAction({ title: label });
          router.push(`/mentor?thread=${id}`);
        })
      }
    >
      {label}
    </Button>
  );
}
