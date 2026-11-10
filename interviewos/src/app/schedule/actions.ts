"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { calendarEvents, companies, userSettings, weeklyObjectives } from "@/lib/db/schema";
import { isISODate } from "@/lib/dates";
import { generatePlan, markDayUnavailable, moveTask, reschedule, setTaskStatus } from "@/server/scheduler";
import { getCurrentUserId, getToday } from "@/server/user";

const isoDate = z.string().refine(isISODate, "Invalid date");

export type ActionResult<T = undefined> = { ok: true; data?: T } | { ok: false; error: string };

function fail(err: unknown): { ok: false; error: string } {
  if (err instanceof z.ZodError) return { ok: false, error: err.issues.map((i) => i.message).join("; ") };
  return { ok: false, error: err instanceof Error ? err.message : "Unexpected error" };
}

export async function markTodayUnavailableAction(): Promise<ActionResult<{ moved: number }>> {
  try {
    const today = await getToday();
    const res = await markDayUnavailable(today, "Unavailable");
    revalidatePath("/", "layout");
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

export async function markDayUnavailableAction(input: { date: string; title?: string }): Promise<ActionResult<{ moved: number }>> {
  try {
    const { date, title } = z.object({ date: isoDate, title: z.string().max(120).optional() }).parse(input);
    const res = await markDayUnavailable(date, title || "Unavailable");
    revalidatePath("/", "layout");
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

export async function setTaskStatusAction(input: { taskId: number; status: "todo" | "done" | "skipped" }): Promise<ActionResult> {
  try {
    const { taskId, status } = z.object({ taskId: z.number().int().positive(), status: z.enum(["todo", "done", "skipped"]) }).parse(input);
    await setTaskStatus(taskId, status);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function moveTaskAction(input: { taskId: number; date: string }): Promise<ActionResult> {
  try {
    const { taskId, date } = z.object({ taskId: z.number().int().positive(), date: isoDate }).parse(input);
    await moveTask(taskId, date);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function generatePlanAction(input: { templateKey: string; startDate: string }): Promise<ActionResult> {
  try {
    const { templateKey, startDate } = z.object({ templateKey: z.string().min(1), startDate: isoDate }).parse(input);
    await generatePlan(templateKey, startDate);
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function rescheduleAction(input: { pullForward: boolean }): Promise<ActionResult<{ moved: number }>> {
  try {
    const { pullForward } = z.object({ pullForward: z.boolean() }).parse(input);
    const res = await reschedule({ pullForward });
    revalidatePath("/", "layout");
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

const eventSchema = z.object({
  kind: z.enum(["university", "interview", "unavailable", "other"]),
  title: z.string().trim().min(1).max(160),
  date: isoDate,
  lightDaysBefore: z.number().int().min(0).max(14).default(0),
  companySlug: z.string().optional(),
  notes: z.string().max(2000).default(""),
});

export async function addEventAction(input: z.input<typeof eventSchema>): Promise<ActionResult> {
  try {
    const data = eventSchema.parse(input);
    let companyId: number | null = null;
    if (data.companySlug) {
      const [c] = await db.select({ id: companies.id }).from(companies).where(eq(companies.slug, data.companySlug));
      companyId = c?.id ?? null;
    }
    await db.insert(calendarEvents).values({
      userId: getCurrentUserId(),
      kind: data.kind,
      title: data.title,
      date: data.date,
      lightDaysBefore: data.kind === "university" ? data.lightDaysBefore : 0,
      companyId,
      notes: data.notes,
    });
    await reschedule();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteEventAction(input: { id: number }): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.number().int().positive() }).parse(input);
    await db.delete(calendarEvents).where(and(eq(calendarEvents.id, id), eq(calendarEvents.userId, getCurrentUserId())));
    await reschedule();
    revalidatePath("/", "layout");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

const scheduleSettingsSchema = z.object({
  dailyBudgetMinutes: z.number().int().min(10).max(480),
  restWeekdays: z.array(z.number().int().min(0).max(6)).max(6),
  prioritizeUniversity: z.boolean(),
});

export async function updateScheduleSettingsAction(input: z.input<typeof scheduleSettingsSchema>): Promise<ActionResult<{ moved: number }>> {
  try {
    const data = scheduleSettingsSchema.parse(input);
    await db.update(userSettings).set({ ...data, updatedAt: new Date() }).where(eq(userSettings.userId, getCurrentUserId()));
    const res = await reschedule();
    revalidatePath("/", "layout");
    return { ok: true, data: res };
  } catch (e) {
    return fail(e);
  }
}

export async function addObjectiveAction(input: { weekStart: string; text: string }): Promise<ActionResult> {
  try {
    const data = z.object({ weekStart: isoDate, text: z.string().trim().min(2).max(300) }).parse(input);
    await db.insert(weeklyObjectives).values({ userId: getCurrentUserId(), ...data });
    revalidatePath("/schedule");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function toggleObjectiveAction(input: { id: number; done: boolean }): Promise<ActionResult> {
  try {
    const data = z.object({ id: z.number().int().positive(), done: z.boolean() }).parse(input);
    await db
      .update(weeklyObjectives)
      .set({ done: data.done })
      .where(and(eq(weeklyObjectives.id, data.id), eq(weeklyObjectives.userId, getCurrentUserId())));
    revalidatePath("/schedule");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function deleteObjectiveAction(input: { id: number }): Promise<ActionResult> {
  try {
    const { id } = z.object({ id: z.number().int().positive() }).parse(input);
    await db.delete(weeklyObjectives).where(and(eq(weeklyObjectives.id, id), eq(weeklyObjectives.userId, getCurrentUserId())));
    revalidatePath("/schedule");
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}
