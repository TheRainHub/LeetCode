import "server-only";
import { and, desc, eq, isNotNull, isNull, sql } from "drizzle-orm";
import { describeAiError } from "@/lib/ai/client";
import { isAiConfigured } from "@/lib/ai/config";
import { findJobs, type ResearchEvent } from "@/lib/ai/jobs";
import { db } from "@/lib/db";
import { jobAutoSearches, jobSearches } from "@/lib/db/schema";
import { normalizeUrl } from "@/lib/jobs/grounding";
import {
  type AutoSearchInput,
  MAX_AUTO_SEARCHES,
  MIN_RESUME_CHARS,
  nextRunAfter,
  type SearchCriteria,
} from "@/lib/jobs/model";
import { getCareerProfile, listPostings, saveSearch } from "./jobs";
import { log } from "./log";
import { getCurrentUserId } from "./user";

/** A claimed run that has not finished within this time is considered crashed and can be retried. */
const STALE_RUN_MINUTES = 20;

export async function listAutoSearches() {
  return db
    .select()
    .from(jobAutoSearches)
    .where(eq(jobAutoSearches.userId, getCurrentUserId()))
    .orderBy(jobAutoSearches.createdAt);
}

export async function createAutoSearch(input: AutoSearchInput) {
  const userId = getCurrentUserId();
  const [{ n }] = (await db
    .select({ n: sql<number>`count(*)::int` })
    .from(jobAutoSearches)
    .where(eq(jobAutoSearches.userId, userId))) as [{ n: number }];
  if (n >= MAX_AUTO_SEARCHES) throw new Error(`At most ${MAX_AUTO_SEARCHES} automatic searches.`);
  // The first run is due right away; the schedule starts from there.
  const [row] = await db
    .insert(jobAutoSearches)
    .values({ userId, ...input, nextRunAt: new Date() })
    .returning();
  return row!;
}

export async function updateAutoSearch(
  id: number,
  patch: { enabled?: boolean; intervalDays?: number; runNow?: boolean },
) {
  const [current] = await db
    .select()
    .from(jobAutoSearches)
    .where(and(eq(jobAutoSearches.id, id), eq(jobAutoSearches.userId, getCurrentUserId())));
  if (!current) throw new Error("Automatic search not found");
  const intervalDays = patch.intervalDays ?? current.intervalDays;
  const nextRunAt = patch.runNow
    ? new Date()
    : patch.intervalDays && current.lastRunAt
      ? nextRunAfter(current.lastRunAt, intervalDays)
      : current.nextRunAt;
  await db
    .update(jobAutoSearches)
    .set({ enabled: patch.runNow ? true : (patch.enabled ?? current.enabled), intervalDays, nextRunAt })
    .where(eq(jobAutoSearches.id, id));
}

export async function deleteAutoSearch(id: number) {
  await db
    .delete(jobAutoSearches)
    .where(and(eq(jobAutoSearches.id, id), eq(jobAutoSearches.userId, getCurrentUserId())));
}

export async function hasDueAutoSearch(now = new Date()): Promise<boolean> {
  const rows = await db
    .select({ id: jobAutoSearches.id })
    .from(jobAutoSearches)
    .where(
      and(
        eq(jobAutoSearches.userId, getCurrentUserId()),
        eq(jobAutoSearches.enabled, true),
        sql`${jobAutoSearches.nextRunAt} <= ${now.toISOString()}::timestamptz`,
        sql`(${jobAutoSearches.runningSince} is null or ${jobAutoSearches.runningSince} < ${now.toISOString()}::timestamptz - make_interval(mins => ${STALE_RUN_MINUTES}))`,
      ),
    )
    .limit(1);
  return rows.length > 0;
}

/**
 * Atomically claims the most overdue enabled search. Two concurrent callers (the scheduler and a
 * page visit) can never claim the same one: the row is locked and marked as running in one statement.
 */
async function claimDueAutoSearch(now = new Date()) {
  // Raw SQL parameters are passed as ISO strings and cast; postgres.js does not take Date here.
  const at = now.toISOString();
  const rows = (await db.execute(sql`
    update job_auto_searches set running_since = ${at}::timestamptz
    where id = (
      select id from job_auto_searches
      where user_id = ${getCurrentUserId()} and enabled and next_run_at <= ${at}::timestamptz
        and (running_since is null or running_since < ${at}::timestamptz - make_interval(mins => ${STALE_RUN_MINUTES}))
      order by next_run_at
      limit 1
      for update skip locked
    )
    returning id, name, criteria, interval_days`)) as unknown as {
    id: number;
    name: string;
    criteria: SearchCriteria;
    interval_days: number;
  }[];
  return rows[0] ?? null;
}

async function finishAutoSearch(id: number, intervalDays: number, error: string | null) {
  const now = new Date();
  await db
    .update(jobAutoSearches)
    .set({ runningSince: null, lastRunAt: now, nextRunAt: nextRunAfter(now, intervalDays), lastError: error })
    .where(eq(jobAutoSearches.id, id));
}

/** Links of every posting suggested before or saved, so automatic runs report only new ones. */
async function seenPostings(): Promise<{ urls: Set<string>; titles: string[] }> {
  const userId = getCurrentUserId();
  const [searches, postings] = await Promise.all([
    db
      .select({ results: jobSearches.results })
      .from(jobSearches)
      .where(eq(jobSearches.userId, userId))
      .orderBy(desc(jobSearches.createdAt))
      .limit(200),
    listPostings(),
  ]);
  const urls = new Set<string>();
  const titles: string[] = [];
  for (const p of postings) {
    const key = p.url ? normalizeUrl(p.url) : null;
    if (key) urls.add(key);
    titles.push(`${p.company} — ${p.title}`);
  }
  for (const s of searches)
    for (const r of s.results) {
      const key = normalizeUrl(r.url);
      if (key) urls.add(key);
      titles.push(`${r.company} — ${r.title}`);
    }
  return { urls, titles: [...new Set(titles)] };
}

export type AutoRunResult =
  | { status: "idle"; reason: "nothing-due" | "ai-off" | "no-profile" }
  | { status: "done"; searchId: number; autoSearchId: number; name: string; found: number; newCount: number }
  | { status: "failed"; searchId: number; autoSearchId: number; name: string; error: string };

/** Runs at most one due automatic search. Used by the scheduler and on visiting the job pages. */
export async function runDueAutoSearch(onEvent?: (e: ResearchEvent) => void): Promise<AutoRunResult> {
  if (!isAiConfigured()) return { status: "idle", reason: "ai-off" };
  const profile = await getCareerProfile();
  if (profile.resume.trim().length < MIN_RESUME_CHARS && !profile.targetRoles.trim())
    return { status: "idle", reason: "no-profile" };
  const claimed = await claimDueAutoSearch();
  if (!claimed) return { status: "idle", reason: "nothing-due" };
  try {
    const seen = await seenPostings();
    const found = await findJobs({
      profile,
      criteria: claimed.criteria,
      alreadySaved: seen.titles.slice(0, 100),
      onEvent,
    });
    const fresh = found.jobs.filter((j) => {
      const key = normalizeUrl(j.url);
      return key !== null && !seen.urls.has(key);
    });
    const row = await saveSearch({
      criteria: claimed.criteria,
      results: fresh,
      sources: found.sources,
      notes: found.notes,
      searches: found.searches,
      dropped: found.dropped,
      error: null,
      autoSearchId: claimed.id,
      skippedSeen: found.jobs.length - fresh.length,
    });
    await finishAutoSearch(claimed.id, claimed.interval_days, null);
    log.info("jobs", "automatic search finished", {
      id: claimed.id,
      found: found.jobs.length,
      new: fresh.length,
    });
    return {
      status: "done",
      searchId: row.id,
      autoSearchId: claimed.id,
      name: claimed.name,
      found: found.jobs.length,
      newCount: fresh.length,
    };
  } catch (err) {
    const error = describeAiError(err).slice(0, 500);
    log.warn("jobs", "automatic search failed", { id: claimed.id, error });
    const row = await saveSearch({
      criteria: claimed.criteria,
      results: [],
      sources: [],
      notes: "",
      searches: 0,
      dropped: 0,
      error,
      autoSearchId: claimed.id,
      skippedSeen: 0,
    });
    await finishAutoSearch(claimed.id, claimed.interval_days, error);
    return { status: "failed", searchId: row.id, autoSearchId: claimed.id, name: claimed.name, error };
  }
}

/** Automatic runs whose results the user has not opened yet. */
export async function unviewedAutoRuns() {
  return db
    .select({ id: jobSearches.id, results: jobSearches.results, autoSearchId: jobSearches.autoSearchId })
    .from(jobSearches)
    .where(
      and(
        eq(jobSearches.userId, getCurrentUserId()),
        isNotNull(jobSearches.autoSearchId),
        isNull(jobSearches.viewedAt),
        isNull(jobSearches.error),
        sql`jsonb_array_length(${jobSearches.results}) > 0`,
      ),
    )
    .orderBy(desc(jobSearches.createdAt));
}

export async function markSearchViewed(id: number) {
  await db
    .update(jobSearches)
    .set({ viewedAt: new Date() })
    .where(
      and(eq(jobSearches.id, id), eq(jobSearches.userId, getCurrentUserId()), isNull(jobSearches.viewedAt)),
    );
}

/** Names of automatic searches by id, for labelling runs in the history. */
export async function autoSearchNames(): Promise<Map<number, string>> {
  const rows = await db
    .select({ id: jobAutoSearches.id, name: jobAutoSearches.name })
    .from(jobAutoSearches)
    .where(eq(jobAutoSearches.userId, getCurrentUserId()));
  return new Map(rows.map((r) => [r.id, r.name]));
}
