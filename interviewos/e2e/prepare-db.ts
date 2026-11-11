/**
 * Resets the e2e database to an empty schema. Refuses to touch any database
 * whose name does not end in "_test" so it can never wipe real data.
 */
import postgres from "postgres";

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) throw new Error("DATABASE_URL is not set");
  const name = new URL(url).pathname.replace(/^\//, "");
  if (!name.endsWith("_test"))
    throw new Error(
      `Refusing to reset "${name}": e2e only runs against a database whose name ends in _test.`,
    );
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  await sql.unsafe(
    "DROP SCHEMA IF EXISTS drizzle CASCADE; DROP SCHEMA public CASCADE; CREATE SCHEMA public;",
  );
  await sql.end();
  console.log(`[e2e] reset database ${name}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
