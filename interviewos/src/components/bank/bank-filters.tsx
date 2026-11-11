"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n/client";
import {
  BANK_SORTS,
  BANK_STATUS_FILTERS,
  bankHref,
  parseBankFilters,
  type BankFilters,
} from "@/lib/problem-bank/filters";
import { BANK_WINDOWS } from "@/lib/problem-bank/parse";

export interface FilterOptions {
  companies: { slug: string; name: string; tracked: boolean; problems: number }[];
  patterns: { slug: string; name: string; position: number }[];
  tags: { tag: string; count: number }[];
  lessons: { slug: string; title: string }[];
}

const selectClass =
  "border-border bg-surface text-foreground h-8 w-full rounded-md border px-2 text-xs focus-visible:outline-2 focus-visible:outline-[var(--primary)]";

/** Filter bar. Changing a select submits immediately; the URL is the source of truth. */
export function BankFilters({ filters, options }: { filters: BankFilters; options: FilterOptions }) {
  const { m } = useI18n();
  const F = m.bank.filters;
  const router = useRouter();
  const go = (form: HTMLFormElement) => {
    const values = Object.fromEntries([...new FormData(form).entries()].map(([k, v]) => [k, String(v)]));
    router.push(bankHref(parseBankFilters(values)));
  };
  const submit = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (e.currentTarget.form) go(e.currentTarget.form);
  };
  const tracked = options.companies.filter((c) => c.tracked);
  const field = (id: string, label: string, control: React.ReactNode) => (
    <label htmlFor={id} className="flex min-w-0 flex-col gap-1">
      <span className="text-muted-foreground text-[11px]">{label}</span>
      {control}
    </label>
  );

  return (
    <form
      action="/practice/bank"
      method="get"
      onSubmit={(e) => {
        e.preventDefault();
        go(e.currentTarget);
      }}
      className="border-border bg-surface mb-4 rounded-lg border p-3"
      data-testid="bank-filters"
    >
      <div className="mb-3 flex gap-2">
        <div className="relative flex-1">
          <Search className="text-subtle-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={F.search}
            aria-label={F.search}
            className="border-border bg-surface h-8 w-full rounded-md border pr-2 pl-8 text-sm"
          />
        </div>
        <Button type="submit" size="sm" variant="primary">
          {F.apply}
        </Button>
        <Button asChild size="sm" variant="ghost">
          <Link href="/practice/bank">{F.reset}</Link>
        </Button>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-8">
        {field(
          "bank-company",
          F.company,
          <select
            id="bank-company"
            name="company"
            defaultValue={filters.company ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <option value="">{F.anyCompany}</option>
            {tracked.length ? (
              <optgroup label={F.targetCompanies}>
                {tracked.map((c) => (
                  <option key={`t-${c.slug}`} value={c.slug}>
                    {c.name} ({c.problems})
                  </option>
                ))}
              </optgroup>
            ) : null}
            <optgroup label={F.allCompanies}>
              {options.companies.map((c) => (
                <option key={c.slug} value={c.slug}>
                  {c.name} ({c.problems})
                </option>
              ))}
            </optgroup>
          </select>,
        )}
        {field(
          "bank-window",
          F.window,
          <select
            id="bank-window"
            name="window"
            defaultValue={filters.window}
            onChange={submit}
            className={selectClass}
          >
            {BANK_WINDOWS.map((w) => (
              <option key={w} value={w}>
                {F.windows[w]}
              </option>
            ))}
          </select>,
        )}
        {field(
          "bank-difficulty",
          F.difficulty,
          <select
            id="bank-difficulty"
            name="difficulty"
            defaultValue={filters.difficulty ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <option value="">{F.anyDifficulty}</option>
            {(["easy", "medium", "hard"] as const).map((d) => (
              <option key={d} value={d}>
                {m.common.difficulty[d]}
              </option>
            ))}
          </select>,
        )}
        {field(
          "bank-pattern",
          F.pattern,
          <select
            id="bank-pattern"
            name="pattern"
            defaultValue={filters.pattern ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <option value="">{F.anyPattern}</option>
            {options.patterns.map((p) => (
              <option key={p.slug} value={p.slug}>
                {p.position}. {p.name}
              </option>
            ))}
          </select>,
        )}
        {field(
          "bank-tag",
          F.tag,
          <select
            id="bank-tag"
            name="tag"
            defaultValue={filters.tag ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <option value="">{F.anyTag}</option>
            {options.tags.map((t) => (
              <option key={t.tag} value={t.tag}>
                {t.tag} ({t.count})
              </option>
            ))}
          </select>,
        )}
        {field(
          "bank-lesson",
          F.lesson,
          <select
            id="bank-lesson"
            name="lesson"
            defaultValue={filters.lesson ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <option value="">{F.anyLesson}</option>
            {options.lessons.map((l) => (
              <option key={l.slug} value={l.slug}>
                {l.title}
              </option>
            ))}
          </select>,
        )}
        {field(
          "bank-status",
          F.status,
          <select
            id="bank-status"
            name="status"
            defaultValue={filters.status ?? ""}
            onChange={submit}
            className={selectClass}
          >
            <option value="">{F.anyStatus}</option>
            {BANK_STATUS_FILTERS.map((s) => (
              <option key={s} value={s}>
                {m.bank.status[s]}
              </option>
            ))}
          </select>,
        )}
        {field(
          "bank-sort",
          F.sort,
          <select
            id="bank-sort"
            name="sort"
            defaultValue={filters.sort}
            onChange={submit}
            className={selectClass}
          >
            {BANK_SORTS.map((s) => (
              <option key={s} value={s}>
                {F.sorts[s]}
              </option>
            ))}
          </select>,
        )}
      </div>
    </form>
  );
}
