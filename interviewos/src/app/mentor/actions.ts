"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createThread, deleteMentorNote, setMentorTaskStatus } from "@/server/mentor";

type Result = { ok: true } | { ok: false; error: string };
const id = z.number().int().positive();

/** Starts a conversation; the first message later becomes its title. */
export async function createMentorThreadAction(input: { title: string }): Promise<{ id: number }> {
  const threadId = await createThread(z.string().trim().min(1).max(80).catch("…").parse(input.title));
  revalidatePath("/mentor");
  return { id: threadId };
}

export async function setMentorTaskStatusAction(input: {
  id: number;
  status: "open" | "done" | "skipped";
  note?: string;
}): Promise<Result> {
  const parsed = z
    .object({ id, status: z.enum(["open", "done", "skipped"]), note: z.string().trim().max(1000).optional() })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid request" };
  const row = await setMentorTaskStatus(parsed.data.id, parsed.data.status, parsed.data.note);
  if (!row) return { ok: false, error: "Task not found" };
  revalidatePath("/mentor");
  revalidatePath("/");
  return { ok: true };
}

export async function deleteMentorNoteAction(input: { id: number }): Promise<Result> {
  const parsed = id.safeParse(input.id);
  if (!parsed.success || !(await deleteMentorNote(parsed.data)))
    return { ok: false, error: "Note not found" };
  revalidatePath("/mentor");
  return { ok: true };
}
