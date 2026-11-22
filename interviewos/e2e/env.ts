import { randomBytes } from "node:crypto";

export const APP_PORT = Number(process.env.E2E_PORT ?? 3210);
export const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? 4010);
export const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
/**
 * Throwaway values generated once per test run in the Playwright runner and inherited by its
 * workers and the web server, so no credential-like literal is committed.
 */
function perRunValue(name: string): string {
  process.env[name] ??= randomBytes(16).toString("hex");
  return process.env[name];
}

/** A dummy key: requests go to the local mock, never to Anthropic. */
export const E2E_API_KEY = perRunValue("E2E_API_KEY");
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://interviewos:interviewos@localhost:5432/interviewos_test";
export const TIMEZONE = "Europe/Prague";
/** Scheduler secret for the test server only. */
export const E2E_CRON_SECRET = perRunValue("E2E_CRON_SECRET");

/** Today's date in the app's time zone (YYYY-MM-DD). */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
