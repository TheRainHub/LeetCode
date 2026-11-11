import { describe, expect, it } from "vitest";
import { isAuthorized, safeEqual } from "./auth";
import { databaseUrl, directDatabaseUrl, usesTransactionPooler } from "./db/url";

const basic = (user: string, pass: string) => `Basic ${Buffer.from(`${user}:${pass}`).toString("base64")}`;

describe("isAuthorized", () => {
  it("accepts the right password with any user name", () => {
    expect(isAuthorized(basic("me", "s3cret:with-colon"), "s3cret:with-colon")).toBe(true);
    expect(isAuthorized(basic("", "s3cret"), "s3cret")).toBe(true);
  });
  it("rejects missing, malformed or wrong credentials", () => {
    expect(isAuthorized(null, "s3cret")).toBe(false);
    expect(isAuthorized("Bearer abc", "s3cret")).toBe(false);
    expect(isAuthorized("Basic !!!", "s3cret")).toBe(false);
    expect(isAuthorized(basic("me", "s3cre"), "s3cret")).toBe(false);
    expect(safeEqual("a", "b")).toBe(false);
  });
});

describe("database URLs", () => {
  it("prefers DATABASE_URL, then POSTGRES_URL, then the local default", () => {
    expect(databaseUrl({ DATABASE_URL: "postgres://a", POSTGRES_URL: "postgres://b" })).toBe("postgres://a");
    expect(databaseUrl({ POSTGRES_URL: "postgres://b" })).toBe("postgres://b");
    expect(databaseUrl({})).toContain("localhost");
  });
  it("uses the unpooled URL for migrations when available", () => {
    expect(
      directDatabaseUrl({ DATABASE_URL: "postgres://pooled", DATABASE_URL_UNPOOLED: "postgres://direct" }),
    ).toBe("postgres://direct");
    expect(directDatabaseUrl({ DATABASE_URL: "postgres://pooled" })).toBe("postgres://pooled");
  });
  it("detects transaction-mode poolers", () => {
    expect(
      usesTransactionPooler("postgres://u:p@ep-cool-1234-pooler.eu-central-1.aws.neon.tech/db", {}),
    ).toBe(true);
    expect(usesTransactionPooler("postgres://u:p@db.example.com:6543/postgres", {})).toBe(true);
    expect(usesTransactionPooler("postgres://u:p@localhost:5432/interviewos", {})).toBe(false);
    expect(usesTransactionPooler("postgres://u:p@localhost:5432/x", { DATABASE_POOLED: "true" })).toBe(true);
  });
});
