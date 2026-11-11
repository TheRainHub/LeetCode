import "server-only";
import { db } from "@/lib/db";
import { timeEntries } from "@/lib/db/schema";
import { getCurrentUserId, getToday } from "./user";

export type TimeKind = (typeof timeEntries.$inferInsert)["kind"];

/** Records active learning time. Values are clamped to avoid runaway timers (max 4 h per entry). */
export async function logTime(kind: TimeKind, seconds: number, ref?: string) {
  const s = Math.round(Math.min(Math.max(seconds, 0), 4 * 3600));
  if (s < 5) return;
  await db
    .insert(timeEntries)
    .values({ userId: getCurrentUserId(), date: await getToday(), seconds: s, kind, ref });
}
