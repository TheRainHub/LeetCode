import { createLocalJWKSet, type JSONWebKeySet, jwtVerify } from "jose";

/**
 * Cloudflare Access (Zero Trust) protects the deployed Worker at the edge. The app also verifies
 * the signed token Access attaches to every request, so a route that Access does not cover (or a
 * misconfiguration) still cannot reach the app.
 */
export interface AccessConfig {
  /** e.g. https://myteam.cloudflareaccess.com */
  teamDomain: string;
  /** Application Audience (AUD) tag from the Access application. */
  audience: string;
  /** Optional allow-list of e-mail addresses (lower case). Empty = any identity Access lets through. */
  emails: string[];
}

export function accessConfig(env: Record<string, string | undefined> = process.env): AccessConfig | null {
  const team = env.CF_ACCESS_TEAM_DOMAIN?.trim();
  const audience = env.CF_ACCESS_AUD?.trim();
  if (!team || !audience) return null;
  const host = team.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  const teamDomain = `https://${host.includes(".") ? host : `${host}.cloudflareaccess.com`}`;
  const emails = (env.CF_ACCESS_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return { teamDomain, audience, emails };
}

/** The Access token: the header Access adds, or the cookie it sets in the browser. */
export function accessToken(headers: Headers): string | null {
  const header = headers.get("cf-access-jwt-assertion");
  if (header) return header;
  const cookie = headers.get("cookie") ?? "";
  const match = /(?:^|;\s*)CF_Authorization=([^;]+)/.exec(cookie);
  return match?.[1] ?? null;
}

// Public keys are plain data, so they can be cached across requests (unlike I/O objects on Workers).
let keyCache: { domain: string; jwks: JSONWebKeySet; at: number } | null = null;
const KEY_TTL_MS = 10 * 60_000;

async function signingKeys(teamDomain: string, fetcher: typeof fetch): Promise<JSONWebKeySet> {
  if (keyCache && keyCache.domain === teamDomain && Date.now() - keyCache.at < KEY_TTL_MS)
    return keyCache.jwks;
  const res = await fetcher(`${teamDomain}/cdn-cgi/access/certs`);
  if (!res.ok) throw new Error(`Access certs request failed (${res.status})`);
  const jwks = (await res.json()) as JSONWebKeySet;
  keyCache = { domain: teamDomain, jwks, at: Date.now() };
  return jwks;
}

export type AccessResult =
  { ok: true; email: string | null } | { ok: false; reason: "missing" | "invalid" | "email" };

export async function verifyAccess(
  token: string | null,
  config: AccessConfig,
  fetcher: typeof fetch = fetch,
): Promise<AccessResult> {
  if (!token) return { ok: false, reason: "missing" };
  try {
    const jwks = createLocalJWKSet(await signingKeys(config.teamDomain, fetcher));
    const { payload } = await jwtVerify(token, jwks, {
      issuer: config.teamDomain,
      audience: config.audience,
    });
    const email = typeof payload.email === "string" ? payload.email.toLowerCase() : null;
    if (config.emails.length && (!email || !config.emails.includes(email)))
      return { ok: false, reason: "email" };
    return { ok: true, email };
  } catch {
    return { ok: false, reason: "invalid" };
  }
}

/** Test hook: forget cached signing keys. */
export function resetAccessKeyCache() {
  keyCache = null;
}
