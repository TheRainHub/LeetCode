"use server";

import { and, eq, max } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import {
  applicationEvents,
  applications,
  calendarEvents,
  companies,
  companyChecklistItems,
  companyFocusTopics,
  companyNotes,
} from "@/lib/db/schema";
import { isISODate } from "@/lib/dates";
import { reschedule } from "@/server/scheduler";
import { getCurrentUserId } from "@/server/user";

type Result = { ok: true } | { ok: false; error: string };
const fail = (err: unknown): { ok: false; error: string } =>
  err instanceof z.ZodError
    ? { ok: false, error: err.issues.map((i) => i.message).join("; ") }
    : { ok: false, error: err instanceof Error ? err.message : "Unexpected error" };
const id = z.number().int().positive();
const isoDate = z.string().refine(isISODate, "Invalid date");
const stage = z.enum(["applied", "screening", "technical", "final", "offer", "rejected"]);

function done(): Result {
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setFocusWeightAction(input: {
  companyId: number;
  topicId: number;
  weight: number;
}): Promise<Result> {
  try {
    const d = z.object({ companyId: id, topicId: id, weight: z.number().int().min(0).max(3) }).parse(input);
    await db
      .insert(companyFocusTopics)
      .values(d)
      .onConflictDoUpdate({
        target: [companyFocusTopics.companyId, companyFocusTopics.topicId],
        set: { weight: d.weight },
      });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateCompanyAction(input: {
  companyId: number;
  role: string;
  overview: string;
  prepNotes: string;
}): Promise<Result> {
  try {
    const d = z
      .object({
        companyId: id,
        role: z.string().trim().min(2).max(200),
        overview: z.string().max(20000),
        prepNotes: z.string().max(20000),
      })
      .parse(input);
    await db
      .update(companies)
      .set({ role: d.role, overview: d.overview, prepNotes: d.prepNotes })
      .where(eq(companies.id, d.companyId));
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function addChecklistItemAction(input: { companyId: number; text: string }): Promise<Result> {
  try {
    const d = z.object({ companyId: id, text: z.string().trim().min(2).max(300) }).parse(input);
    const userId = getCurrentUserId();
    const [r] = await db
      .select({ m: max(companyChecklistItems.order) })
      .from(companyChecklistItems)
      .where(and(eq(companyChecklistItems.userId, userId), eq(companyChecklistItems.companyId, d.companyId)));
    await db
      .insert(companyChecklistItems)
      .values({ userId, companyId: d.companyId, text: d.text, order: (r?.m ?? -1) + 1 });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function toggleChecklistItemAction(input: { id: number; done: boolean }): Promise<Result> {
  try {
    const d = z.object({ id, done: z.boolean() }).parse(input);
    await db
      .update(companyChecklistItems)
      .set({ done: d.done })
      .where(and(eq(companyChecklistItems.id, d.id), eq(companyChecklistItems.userId, getCurrentUserId())));
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function deleteChecklistItemAction(input: { id: number }): Promise<Result> {
  try {
    const d = z.object({ id }).parse(input);
    await db
      .delete(companyChecklistItems)
      .where(and(eq(companyChecklistItems.id, d.id), eq(companyChecklistItems.userId, getCurrentUserId())));
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function saveCompanyNotesAction(input: { companyId: number; notes: string }): Promise<Result> {
  try {
    const d = z.object({ companyId: id, notes: z.string().max(50000) }).parse(input);
    await db
      .insert(companyNotes)
      .values({ userId: getCurrentUserId(), ...d })
      .onConflictDoUpdate({
        target: [companyNotes.userId, companyNotes.companyId],
        set: { notes: d.notes, updatedAt: new Date() },
      });
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function createApplicationAction(input: {
  companyId: number;
  role: string;
  date: string;
  note: string;
}): Promise<Result> {
  try {
    const d = z
      .object({
        companyId: id,
        role: z.string().trim().min(2).max(200),
        date: isoDate,
        note: z.string().max(2000),
      })
      .parse(input);
    const [app] = await db
      .insert(applications)
      .values({ userId: getCurrentUserId(), companyId: d.companyId, role: d.role, stage: "applied" })
      .returning({ id: applications.id });
    await db
      .insert(applicationEvents)
      .values({ applicationId: app!.id, stage: "applied", occurredOn: d.date, note: d.note });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function updateApplicationStageAction(input: {
  applicationId: number;
  stage: string;
  date: string;
  note: string;
}): Promise<Result> {
  try {
    const d = z.object({ applicationId: id, stage, date: isoDate, note: z.string().max(2000) }).parse(input);
    const [app] = await db
      .select({ id: applications.id })
      .from(applications)
      .where(and(eq(applications.id, d.applicationId), eq(applications.userId, getCurrentUserId())));
    if (!app) throw new Error("Application not found");
    await db
      .update(applications)
      .set({ stage: d.stage, updatedAt: new Date() })
      .where(eq(applications.id, app.id));
    await db
      .insert(applicationEvents)
      .values({ applicationId: app.id, stage: d.stage, occurredOn: d.date, note: d.note });
    return done();
  } catch (e) {
    return fail(e);
  }
}

export async function addInterviewDateAction(input: {
  companyId: number;
  title: string;
  date: string;
  notes: string;
}): Promise<Result> {
  try {
    const d = z
      .object({
        companyId: id,
        title: z.string().trim().min(2).max(200),
        date: isoDate,
        notes: z.string().max(2000),
      })
      .parse(input);
    await db.insert(calendarEvents).values({
      userId: getCurrentUserId(),
      kind: "interview",
      title: d.title,
      date: d.date,
      companyId: d.companyId,
      notes: d.notes,
    });
    await reschedule();
    return done();
  } catch (e) {
    return fail(e);
  }
}
