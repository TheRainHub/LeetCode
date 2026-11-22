import { NextResponse, type NextRequest } from "next/server";
import { accessConfig, accessToken, verifyAccess } from "@/lib/access";
import { isAuthorized } from "@/lib/auth";
import { isHostedDeployment } from "@/lib/runtime";

const text = (body: string, status: number, headers: Record<string, string> = {}) =>
  new NextResponse(body, { status, headers: { "Content-Type": "text/plain; charset=utf-8", ...headers } });

/** Scheduler endpoint: authenticated by CRON_SECRET in the route itself (see the route). */
const CRON_PATH = "/api/cron/job-search";

/**
 * Access control. InterviewOS has a single user and no accounts, so every request is checked here:
 *
 * - Cloudflare Access configured (CF_ACCESS_TEAM_DOMAIN + CF_ACCESS_AUD): the signed Access token
 *   must be valid for this application (and, if CF_ACCESS_ALLOWED_EMAILS is set, belong to one of
 *   those addresses).
 * - Otherwise APP_PASSWORD: HTTP Basic Auth with that password.
 * - Neither: allowed for local use only; a hosted deployment (Vercel, Cloudflare) refuses to serve.
 *
 * The scheduler endpoint is the one exception: it checks its own bearer secret (CRON_SECRET).
 */
export async function proxy(request: NextRequest) {
  if (request.nextUrl.pathname === CRON_PATH) return NextResponse.next();
  const access = accessConfig();
  if (access) {
    const result = await verifyAccess(accessToken(request.headers), access);
    if (result.ok) return NextResponse.next();
    return text(
      result.reason === "email"
        ? "This account is not allowed to use InterviewOS."
        : "Sign in through Cloudflare Access to use InterviewOS.",
      403,
    );
  }

  const password = process.env.APP_PASSWORD?.trim();
  if (!password) {
    if (isHostedDeployment())
      return text(
        "InterviewOS is not configured: protect it with Cloudflare Access (set CF_ACCESS_TEAM_DOMAIN and CF_ACCESS_AUD) or set APP_PASSWORD, then redeploy.",
        503,
      );
    return NextResponse.next();
  }
  if (isAuthorized(request.headers.get("authorization"), password)) return NextResponse.next();
  return text("Authentication required.", 401, {
    "WWW-Authenticate": 'Basic realm="InterviewOS", charset="UTF-8"',
  });
}

export const config = {
  // Static build output and the Monaco editor bundle are public code; everything else is protected.
  matcher: ["/((?!_next/static|_next/image|monaco/|favicon.ico|icon|apple-icon).*)"],
};
