import "server-only";
import { and, asc, eq, gte, inArray, lt, ne } from "drizzle-orm";
import { INTERVIEW_SPRINT } from "@content/plan-template";
import { db } from "@/lib/db";
import { calendarEvents, studyPlans, studySessions, studyTasks, userSettings } from "@/lib/db/schema";
import { addDays, type ISODate } from "@/lib/dates";
import { dayCapacity, type CalendarEventLite, type CapacitySettings } from "@/lib/scheduler/capacity";
import { placeTasks } from "@/lib/scheduler/placement";
import { log } from "./log";
import { getCurrentUserId, getSettings, getToday } from "./user";

export const PLAN_TEMPLATES = [INTERVIEW_SPRINT] as const;

async function capacityInputs(): Promise<{ settings: CapacitySettings; events: CalendarEventLite[] }> {
  const s = await getSettings();
  const events = await db
    .select({ kind: calendarEvents.kind, date: calendarEvents.date, lightDaysBefore: calendarEvents.lightDaysBefore })
    .from(calendarEvents)
    .where(eq(calendarEvents.userId, getCurrentUserId()));
  return {
    settings: { dailyBudgetMinutes: s.dailyBudgetMinutes, restWeekdays: s.restWeekdays, prioritizeUniversity: s.prioritizeUniversity },
    events,
  };
}

export async function getCapacityFn() {
  const { settings, events } = await capacityInputs();
  return (date: ISODate) => dayCapacity(date, settings, events);
}

export async function getActivePlan() {
  const [plan] = await db
    .select()
    .from(studyPlans)
    .where(and(eq(studyPlans.userId, getCurrentUserId()), eq(studyPlans.active, true)))
    .orderBy(asc(studyPlans.id))
    .limit(1);
  return plan ?? null;
}

/** Generates a new active plan from a template, relative to `startDate`. Deactivates any previous plan. */
export async function generatePlan(templateKey: string, startDate: ISODate) {
  const template = PLAN_TEMPLATES.find((t) => t.key === templateKey);
  if (!template) throw new Error(`Unknown plan template: ${templateKey}`);
  const userId = getCurrentUserId();
  const capacity = await getCapacityFn();

  // Flatten tasks in session order and place them on days.
  const flat = template.sessions.flatMap((session, si) =>
    session.tasks.map((task, ti) => ({ id: `${si}:${ti}`, minutes: task.minutes, si, ti, task })),
  );
  const placements = placeTasks(flat, { from: startDate, capacityOf: (d) => capacity(d).minutes });
  const byId = new Map(placements.map((p) => [p.id, p]));

  await db.transaction(async (tx) => {
    await tx.update(studyPlans).set({ active: false }).where(eq(studyPlans.userId, userId));
    const [plan] = await tx
      .insert(studyPlans)
      .values({ userId, name: template.name, templateKey: template.key, startDate, active: true })
      .returning({ id: studyPlans.id });
    for (const [si, session] of template.sessions.entries()) {
      const [row] = await tx
        .insert(studySessions)
        .values({ planId: plan!.id, order: si, title: session.title, focus: session.focus })
        .returning({ id: studySessions.id });
      await tx.insert(studyTasks).values(
        session.tasks.map((task, ti) => {
          const p = byId.get(`${si}:${ti}`)!;
          return {
            sessionId: row!.id,
            order: ti,
            kind: task.kind,
            title: task.title,
            refSlug: task.refSlug ?? null,
            estimatedMinutes: task.minutes,
            scheduledDate: p.date,
            overCapacity: p.overCapacity,
          };
        }),
      );
    }
  });
  await db.update(userSettings).set({ lastRescheduledOn: await getToday() }).where(eq(userSettings.userId, userId));
  log.info("scheduler", "plan generated", { templateKey, startDate, tasks: flat.length });
}

async function planTasks(planId: number) {
  return db
    .select({
      id: studyTasks.id,
      sessionOrder: studySessions.order,
      order: studyTasks.order,
      minutes: studyTasks.estimatedMinutes,
      date: studyTasks.scheduledDate,
      pinned: studyTasks.pinned,
      status: studyTasks.status,
      timesMoved: studyTasks.timesMoved,
    })
    .from(studyTasks)
    .innerJoin(studySessions, eq(studySessions.id, studyTasks.sessionId))
    .where(eq(studySessions.planId, planId))
    .orderBy(asc(studySessions.order), asc(studyTasks.order));
}

/**
 * Re-places all unfinished tasks from today onward: overdue tasks are carried
 * over, tasks on days that lost capacity move later, nothing exceeds capacity.
 * Tasks never move earlier unless `pullForward` is set.
 */
export async function reschedule(opts: { pullForward?: boolean } = {}) {
  const plan = await getActivePlan();
  if (!plan) return { moved: 0 };
  const today = await getToday();
  const capacity = await getCapacityFn();
  const tasks = await planTasks(plan.id);

  const used: Record<string, number> = {};
  for (const t of tasks) if (t.status !== "todo" && t.date >= today) used[t.date] = (used[t.date] ?? 0) + t.minutes;

  const pending = tasks.filter((t) => t.status === "todo");
  const placements = placeTasks(
    pending.map((t) => ({ id: t.id, minutes: t.minutes, date: t.date < today ? undefined : t.date, pinned: t.pinned })),
    { from: today, capacityOf: (d) => capacity(d).minutes, used, allowPullForward: opts.pullForward },
  );

  let moved = 0;
  for (const p of placements) {
    const t = pending.find((x) => x.id === p.id)!;
    if (t.date !== p.date || p.overCapacity) {
      if (t.date !== p.date) moved++;
      await db
        .update(studyTasks)
        .set({
          scheduledDate: p.date,
          overCapacity: p.overCapacity,
          timesMoved: t.date !== p.date ? t.timesMoved + 1 : t.timesMoved,
          // A pinned task whose day became invalid is unpinned when moved.
          pinned: t.date !== p.date ? false : t.pinned,
        })
        .where(eq(studyTasks.id, t.id));
    }
  }
  await db.update(userSettings).set({ lastRescheduledOn: today }).where(eq(userSettings.userId, getCurrentUserId()));
  if (moved) log.info("scheduler", "rescheduled tasks", { moved });
  return { moved };
}

/** Runs carry-over at most once per day (called when the dashboard or schedule loads). */
export async function ensurePlanUpToDate() {
  const settings = await getSettings();
  const today = await getToday();
  if (settings.lastRescheduledOn === today) return;
  const plan = await getActivePlan();
  if (!plan) return;
  const overdue = await db
    .select({ id: studyTasks.id })
    .from(studyTasks)
    .innerJoin(studySessions, eq(studySessions.id, studyTasks.sessionId))
    .where(and(eq(studySessions.planId, plan.id), eq(studyTasks.status, "todo"), lt(studyTasks.scheduledDate, today)))
    .limit(1);
  if (overdue.length > 0) await reschedule();
  else await db.update(userSettings).set({ lastRescheduledOn: today }).where(eq(userSettings.userId, getCurrentUserId()));
}

export async function markDayUnavailable(date: ISODate, title: string) {
  const userId = getCurrentUserId();
  const existing = await db
    .select({ id: calendarEvents.id })
    .from(calendarEvents)
    .where(and(eq(calendarEvents.userId, userId), eq(calendarEvents.kind, "unavailable"), eq(calendarEvents.date, date)));
  if (existing.length === 0) {
    await db.insert(calendarEvents).values({ userId, kind: "unavailable", title, date });
  }
  return reschedule();
}

export async function getTasksBetween(from: ISODate, to: ISODate) {
  const plan = await getActivePlan();
  if (!plan) return [];
  return db
    .select({
      id: studyTasks.id,
      kind: studyTasks.kind,
      title: studyTasks.title,
      refSlug: studyTasks.refSlug,
      minutes: studyTasks.estimatedMinutes,
      date: studyTasks.scheduledDate,
      status: studyTasks.status,
      pinned: studyTasks.pinned,
      overCapacity: studyTasks.overCapacity,
      timesMoved: studyTasks.timesMoved,
      sessionTitle: studySessions.title,
      sessionOrder: studySessions.order,
      order: studyTasks.order,
    })
    .from(studyTasks)
    .innerJoin(studySessions, eq(studySessions.id, studyTasks.sessionId))
    .where(and(eq(studySessions.planId, plan.id), gte(studyTasks.scheduledDate, from), lt(studyTasks.scheduledDate, addDays(to, 1))))
    .orderBy(asc(studyTasks.scheduledDate), asc(studySessions.order), asc(studyTasks.order));
}

export async function getUnfinishedCount() {
  const plan = await getActivePlan();
  if (!plan) return 0;
  const rows = await db
    .select({ id: studyTasks.id })
    .from(studyTasks)
    .innerJoin(studySessions, eq(studySessions.id, studyTasks.sessionId))
    .where(and(eq(studySessions.planId, plan.id), ne(studyTasks.status, "done"), ne(studyTasks.status, "skipped")));
  return rows.length;
}

export async function setTaskStatus(taskId: number, status: "todo" | "done" | "skipped") {
  const plan = await getActivePlan();
  if (!plan) return;
  const sessionIds = (await db.select({ id: studySessions.id }).from(studySessions).where(eq(studySessions.planId, plan.id))).map((s) => s.id);
  await db
    .update(studyTasks)
    .set({ status, completedAt: status === "done" ? new Date() : null })
    .where(and(eq(studyTasks.id, taskId), inArray(studyTasks.sessionId, sessionIds)));
}

export async function moveTask(taskId: number, date: ISODate) {
  await db.update(studyTasks).set({ scheduledDate: date, pinned: true, overCapacity: false }).where(eq(studyTasks.id, taskId));
}

/** Marks plan tasks that reference `refSlug` of the given kind as done for today (e.g. after solving the problem). */
export async function completeMatchingTasks(kind: "lesson" | "problem" | "lab" | "review" | "mock" | "experience", refSlug: string | null) {
  const plan = await getActivePlan();
  if (!plan) return;
  const today = await getToday();
  const tasks = await getTasksBetween(addDays(today, -30), addDays(today, 60));
  const match = tasks.find(
    (t) => t.kind === kind && t.status === "todo" && (refSlug === null || t.refSlug === refSlug) && t.date <= addDays(today, 60),
  );
  if (match) await setTaskStatus(match.id, "done");
}
