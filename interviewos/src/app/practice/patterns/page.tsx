import { BookOpen, Database, ExternalLink } from "lucide-react";
import Link from "next/link";
import { VISUALIZATIONS } from "@content/problem-bank";
import { VisualizationLinks } from "@/components/bank/visualizations";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PracticeTabs } from "@/components/practice/practice-tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { bankHref, DEFAULT_BANK_FILTERS } from "@/lib/problem-bank/filters";
import { listBankPatterns } from "@/server/bank";
import { getDueCards, getDueProblems } from "@/server/srs";
import { getI18n } from "@/server/user";

export const metadata = { title: "Coding patterns" };

export default async function PatternsPage() {
  const [{ m }, patterns, dueCards, dueProblems] = await Promise.all([
    getI18n(),
    listBankPatterns(),
    getDueCards(500),
    getDueProblems(),
  ]);
  const P = m.bank.patterns;
  return (
    <PageContainer wide>
      <PageHeader title={P.title} description={P.description} />
      <PracticeTabs current="patterns" reviewDue={dueCards.length + dueProblems.length} />
      {patterns.length === 0 ? (
        <EmptyState
          icon={<Database />}
          title={m.bank.empty.title}
          description={
            <>
              {m.bank.empty.body}
              <code className="bg-surface-3 text-foreground mt-2 block rounded px-2 py-1 font-mono text-xs">
                npm run bank:import
              </code>
            </>
          }
        />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3" data-testid="pattern-grid">
          {patterns.map((p) => (
            <Card key={p.slug} className="flex flex-col gap-3 p-4" data-testid={`pattern-${p.slug}`}>
              <div className="flex items-start justify-between gap-2">
                <h2 className="text-sm font-semibold">
                  <span className="text-subtle-foreground mr-1.5 tabular-nums">{p.position}.</span>
                  {p.name}
                </h2>
                <span className="text-muted-foreground shrink-0 text-[11px]">{P.problems(p.total)}</span>
              </div>
              <div>
                <Progress value={p.total ? (p.solved / p.total) * 100 : 0} />
                <p className="text-subtle-foreground mt-1 text-[11px]">{P.solved(p.solved, p.total)}</p>
              </div>
              <div className="flex flex-col gap-1 text-xs">
                {p.topicSlug && p.topicTitle ? (
                  <Link
                    href={`/learn/lesson/${p.topicSlug}`}
                    className="hover:text-primary inline-flex items-center gap-1.5"
                  >
                    <BookOpen className="text-primary size-3.5" aria-hidden />
                    {P.lesson}: {p.topicTitle}
                  </Link>
                ) : (
                  <span className="text-subtle-foreground">{P.noLesson}</span>
                )}
                <a
                  href={p.sourceUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-primary inline-flex items-center gap-1.5"
                >
                  <ExternalLink className="size-3.5" aria-hidden />
                  {P.notes}
                </a>
              </div>
              {p.topicSlug && VISUALIZATIONS[p.topicSlug] ? (
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer">{P.visualize}</summary>
                  <div className="mt-2">
                    <VisualizationLinks lesson={p.topicSlug} m={m} />
                  </div>
                </details>
              ) : null}
              <Button asChild size="sm" variant="secondary" className="mt-auto self-start">
                <Link href={bankHref(DEFAULT_BANK_FILTERS, { pattern: p.slug })}>{P.practice} →</Link>
              </Button>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
