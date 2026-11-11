import "dotenv/config";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import postgres from "postgres";
import { directDatabaseUrl, usesTransactionPooler } from "../src/lib/db/url";

const url = directDatabaseUrl();

async function main() {
  const sql = postgres(url, { max: 1, prepare: !usesTransactionPooler(url), onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder: "./drizzle" });
    console.log("[migrate] database is up to date");
  } finally {
    await sql.end();
  }
}

main().catch((err) => {
  console.error("[migrate] failed:", err instanceof Error ? err.message : err);
  console.error("Is PostgreSQL running and DATABASE_URL correct? See README → Database setup.");
  process.exit(1);
});
