import { Database, Layers } from "lucide-react";
import Link from "next/link";
import { BANK_SOURCES, PATTERN_TO_LESSON, TAG_TO_LESSON } from "@content/problem-bank";
import { BankFilters } from "@/components/bank/bank-filters";
import { BankTable } from "@/components/bank/bank-table";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PracticeTabs } from "@/components/practice/practice-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatDay } from "@/lib/dates";
import { bankHref, parseBankFilters } from "@/lib/problem-bank/filters";
import {
  BANK_PAGE_SIZE,
  getBankOverview,
  lessonTitles,
  listBankCompanyOptions,
  listBankPatterns,
  listBankTags,
  searchBank,
} from "@/server/bank";
import { getDueCards, getDueProblems } from "@/server/srs";
import { getI18n } from "@/server/user";

export const metadata = { title: "Problem bank" };

export default async function ProblemBankPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseBankFilters(await searchParams);
  const [{ m, locale }, overview, dueCards, dueProblems] = await Promise.all([
    getI18n(),
    getBankOverview(),
    getDueCards(500),
    getDueProblems(),
  ]);
  const B = m.bank;
  const header = (
    <>
      <PageHeader
        title={B.title}
        description={B.description}
        actions={
          <Button asChild size="sm" variant="ghost">
            <Link href="/practice/patterns">
              <Layers />
              {B.tabs.patterns}
            </Link>
          </Button>
        }
      />
      <PracticeTabs current="bank" reviewDue={dueCards.length + dueProblems.length} />
    </>
  );

  if (overview.problems === 0) {
    return (
      <PageContainer>
        {header}
        <EmptyState
          icon={<Database />}
          title={B.empty.title}
          description={
            <>
              {B.empty.body}
              <code className="bg-surface-3 text-foreground mt-2 block rounded px-2 py-1 font-mono text-xs">
                npm run bank:import
              </code>
              <span className="mt-2 block">{B.empty.note}</span>
            </>
          }
        />
      </PageContainer>
    );
  }

  const lessonSlugs = [
    ...new Set([
      ...Object.values(TAG_TO_LESSON),
      ...Object.values(PATTERN_TO_LESSON).filter((x): x is string => !!x),
    ]),
  ];
  const [companies, patterns, tags, titles, result] = await Promise.all([
    listBankCompanyOptions(),
    listBankPatterns(),
    listBankTags(),
    lessonTitles(),
    searchBank(filters),
  ]);
  const lessons = lessonSlugs
    .filter((s) => titles.has(s))
    .map((slug) => ({ slug, title: titles.get(slug)! }))
    .sort((a, b) => a.title.localeCompare(b.title));
  const from = (filters.page - 1) * BANK_PAGE_SIZE + 1;
  const to = from + result.rows.length - 1;
  const lastPage = Math.max(1, Math.ceil(result.total / BANK_PAGE_SIZE));

  return (
    <PageContainer wide>
      {header}

      <div className="text-subtle-foreground mb-3 flex flex-col gap-1 text-[11px]">
        <p>
          {B.sources}:{" "}
          {BANK_SOURCES.map((src, i) => {
            const meta = overview.sources.find((x) => x.key === src.key);
            return (
              <span key={src.key}>
                {i > 0 ? " · " : null}
                <a
                  href={src.repoUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-foreground underline"
                >
                  {src.name}
                </a>
                {meta
                  ? ` (${B.imported(formatDay(meta.importedAt.toISOString().slice(0, 10), locale, { weekday: undefined, year: "numeric" }), meta.commit)})`
                  : null}
              </span>
            );
          })}
        </p>
        <p>{B.selfReported}</p>
      </div>

      <BankFilters
        key={bankHref(filters)}
        filters={filters}
        options={{ companies, patterns, tags, lessons }}
      />

      {result.total === -1 ? (
        <EmptyState
          title={B.pageEmpty}
          action={
            <Button asChild size="sm">
              <Link href={bankHref(filters, { page: 1 })}>{B.firstPage}</Link>
            </Button>
          }
        />
      ) : result.rows.length === 0 ? (
        <EmptyState title={B.noResults} />
      ) : (
        <>
          <div className="text-muted-foreground mb-2 flex items-center justify-between text-xs">
            <span data-testid="bank-count">
              {B.results(from, to, result.total)}
              {result.companyName ? ` · ${result.companyName} · ${B.filters.windows[filters.window]}` : null}
            </span>
          </div>
          <Card className="overflow-x-auto">
            <BankTable rows={result.rows} m={m} metric={result.companyName ? "frequency" : "companies"} />
          </Card>
          {lastPage > 1 ? (
            <nav className="mt-3 flex items-center justify-between text-xs" aria-label="Pagination">
              {filters.page > 1 ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href={bankHref(filters, { page: filters.page - 1 })}>← {B.prev}</Link>
                </Button>
              ) : (
                <span />
              )}
              <span className="text-muted-foreground tabular-nums">
                {filters.page} / {lastPage}
              </span>
              {filters.page < lastPage ? (
                <Button asChild size="sm" variant="ghost">
                  <Link href={bankHref(filters, { page: filters.page + 1 })}>{B.next} →</Link>
                </Button>
              ) : (
                <span />
              )}
            </nav>
          ) : null}
        </>
      )}
    </PageContainer>
  );
}
