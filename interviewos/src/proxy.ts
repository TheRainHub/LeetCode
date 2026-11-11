import { NextResponse, type NextRequest } from "next/server";
import { isAuthorized } from "@/lib/auth";

/**
 * Password protection (HTTP Basic Auth) for deployments.
 *
 * - APP_PASSWORD set: every page, API route and server action requires it.
 * - APP_PASSWORD unset: allowed for local use; on Vercel the app refuses to
 *   serve anything, because InterviewOS has no other authentication.
 */
export function proxy(request: NextRequest) {
  const password = process.env.APP_PASSWORD?.trim();
  if (!password) {
    if (process.env.VERCEL) {
      return new NextResponse(
        "InterviewOS is not configured: set the APP_PASSWORD environment variable in the Vercel project settings and redeploy.",
        { status: 503, headers: { "Content-Type": "text/plain; charset=utf-8" } },
      );
    }
    return NextResponse.next();
  }
  if (isAuthorized(request.headers.get("authorization"), password)) return NextResponse.next();
  return new NextResponse("Authentication required.", {
    status: 401,
    headers: {
      "WWW-Authenticate": 'Basic realm="InterviewOS", charset="UTF-8"',
      "Content-Type": "text/plain; charset=utf-8",
    },
  });
}

export const config = {
  // Static build output and the Monaco editor bundle are public code; everything else is protected.
  matcher: ["/((?!_next/static|_next/image|monaco/|favicon.ico|icon|apple-icon).*)"],
};
