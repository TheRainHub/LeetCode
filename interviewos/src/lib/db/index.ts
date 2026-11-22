import { getCloudflareContext } from "@opennextjs/cloudflare/cloudflare-context";
import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import { isCloudflareWorker } from "@/lib/runtime";
import * as schema from "./schema";
import { usesTransactionPooler } from "./url";

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __interviewosSql?: postgres.Sql; __interviewosDb?: Database };

/** Node.js (local, Vercel, scripts): one pool per process, reused across hot reloads in development. */
function nodeDb(): Database {
  if (globalForDb.__interviewosDb) return globalForDb.__interviewosDb;
  const url = env().DATABASE_URL;
  const sql =
    globalForDb.__interviewosSql ??
    postgres(url, {
      // Serverless instances each hold a pool; keep it small there.
      max: process.env.VERCEL ? 3 : 10,
      // Transaction-mode poolers (Neon "-pooler", PgBouncer) don't support prepared statements.
      prepare: !usesTransactionPooler(url),
      onnotice: () => {},
    });
  globalForDb.__interviewosSql = sql;
  globalForDb.__interviewosDb = drizzle(sql, { schema });
  return globalForDb.__interviewosDb;
}

/**
 * Cloudflare Workers cannot share a connection between requests, so each request gets its own
 * client. With a Hyperdrive binding named HYPERDRIVE the connection goes through Cloudflare's
 * pool; without one, DATABASE_URL is used directly.
 */
const perRequest = new WeakMap<object, Database>();

function workerDb(): Database | null {
  let context: { env: Record<string, unknown> };
  try {
    context = getCloudflareContext() as unknown as { env: Record<string, unknown> };
  } catch {
    return null;
  }
  const cached = perRequest.get(context);
  if (cached) return cached;
  const hyperdrive = context.env.HYPERDRIVE as { connectionString?: string } | undefined;
  const url = hyperdrive?.connectionString ?? env().DATABASE_URL;
  const sql = postgres(url, {
    max: 5,
    prepare: hyperdrive ? true : !usesTransactionPooler(url),
    onnotice: () => {},
  });
  const instance = drizzle(sql, { schema });
  perRequest.set(context, instance);
  return instance;
}

function current(): Database {
  return (isCloudflareWorker() && workerDb()) || nodeDb();
}

/** Database handle; resolves to the right client for the runtime and request on each use. */
export const db: Database = new Proxy({} as Database, {
  get(_target, prop) {
    const target = current();
    const value = Reflect.get(target, prop, target) as unknown;
    return typeof value === "function" ? (value as (...args: unknown[]) => unknown).bind(target) : value;
  },
});

export { schema };
