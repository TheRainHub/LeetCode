import { drizzle, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { env } from "@/lib/env";
import * as schema from "./schema";

export type Database = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as { __interviewosSql?: postgres.Sql; __interviewosDb?: Database };

function create(): Database {
  const sql = globalForDb.__interviewosSql ?? postgres(env().DATABASE_URL, { max: 10, onnotice: () => {} });
  // Reuse the connection pool across hot reloads in development.
  globalForDb.__interviewosSql = sql;
  return drizzle(sql, { schema, casing: undefined });
}

export const db: Database = globalForDb.__interviewosDb ?? create();
if (process.env.NODE_ENV !== "production") globalForDb.__interviewosDb = db;

export { schema };
