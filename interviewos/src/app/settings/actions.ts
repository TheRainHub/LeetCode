"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/lib/db";
import { topicProgress, userSettings } from "@/lib/db/schema";
import { getCurrentUserId } from "@/server/user";

function validTimeZone(tz: string) {
  try {
    new Intl.DateTimeFormat("en", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

const schema = z.object({
  locale: z.enum(["en", "ru"]),
  theme: z.enum(["dark", "light"]),
  preferredLanguage: z.enum(["java", "typescript", "python"]),
  timezone: z.string().trim().min(1).max(64).refine(validTimeZone, "Unknown time zone"),
  interviewerProfile: z.string().max(5000),
});

export async function updateSettingsAction(
  input: z.input<typeof schema>,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = schema.safeParse(input);
  if (!parsed.success) return { ok: false, error: parsed.error.issues.map((i) => i.message).join("; ") };
  await db
    .update(userSettings)
    .set({ ...parsed.data, updatedAt: new Date() })
    .where(eq(userSettings.userId, getCurrentUserId()));
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function setTopicPriorityAction(input: {
  topicId: number;
  priority: number;
}): Promise<{ ok: true } | { ok: false; error: string }> {
  const parsed = z
    .object({ topicId: z.number().int().positive(), priority: z.number().int().min(-1).max(2) })
    .safeParse(input);
  if (!parsed.success) return { ok: false, error: "Invalid priority" };
  await db
    .insert(topicProgress)
    .values({ userId: getCurrentUserId(), topicId: parsed.data.topicId, priority: parsed.data.priority })
    .onConflictDoUpdate({
      target: [topicProgress.userId, topicProgress.topicId],
      set: { priority: parsed.data.priority },
    });
  revalidatePath("/", "layout");
  return { ok: true };
}
