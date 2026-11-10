import { CircleCheck, CircleDashed, CircleDot, Clock, FlaskConical, Layers } from "lucide-react";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { formatDay } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { listLabs } from "@/server/labs";
import { listProblems, type ProblemProgress } from "@/server/practice";
import { getDueCards, getDueProblems } from "@/server/srs";
import { getI18n, getToday } from "@/server/user";

export const metadata = { title: "Practice" };

const PROGRESS_ICON: Record<ProblemProgress, React.ReactNode> = {
  none: <CircleDashed className="size-4 text-subtle-foreground" />,
  attempted: <CircleDot className="size-4 text-warning" />,
  with_help: <CircleCheck className="size-4 text-primary" />,
  independent: <CircleCheck className="size-4 text-success" />,
};

const TABS = ["problems", "labs", "review"] as const;

export default async function PracticePage({ searchParams }: { searchParams: Promise<{ tab?: string; difficulty?: string; status?: string }> }) {
  const sp = await searchParams;
  const tab = (TABS as readonly string[]).includes(sp.tab ?? "") ? (sp.tab as (typeof TABS)[number]) : "problems";
  const [{ m, locale }, today, problems, labs, dueCards, dueProblems] = await Promise.all([
    getI18n(),
    getToday(),
    listProblems(),
    listLabs(),
    getDueCards(500),
    getDueProblems(),
  ]);
  const P = m.practice;
  const filtered = problems.filter(
    (p) => (!sp.difficulty || p.difficulty === sp.difficulty) && (!sp.status || p.progress === sp.status),
  );
  const link = (params: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const merged = { tab, difficulty: sp.difficulty, status: sp.status, ...params };
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    return `/practice?${q.toString()}`;
  };

  return (
    <PageContainer>
      <PageHeader title={P.title} description={P.description} />
      <nav className="mb-4 inline-flex gap-0.5 rounded-md border border-border bg-surface-2 p-0.5" aria-label={P.title}>
        {TABS.map((t) => (
          <Link
            key={t}
            href={`/practice?tab=${t}`}
            aria-current={tab === t ? "page" : undefined}
            className={cn(
              "flex h-7 items-center gap-1.5 rounded-[5px] px-3 text-xs font-medium",
              tab === t ? "bg-surface text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground",
            )}
          >
            {P.tabs[t]}
            {t === "review" && dueCards.length + dueProblems.length > 0 ? <Badge tone="primary">{dueCards.length + dueProblems.length}</Badge> : null}
          </Link>
        ))}
      </nav>

      {tab === "problems" ? (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-1.5 text-xs">
            <span className="text-muted-foreground">{P.filters.difficulty}:</span>
            {[undefined, "easy", "medium", "hard"].map((d) => (
              <Link key={d ?? "all"} href={link({ difficulty: d })} className={cn("rounded px-2 py-0.5", sp.difficulty === d ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {d ? m.common.difficulty[d as "easy"] : P.filters.all}
              </Link>
            ))}
            <span className="ml-3 text-muted-foreground">{P.filters.status}:</span>
            {[undefined, "none", "attempted", "with_help", "independent"].map((s) => (
              <Link key={s ?? "all"} href={link({ status: s })} className={cn("rounded px-2 py-0.5", sp.status === s ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground")}>
                {s ? P.problemStatus[s as ProblemProgress] : P.filters.all}
              </Link>
            ))}
          </div>
          <Card className="overflow-hidden">
            <table className="w-full text-sm">
              <thead className="border-b border-border bg-surface-2 text-left text-[11px] text-muted-foreground">
                <tr>
                  <th className="w-8 px-3 py-2" />
                  <th className="px-3 py-2 font-medium">{P.columns.problem}</th>
                  <th className="hidden px-3 py-2 font-medium md:table-cell">{P.columns.pattern}</th>
                  <th className="px-3 py-2 font-medium">{m.common.labels.difficulty}</th>
                  <th className="hidden px-3 py-2 font-medium sm:table-cell">{P.columns.review}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((p) => (
                  <tr key={p.id} className="hover:bg-surface-2">
                    <td className="px-3 py-2.5" title={P.problemStatus[p.progress]}>
                      {PROGRESS_ICON[p.progress]}
                      <span className="sr-only">{P.problemStatus[p.progress]}</span>
                    </td>
                    <td className="px-3 py-2.5">
                      <Link href={`/practice/problems/${p.slug}`} className="font-medium hover:text-primary">
                        {p.order}. {p.title}
                      </Link>
                      <p className="text-[11px] text-subtle-foreground">{p.summary}</p>
                    </td>
                    <td className="hidden px-3 py-2.5 text-xs text-muted-foreground md:table-cell">{p.pattern}</td>
                    <td className="px-3 py-2.5">
                      <Badge tone={p.difficulty === "easy" ? "success" : p.difficulty === "medium" ? "warning" : "danger"}>{m.common.difficulty[p.difficulty]}</Badge>
                    </td>
                    <td className="hidden px-3 py-2.5 text-xs sm:table-cell">
                      {p.dueOn ? (
                        p.dueOn <= today ? (
                          <Badge tone="primary">{P.dueBadge}</Badge>
                        ) : (
                          <span className="text-muted-foreground">{formatDay(p.dueOn, locale)}</span>
                        )
                      ) : (
                        <span className="text-subtle-foreground">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </Card>
          <p className="mt-3 text-[11px] text-subtle-foreground">{P.executionNote}</p>
        </>
      ) : null}

      {tab === "labs" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {labs.map((l) => (
            <Link key={l.id} href={`/practice/labs/${l.slug}`} className="group">
              <Card className="h-full p-4 group-hover:border-border-strong">
                <div className="flex items-start justify-between gap-2">
                  <h2 className="text-sm font-semibold group-hover:text-primary">{l.title}</h2>
                  {l.status === "verified" ? (
                    <Badge tone="success">{m.labs.status.verified}</Badge>
                  ) : l.status === "in_progress" ? (
                    <Badge tone="warning">{m.labs.status.in_progress}</Badge>
                  ) : null}
                </div>
                <p className="mt-1.5 text-xs leading-relaxed text-muted-foreground">{l.summary}</p>
                <div className="mt-3 flex items-center gap-3 text-[11px] text-subtle-foreground">
                  <span className="flex items-center gap-1">
                    <Clock className="size-3" />
                    {m.common.minutes(l.estimatedMinutes)}
                  </span>
                  <span>{m.common.difficulty[l.difficulty]}</span>
                  <span className="flex items-center gap-1">
                    <FlaskConical className="size-3" />
                    {m.labs.steps(l.stepCount)}
                  </span>
                </div>
              </Card>
            </Link>
          ))}
        </div>
      ) : null}

      {tab === "review" ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <Card className="p-4">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-subtle-foreground" />
              <h2 className="text-sm font-semibold">{P.reviewSummary.cards(dueCards.length)}</h2>
            </div>
            {dueCards.length ? (
              <Button asChild className="mt-3" variant="primary" size="sm">
                <Link href="/practice/review">{P.reviewSummary.start}</Link>
              </Button>
            ) : (
              <p className="mt-2 text-xs text-muted-foreground">{P.reviewSummary.none}</p>
            )}
          </Card>
          <Card className="p-4">
            <h2 className="text-sm font-semibold">{P.reviewSummary.problems(dueProblems.length)}</h2>
            {dueProblems.length ? (
              <ul className="mt-2 flex flex-col gap-1">
                {dueProblems.map((p) => (
                  <li key={p.scheduleId}>
                    <Link href={`/practice/problems/${p.slug}`} className="text-sm hover:text-primary">
                      {p.title}
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <EmptyState className="mt-2" title={P.reviewSummary.none} />
            )}
          </Card>
        </div>
      ) : null}
    </PageContainer>
  );
}
