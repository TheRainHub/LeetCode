import "server-only";
import { eq } from "drizzle-orm";
import { cache } from "react";
import { db } from "@/lib/db";
import { userSettings, users } from "@/lib/db/schema";
import { todayIn } from "@/lib/dates";
import { env } from "@/lib/env";
import { getMessagesFor, type Locale } from "@/lib/i18n";

/**
 * Single local user for the MVP. Replace this function with a session lookup
 * when authentication is added; every query already filters by user id.
 */
export const LOCAL_USER_ID = 1;

export function getCurrentUserId(): number {
  return LOCAL_USER_ID;
}

export type Settings = typeof userSettings.$inferSelect;

export const getSettings = cache(async (): Promise<Settings> => {
  const userId = getCurrentUserId();
  const rows = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  if (rows[0]) return rows[0];
  // First run without seed: create the user and default settings.
  await db
    .insert(users)
    .overridingSystemValue()
    .values({ id: userId, name: "Local user" })
    .onConflictDoNothing();
  const [created] = await db
    .insert(userSettings)
    .values({ userId, timezone: env().APP_TIMEZONE })
    .onConflictDoNothing()
    .returning();
  if (created) return created;
  const again = await db.select().from(userSettings).where(eq(userSettings.userId, userId));
  return again[0]!;
});

export const getToday = cache(async (): Promise<string> => {
  const settings = await getSettings();
  return todayIn(settings.timezone);
});

export const getI18n = cache(async () => {
  const settings = await getSettings();
  const locale = (settings.locale === "ru" ? "ru" : "en") as Locale;
  return { locale, m: getMessagesFor(locale) };
});
