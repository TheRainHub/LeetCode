import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { directDatabaseUrl, usesTransactionPooler } from "../src/lib/db/url";

const url = directDatabaseUrl();

/** Migrations recorded by drizzle so far (0 before the first run). */
async function appliedCount(sql: postgres.Sql): Promise<number> {
  const [table] = await sql<{ name: string | null }[]>`
    select to_regclass('drizzle.__drizzle_migrations')::text as name`;
  if (!table?.name) return 0;
  const [row] = await sql<{ n: number }[]>`select count(*)::int as n from drizzle.__drizzle_migrations`;
  return row?.n ?? 0;
}

async function main() {
  const sql = postgres(url, { max: 1, prepare: !usesTransactionPooler(url), onnotice: () => {} });
  try {
    const before = await appliedCount(sql);
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    const applied = (await appliedCount(sql)) - before;
    console.log(
      applied > 0
        ? `[migrate] applied ${applied} new migration${applied === 1 ? "" : "s"}; database is up to date`
        : "[migrate] no new migrations; database is up to date",
    );
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err instanceof Error ? err.message : err);
  console.error("Is PostgreSQL running and DATABASE_URL correct? See README → Database setup.");
  process.exit(1);
});
