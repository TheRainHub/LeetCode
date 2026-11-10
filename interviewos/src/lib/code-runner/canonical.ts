import type { Comparator } from "@/lib/content/types";

/**
 * Canonical JSON used to compare results across TypeScript, Java and Python.
 * The Java and Python harnesses implement the exact same algorithm:
 *   - normalize to JSON-like values (chars become 1-char strings),
 *   - `unorderedList`: sort elements by their canonical JSON,
 *   - `unorderedNested`: sort each inner list, then the outer list,
 *   - serialize without whitespace.
 */

export type Json = null | boolean | number | string | Json[];

export function normalize(value: unknown): Json {
  if (value === null || value === undefined) return null;
  if (typeof value === "boolean" || typeof value === "string") return value;
  if (typeof value === "number") return value;
  if (Array.isArray(value)) return value.map(normalize);
  if (value instanceof Set) return [...value].map(normalize);
  if (typeof value === "object" && value !== null && Symbol.iterator in value) {
    return [...(value as Iterable<unknown>)].map(normalize);
  }
  return String(value);
}

export function toJson(value: Json): string {
  return JSON.stringify(value);
}

function sortByJson(list: Json[]): Json[] {
  return [...list].sort((a, b) => {
    const ja = toJson(a);
    const jb = toJson(b);
    return ja < jb ? -1 : ja > jb ? 1 : 0;
  });
}

export function canonicalJson(value: unknown, comparator: Comparator): string {
  let n = normalize(value);
  if (Array.isArray(n)) {
    if (comparator === "unorderedList") n = sortByJson(n);
    if (comparator === "unorderedNested") n = sortByJson(n.map((inner) => (Array.isArray(inner) ? sortByJson(inner) : inner)));
  }
  return toJson(n);
}

export function valuesEqual(actual: unknown, expected: unknown, comparator: Comparator): boolean {
  return canonicalJson(actual, comparator) === canonicalJson(expected, comparator);
}
