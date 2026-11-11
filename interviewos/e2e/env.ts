export const APP_PORT = Number(process.env.E2E_PORT ?? 3210);
export const MOCK_PORT = Number(process.env.E2E_MOCK_PORT ?? 4010);
export const MOCK_URL = `http://127.0.0.1:${MOCK_PORT}`;
/** A dummy key: requests go to the local mock, never to Anthropic. */
export const E2E_API_KEY = "e2e-dummy-key-not-a-secret";
export const E2E_DATABASE_URL =
  process.env.E2E_DATABASE_URL ?? "postgres://interviewos:interviewos@localhost:5432/interviewos_test";
export const TIMEZONE = "Europe/Prague";

/** Today's date in the app's time zone (YYYY-MM-DD). */
export function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}
