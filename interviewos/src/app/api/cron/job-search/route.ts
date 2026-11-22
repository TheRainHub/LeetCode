import { NextResponse } from "next/server";
import { isCronAuthorized } from "@/lib/auth";
import { runDueAutoSearch } from "@/server/job-auto";

// One web-research run takes a few minutes (Vercel function limit; Workers have no wall-clock limit).
export const maxDuration = 300;

/**
 * Called by the scheduler (Cloudflare Cron Trigger through worker.mjs, or Vercel Cron). Runs at most
 * one due automatic job search per call. The access check in proxy.ts is skipped for this path; the
 * route authenticates with CRON_SECRET instead.
 */
async function handle(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (!secret?.trim())
    return NextResponse.json({ error: "Scheduled job search is off: set CRON_SECRET." }, { status: 503 });
  if (!isCronAuthorized(request.headers.get("authorization"), secret))
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const result = await runDueAutoSearch();
  return NextResponse.json(result);
}

export const GET = handle;
export const POST = handle;
