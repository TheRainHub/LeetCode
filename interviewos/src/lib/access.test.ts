// @vitest-environment node
import { exportJWK, generateKeyPair, SignJWT } from "jose";
import { beforeEach, describe, expect, it } from "vitest";
import { accessConfig, accessToken, resetAccessKeyCache, verifyAccess } from "./access";

const TEAM = "https://myteam.cloudflareaccess.com";
const AUD = "aud-tag-123";

async function setup() {
  const { privateKey, publicKey } = await generateKeyPair("RS256");
  const jwk = { ...(await exportJWK(publicKey)), kid: "k1", alg: "RS256", use: "sig" };
  let calls = 0;
  const fetcher = (async (url: string | URL | Request) => {
    calls++;
    expect(String(url)).toBe(`${TEAM}/cdn-cgi/access/certs`);
    return new Response(JSON.stringify({ keys: [jwk] }), { headers: { "content-type": "application/json" } });
  }) as typeof fetch;
  const sign = (claims: Record<string, unknown>, opts: { aud?: string; iss?: string; exp?: string } = {}) =>
    new SignJWT(claims)
      .setProtectedHeader({ alg: "RS256", kid: "k1" })
      .setIssuer(opts.iss ?? TEAM)
      .setAudience(opts.aud ?? AUD)
      .setIssuedAt()
      .setExpirationTime(opts.exp ?? "5m")
      .sign(privateKey);
  return { fetcher, sign, calls: () => calls };
}

describe("Cloudflare Access verification", () => {
  beforeEach(() => resetAccessKeyCache());

  it("reads the configuration and normalises the team domain", () => {
    expect(accessConfig({})).toBeNull();
    expect(accessConfig({ CF_ACCESS_TEAM_DOMAIN: "myteam", CF_ACCESS_AUD: AUD })).toEqual({
      teamDomain: TEAM,
      audience: AUD,
      emails: [],
    });
    expect(
      accessConfig({
        CF_ACCESS_TEAM_DOMAIN: "https://myteam.cloudflareaccess.com/",
        CF_ACCESS_AUD: AUD,
        CF_ACCESS_ALLOWED_EMAILS: " Me@Example.com, other@example.com ",
      })?.emails,
    ).toEqual(["me@example.com", "other@example.com"]);
  });

  it("takes the token from the Access header or the CF_Authorization cookie", () => {
    expect(accessToken(new Headers({ "cf-access-jwt-assertion": "a.b.c" }))).toBe("a.b.c");
    expect(accessToken(new Headers({ cookie: "x=1; CF_Authorization=d.e.f; y=2" }))).toBe("d.e.f");
    expect(accessToken(new Headers())).toBeNull();
  });

  it("accepts a valid token and rejects wrong audience, issuer, expiry or e-mail", async () => {
    const { fetcher, sign, calls } = await setup();
    const config = { teamDomain: TEAM, audience: AUD, emails: ["me@example.com"] };
    expect(await verifyAccess(await sign({ email: "Me@Example.com" }), config, fetcher)).toEqual({
      ok: true,
      email: "me@example.com",
    });
    expect(
      await verifyAccess(await sign({ email: "me@example.com" }, { aud: "other" }), config, fetcher),
    ).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(
      await verifyAccess(
        await sign({ email: "me@example.com" }, { iss: "https://evil.example" }),
        config,
        fetcher,
      ),
    ).toEqual({ ok: false, reason: "invalid" });
    expect(
      await verifyAccess(await sign({ email: "me@example.com" }, { exp: "-1m" }), config, fetcher),
    ).toEqual({
      ok: false,
      reason: "invalid",
    });
    expect(await verifyAccess(await sign({ email: "intruder@example.com" }), config, fetcher)).toEqual({
      ok: false,
      reason: "email",
    });
    expect(await verifyAccess(null, config, fetcher)).toEqual({ ok: false, reason: "missing" });
    expect(await verifyAccess("not-a-jwt", config, fetcher)).toEqual({ ok: false, reason: "invalid" });
    // Signing keys are fetched once and cached.
    expect(calls()).toBe(1);
  });
});
