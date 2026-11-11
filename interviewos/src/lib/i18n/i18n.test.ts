import { describe, expect, it } from "vitest";
import { plural } from "./define";
import { getMessagesFor } from "./index";

function shape(value: unknown, path = ""): string[] {
  if (typeof value === "function") return [`${path}:fn${value.length}`];
  if (Array.isArray(value)) return [`${path}:array${value.length}`];
  if (value && typeof value === "object")
    return Object.entries(value).flatMap(([k, v]) => shape(v, path ? `${path}.${k}` : k));
  return [`${path}:${typeof value}`];
}

describe("i18n", () => {
  it("has identical message shapes in English and Russian", () => {
    expect(shape(getMessagesFor("ru")).sort()).toEqual(shape(getMessagesFor("en")).sort());
  });
  it("has no empty strings", () => {
    const empty: string[] = [];
    const walk = (v: unknown, path: string) => {
      if (typeof v === "string" && v.trim() === "" && !path.endsWith("reasons.normal")) empty.push(path);
      else if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) walk(x, `${path}.${k}`);
    };
    for (const locale of ["en", "ru"] as const) walk(getMessagesFor(locale), locale);
    expect(empty).toEqual([]);
  });
  it("pluralizes Russian correctly", () => {
    const f = { one: "день", few: "дня", many: "дней" };
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => plural("ru", n, f))).toEqual([
      "день",
      "дня",
      "дней",
      "дней",
      "день",
      "дня",
      "дней",
    ]);
  });
});
