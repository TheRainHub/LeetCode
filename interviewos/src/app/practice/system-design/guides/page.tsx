import { CheckCircle2, Database, Search } from "lucide-react";
import Link from "next/link";
import { GUIDES_SOURCE } from "@content/guides";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PracticeTabs } from "@/components/practice/practice-tabs";
import { SdSubnav } from "@/components/system-design/sd-subnav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import {
  getGuidesOverview,
  GUIDES_PAGE_SIZE,
  guidesHref,
  listGuideCategories,
  parseGuideFilters,
  searchGuides,
} from "@/server/guides";
import { getDueCards, getDueProblems } from "@/server/srs";
import { getI18n } from "@/server/user";

export const metadata = { title: "Visual guides" };

export default async function GuidesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const filters = parseGuideFilters(await searchParams);
  const [{ m, locale }, overview, dueCards, dueProblems] = await Promise.all([
    getI18n(),
    getGuidesOverview(),
    getDueCards(500),
    getDueProblems(),
  ]);
  const G = m.sd.guides;
  const header = (
    <>
      <PageHeader title={G.title} description={G.description} />
      <PracticeTabs current="systemDesign" reviewDue={dueCards.length + dueProblems.length} />
      <SdSubnav current="guides" labels={G.nav} guideCount={overview.total || undefined} />
    </>
  );

  if (overview.total === 0) {
    return (
      <PageContainer wide>
        {header}
        <EmptyState
          icon={<Database />}
          title={G.emptyTitle}
          description={
            <>
              {G.emptyBody}
              <code className="bg-surface-3 text-foreground mt-2 block rounded px-2 py-1 font-mono text-xs">
                npm run guides:import
              </code>
              <span className="mt-2 block">{G.emptyNote}</span>
            </>
          }
        />
      </PageContainer>
    );
  }

  const [categories, result] = await Promise.all([listGuideCategories(), searchGuides(filters)]);
  const from = (filters.page - 1) * GUIDES_PAGE_SIZE + 1;
  const to = from + result.rows.length - 1;
  const lastPage = Math.max(1, Math.ceil(result.total / GUIDES_PAGE_SIZE));
  const categoryTitle = new Map(categories.map((c) => [c.slug, c.title]));
  const chip = (active: boolean) =>
    cn(
      "rounded px-2 py-0.5 whitespace-nowrap",
      active ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <PageContainer wide>
      {header}
      <p className="text-subtle-foreground mb-3 text-[11px]">
        {G.attribution(GUIDES_SOURCE.author, GUIDES_SOURCE.license)}{" "}
        <a
          href={GUIDES_SOURCE.repoUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="hover:text-foreground underline"
        >
          {GUIDES_SOURCE.name}
        </a>{" "}
        ·{" "}
        <a
          href={GUIDES_SOURCE.licenseUrl}
          target="_blank"
          rel="noreferrer noopener"
          className="hover:text-foreground underline"
        >
          {G.license}
        </a>
        {overview.source
          ? ` · ${G.imported(formatDay(overview.source.importedAt.toISOString().slice(0, 10), locale, { weekday: undefined, year: "numeric" }), overview.source.commit)}`
          : null}
        {" · "}
        {G.progress(overview.read, overview.total)}
      </p>

      <form
        action="/practice/system-design/guides"
        method="get"
        className="mb-3 flex gap-2"
        data-testid="guide-search"
      >
        {filters.category ? <input type="hidden" name="category" value={filters.category} /> : null}
        {filters.read ? <input type="hidden" name="read" value={filters.read} /> : null}
        <div className="relative flex-1">
          <Search className="text-subtle-foreground pointer-events-none absolute top-1/2 left-2.5 size-3.5 -translate-y-1/2" />
          <input
            name="q"
            type="search"
            defaultValue={filters.q}
            placeholder={G.search}
            aria-label={G.search}
            className="border-border bg-surface h-8 w-full rounded-md border pr-2 pl-8 text-sm"
          />
        </div>
        <Button type="submit" size="sm" variant="primary">
          {G.search}
        </Button>
      </form>

      <div className="mb-2 flex flex-wrap items-center gap-1 text-xs" data-testid="guide-categories">
        <Link href={guidesHref(filters, { category: null })} className={chip(!filters.category)}>
          {G.all}
        </Link>
        {categories.map((c) => (
          <Link
            key={c.slug}
            href={guidesHref(filters, { category: c.slug })}
            className={chip(filters.category === c.slug)}
          >
            {c.title} <span className="text-subtle-foreground tabular-nums">{c.total}</span>
          </Link>
        ))}
      </div>
      <div className="mb-4 flex flex-wrap items-center gap-1 text-xs">
        {([null, "unread", "read"] as const).map((r) => (
          <Link key={r ?? "all"} href={guidesHref(filters, { read: r })} className={chip(filters.read === r)}>
            {r ? G[r] : G.all}
          </Link>
        ))}
        {result.total ? (
          <span className="text-muted-foreground ml-auto" data-testid="guide-count">
            {G.results(from, to, result.total)}
          </span>
        ) : null}
      </div>

      {result.rows.length === 0 ? (
        <EmptyState title={G.noResults} />
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3" data-testid="guide-grid">
          {result.rows.map((g) => (
            <Link
              key={g.slug}
              href={`/practice/system-design/guides/${g.slug}`}
              className="group"
              data-testid="guide-card"
              data-slug={g.slug}
            >
              <Card className="group-hover:border-border-strong flex h-full flex-col overflow-hidden">
                {g.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={g.imageUrl}
                    alt=""
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="bg-surface-2 aspect-[16/9] w-full object-cover object-top"
                  />
                ) : null}
                <div className="flex flex-1 flex-col gap-1.5 p-3">
                  <div className="flex items-start gap-2">
                    <h2 className="group-hover:text-primary flex-1 text-sm font-semibold">{g.title}</h2>
                    {g.read ? (
                      <CheckCircle2 className="text-success size-4 shrink-0" aria-label={G.markedRead} />
                    ) : null}
                  </div>
                  {g.description ? (
                    <p className="text-muted-foreground line-clamp-2 text-xs">{g.description}</p>
                  ) : null}
                  <div className="mt-auto flex flex-wrap items-center gap-1 pt-1">
                    {g.categories.map((c) => (
                      <Badge key={c} tone="neutral">
                        {categoryTitle.get(c) ?? c}
                      </Badge>
                    ))}
                    {g.publishedOn ? (
                      <span className="text-subtle-foreground ml-auto text-[11px]">
                        {formatDay(g.publishedOn, locale, { weekday: undefined, year: "numeric" })}
                      </span>
                    ) : null}
                  </div>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      )}

      {lastPage > 1 ? (
        <nav className="mt-4 flex items-center justify-between text-xs" aria-label="Pagination">
          {filters.page > 1 ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={guidesHref(filters, { page: filters.page - 1 })}>← {G.prev}</Link>
            </Button>
          ) : (
            <span />
          )}
          <span className="text-muted-foreground tabular-nums">
            {filters.page} / {lastPage}
          </span>
          {filters.page < lastPage ? (
            <Button asChild size="sm" variant="ghost">
              <Link href={guidesHref(filters, { page: filters.page + 1 })}>{G.next} →</Link>
            </Button>
          ) : (
            <span />
          )}
        </nav>
      ) : null}
    </PageContainer>
  );
}
