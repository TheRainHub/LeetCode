import { defineConfig, devices } from "@playwright/test";
import { APP_PORT, E2E_API_KEY, E2E_DATABASE_URL, MOCK_PORT, MOCK_URL, TIMEZONE } from "./e2e/env";

/**
 * End-to-end tests run against a production build on a dedicated database
 * (reset on every run) with the Anthropic API replaced by a local mock.
 * Set E2E_DEV=1 to run against `next dev` instead of a production build.
 */
const serve = process.env.E2E_DEV ? `npx next dev -p ${APP_PORT}` : `npx next build && npx next start -p ${APP_PORT}`;

export default defineConfig({
  testDir: "./e2e",
  // Tests share one database and are written to run in file order.
  fullyParallel: false,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 20_000 },
  reporter: [["list"]],
  use: {
    baseURL: `http://127.0.0.1:${APP_PORT}`,
    trace: "off",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 900 } } }],
  webServer: [
    {
      command: "node e2e/mock-anthropic.mjs",
      url: `${MOCK_URL}/__health`,
      env: { MOCK_PORT: String(MOCK_PORT) },
      reuseExistingServer: false,
    },
    {
      command: `npx tsx e2e/prepare-db.ts && npx tsx scripts/migrate.ts && npx tsx scripts/seed.ts && ${serve}`,
      url: `http://127.0.0.1:${APP_PORT}/settings`,
      timeout: 600_000,
      reuseExistingServer: false,
      stdout: "pipe",
      env: {
        DATABASE_URL: E2E_DATABASE_URL,
        ANTHROPIC_API_KEY: E2E_API_KEY,
        ANTHROPIC_BASE_URL: MOCK_URL,
        APP_TIMEZONE: TIMEZONE,
      },
    },
  ],
});
