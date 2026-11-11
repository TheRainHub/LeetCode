import { BANK_WINDOWS, type BankWindow } from "./parse";

export const BANK_SORTS = ["relevance", "title", "difficulty"] as const;
export type BankSort = (typeof BANK_SORTS)[number];
export const BANK_STATUSES = ["planned", "attempted", "solved", "solved_with_help"] as const;
export type BankStatus = (typeof BANK_STATUSES)[number];
export const BANK_STATUS_FILTERS = ["none", ...BANK_STATUSES] as const;
export type BankStatusFilter = (typeof BANK_STATUS_FILTERS)[number];
const DIFFICULTIES = ["easy", "medium", "hard"] as const;

export interface BankFilters {
  q: string;
  company: string | null;
  window: BankWindow;
  difficulty: (typeof DIFFICULTIES)[number] | null;
  pattern: string | null;
  tag: string | null;
  lesson: string | null;
  status: BankStatusFilter | null;
  sort: BankSort;
  page: number;
}

export const DEFAULT_BANK_FILTERS: BankFilters = {
  q: "",
  company: null,
  window: "all",
  difficulty: null,
  pattern: null,
  tag: null,
  lesson: null,
  status: null,
  sort: "relevance",
  page: 1,
};

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v)?.trim() || undefined;
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]): T | null =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : null;
const SLUG = /^[a-z0-9][a-z0-9-]{0,119}$/;

/** Parses URL search params into filters. Unknown or malformed values fall back to defaults. */
export function parseBankFilters(sp: Params): BankFilters {
  const page = Number(first(sp.page));
  const tag = first(sp.tag);
  const slug = (v: string | undefined) => (v && SLUG.test(v) ? v : null);
  return {
    q: (first(sp.q) ?? "").slice(0, 100),
    company: slug(first(sp.company)),
    window: oneOf(first(sp.window), BANK_WINDOWS) ?? "all",
    difficulty: oneOf(first(sp.difficulty), DIFFICULTIES),
    pattern: slug(first(sp.pattern)),
    tag: tag && tag.length <= 60 ? tag : null,
    lesson: slug(first(sp.lesson)),
    status: oneOf(first(sp.status), BANK_STATUS_FILTERS),
    sort: oneOf(first(sp.sort), BANK_SORTS) ?? "relevance",
    page: Number.isInteger(page) && page >= 1 && page <= 10_000 ? page : 1,
  };
}

/** Builds a bank URL from filters plus overrides; omits defaults and resets the page unless given. */
export function bankHref(filters: BankFilters, patch: Partial<BankFilters> = {}): string {
  const merged: BankFilters = { ...filters, page: 1, ...patch };
  const q = new URLSearchParams();
  for (const key of Object.keys(DEFAULT_BANK_FILTERS) as (keyof BankFilters)[]) {
    const value = merged[key];
    if (value === null || value === "" || value === DEFAULT_BANK_FILTERS[key]) continue;
    q.set(key, String(value));
  }
  const s = q.toString();
  return s ? `/practice/bank?${s}` : "/practice/bank";
}
