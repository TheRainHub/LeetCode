import "server-only";
import { sql } from "drizzle-orm";
import journal from "../../drizzle/meta/_journal.json";
import { db } from "@/lib/db";

/** Migrations shipped with this version of the code. */
const SHIPPED = journal.entries.length;

let cachedOk: number | null = null;
const OK_TTL_MS = 60_000;

/**
 * Number of migrations in the code that the database has not applied yet (0 = up to date).
 * Returns null when it cannot tell (e.g. the database is unreachable); callers then stay quiet.
 * A database found up to date is not re-checked for a minute; a lagging one is checked every
 * request, so the warning disappears as soon as `npm run db:migrate` has run.
 */
export async function pendingMigrations(): Promise<number | null> {
  if (cachedOk && Date.now() - cachedOk < OK_TTL_MS) return 0;
  try {
    const [table] = (await db.execute(
      sql`select to_regclass('drizzle.__drizzle_migrations')::text as name`,
    )) as unknown as { name: string | null }[];
    const applied = table?.name
      ? Number(
          (
            (await db.execute(
              sql`select count(*)::int as n from drizzle.__drizzle_migrations`,
            )) as unknown as {
              n: number;
            }[]
          )[0]?.n ?? 0,
        )
      : 0;
    const pending = Math.max(0, SHIPPED - applied);
    cachedOk = pending === 0 ? Date.now() : null;
    return pending;
  } catch {
    return null;
  }
}
