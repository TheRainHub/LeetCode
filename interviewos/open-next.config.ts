import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Every page reads live data from PostgreSQL (the root layout is force-dynamic), so no
// incremental cache is configured.
const base = defineCloudflareConfig({});

// The webpack build shares server chunks between routes; Turbopack's output for this app
// duplicates them and does not fit the 3 MiB (gzip) Worker limit of the Workers Free plan.
const config = { ...base, buildCommand: "npx next build --webpack" };

export default config;
