const LOCAL = "postgres://interviewos:interviewos@localhost:5432/interviewos";

/** Connection string for the app. Falls back to POSTGRES_URL (set by some hosting integrations). */
export function databaseUrl(env: Record<string, string | undefined> = process.env): string {
  return env.DATABASE_URL?.trim() || env.POSTGRES_URL?.trim() || LOCAL;
}

/**
 * Direct (non-pooled) connection for migrations and the seed, which use
 * transactions and many statements. Hosted Postgres integrations usually
 * provide one next to the pooled URL.
 */
export function directDatabaseUrl(env: Record<string, string | undefined> = process.env): string {
  return env.DATABASE_URL_UNPOOLED?.trim() || env.POSTGRES_URL_NON_POOLING?.trim() || databaseUrl(env);
}

/**
 * True for connection poolers in transaction mode (PgBouncer, Neon's "-pooler"
 * hosts, Supabase's port 6543), which don't support prepared statements.
 */
export function usesTransactionPooler(
  url: string,
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (env.DATABASE_POOLED === "true") return true;
  if (env.DATABASE_POOLED === "false") return false;
  try {
    const u = new URL(url);
    return u.hostname.includes("-pooler.") || u.port === "6543" || u.searchParams.get("pgbouncer") === "true";
  } catch {
    return false;
  }
}
