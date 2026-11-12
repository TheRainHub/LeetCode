import { BookOpen, ExternalLink } from "lucide-react";
import Link from "next/link";
import { SD_FUNDAMENTALS, SD_QUESTIONS, SD_SOURCES } from "@content/system-design";
import { StatusBadge } from "@/components/learn/status-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PracticeTabs } from "@/components/practice/practice-tabs";
import { SdStatusIcon } from "@/components/system-design/status-icon";
import { SdSubnav } from "@/components/system-design/sd-subnav";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { SD_CATEGORIES, type SdSourceKey } from "@/lib/content/defs";
import type { SdStatus } from "@/lib/system-design/status";
import { cn } from "@/lib/utils";
import { getGuidesOverview } from "@/server/guides";
import { getTopicStates } from "@/server/insights";
import { getDueCards, getDueProblems } from "@/server/srs";
import { listSdProgress } from "@/server/system-design";
import { getI18n } from "@/server/user";

export const metadata = { title: "System design" };

const DIFFICULTIES = ["easy", "medium", "hard"] as const;
const STATUSES: SdStatus[] = ["not_started", "drafted", "practiced", "strong"];
const SOURCES = Object.keys(SD_SOURCES) as SdSourceKey[];
const DIFFICULTY_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;

type Params = Record<string, string | string[] | undefined>;
const first = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);
const oneOf = <T extends string>(v: string | undefined, allowed: readonly T[]): T | undefined =>
  v && (allowed as readonly string[]).includes(v) ? (v as T) : undefined;

export default async function SystemDesignPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const filters = {
    difficulty: oneOf(first(sp.difficulty), DIFFICULTIES),
    status: oneOf(first(sp.status), STATUSES),
    source: oneOf(first(sp.source), SOURCES),
  };
  const [{ m }, progress, topicStates, dueCards, dueProblems, guidesOverview] = await Promise.all([
    getI18n(),
    listSdProgress(),
    getTopicStates(),
    getDueCards(500),
    getDueProblems(),
    getGuidesOverview(),
  ]);
  const S = m.sd;
  const topic = new Map(topicStates.map((t) => [t.slug, t]));
  const statusOf = (slug: string) => progress.get(slug)?.status ?? "not_started";
  const done = SD_QUESTIONS.filter((q) => ["practiced", "strong"].includes(statusOf(q.slug))).length;
  const counts = Object.fromEntries(
    STATUSES.map((s) => [s, SD_QUESTIONS.filter((q) => statusOf(q.slug) === s).length]),
  );
  const visible = SD_QUESTIONS.filter(
    (q) =>
      (!filters.difficulty || q.difficulty === filters.difficulty) &&
      (!filters.status || statusOf(q.slug) === filters.status) &&
      (!filters.source || q.listedIn.includes(filters.source)),
  );
  const href = (patch: Partial<Record<keyof typeof filters, string | undefined>>) => {
    const merged = { ...filters, ...patch };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(merged)) if (v) q.set(k, v);
    const s = q.toString();
    return s ? `/practice/system-design?${s}` : "/practice/system-design";
  };
  const chip = (active: boolean) =>
    cn(
      "rounded px-2 py-0.5",
      active ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground",
    );

  return (
    <PageContainer wide>
      <PageHeader title={S.title} description={S.description} />
      <PracticeTabs current="systemDesign" reviewDue={dueCards.length + dueProblems.length} />
      <SdSubnav current="questions" labels={S.guides.nav} guideCount={guidesOverview.total || undefined} />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <div className="flex flex-wrap items-center gap-1.5 text-xs" data-testid="sd-filters">
            <span className="text-muted-foreground">{S.filters.difficulty}:</span>
            {[undefined, ...DIFFICULTIES].map((d) => (
              <Link
                key={d ?? "all"}
                href={href({ difficulty: d })}
                className={chip(filters.difficulty === d)}
              >
                {d ? m.common.difficulty[d] : S.filters.all}
              </Link>
            ))}
            <span className="text-muted-foreground ml-3">{S.filters.status}:</span>
            {[undefined, ...STATUSES].map((s) => (
              <Link key={s ?? "all"} href={href({ status: s })} className={chip(filters.status === s)}>
                {s ? S.status[s] : S.filters.all}
              </Link>
            ))}
            <span className="text-muted-foreground ml-3">{S.filters.source}:</span>
            {[undefined, ...SOURCES].map((s) => (
              <Link key={s ?? "all"} href={href({ source: s })} className={chip(filters.source === s)}>
                {s ? S.sources[s] : S.filters.all}
              </Link>
            ))}
          </div>

          {visible.length === 0 ? <EmptyState title={S.noMatches} /> : null}

          {SD_CATEGORIES.map((category) => {
            const questions = visible.filter((q) => q.category === category);
            if (!questions.length) return null;
            const all = SD_QUESTIONS.filter((q) => q.category === category);
            const practised = all.filter((q) => ["practiced", "strong"].includes(statusOf(q.slug))).length;
            return (
              <Card key={category} className="overflow-hidden" data-testid={`sd-category-${category}`}>
                <div className="border-border flex items-center justify-between border-b px-4 py-2.5">
                  <h2 className="text-sm font-semibold">{S.categories[category]}</h2>
                  <span className="text-muted-foreground text-xs tabular-nums">
                    {practised} / {all.length}
                  </span>
                </div>
                <table className="w-full text-sm">
                  <thead className="bg-surface-2 text-muted-foreground text-left text-[11px]">
                    <tr>
                      <th className="w-8 px-3 py-1.5" />
                      <th className="px-3 py-1.5 font-medium">{S.columns.question}</th>
                      <th className="px-3 py-1.5 font-medium">{S.columns.difficulty}</th>
                      <th className="hidden px-3 py-1.5 font-medium md:table-cell">{S.columns.listedIn}</th>
                      <th className="hidden w-14 px-3 py-1.5 text-right font-medium sm:table-cell">
                        {S.columns.best}
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-border divide-y">
                    {questions.map((q) => {
                      const p = progress.get(q.slug);
                      const status = statusOf(q.slug);
                      return (
                        <tr
                          key={q.slug}
                          className="hover:bg-surface-2 align-top"
                          data-testid="sd-row"
                          data-slug={q.slug}
                        >
                          <td className="px-3 py-2.5">
                            <SdStatusIcon status={status} label={S.status[status]} />
                          </td>
                          <td className="px-3 py-2">
                            <Link
                              href={`/practice/system-design/${q.slug}`}
                              className="hover:text-primary font-medium"
                            >
                              {q.title}
                            </Link>
                            <div className="text-subtle-foreground mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px]">
                              {q.concepts.slice(0, 3).map((c) => (
                                <span key={c}>{topic.get(c)?.title ?? c}</span>
                              ))}
                              {q.caseStudy ? (
                                <Link
                                  href={`/learn/lesson/${q.caseStudy}`}
                                  className="text-primary inline-flex items-center gap-1 hover:underline"
                                >
                                  <BookOpen className="size-3" aria-hidden />
                                  {S.caseStudy}
                                </Link>
                              ) : null}
                            </div>
                          </td>
                          <td className="px-3 py-2">
                            <Badge tone={DIFFICULTY_TONE[q.difficulty]}>
                              {m.common.difficulty[q.difficulty]}
                            </Badge>
                          </td>
                          <td className="hidden px-3 py-2 md:table-cell">
                            <div className="flex flex-wrap gap-1">
                              {q.listedIn.map((s) => (
                                <a
                                  key={s}
                                  href={SD_SOURCES[s].url}
                                  target="_blank"
                                  rel="noreferrer noopener"
                                  title={SD_SOURCES[s].name}
                                >
                                  <Badge tone="outline">{S.sources[s]}</Badge>
                                </a>
                              ))}
                            </div>
                          </td>
                          <td className="text-muted-foreground hidden px-3 py-2 text-right text-xs tabular-nums sm:table-cell">
                            {p?.bestScore != null ? `${Math.round(p.bestScore * 100)}%` : "—"}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </Card>
            );
          })}
        </div>

        <aside className="flex flex-col gap-4">
          <Card data-testid="sd-progress">
            <CardHeader>
              <CardTitle>{S.progress(done, SD_QUESTIONS.length)}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              <Progress value={(done / SD_QUESTIONS.length) * 100} />
              <ul className="grid grid-cols-2 gap-1.5 text-xs">
                {STATUSES.map((s) => (
                  <li key={s} className="flex items-center gap-1.5">
                    <SdStatusIcon status={s} label={S.status[s]} />
                    <span className="text-muted-foreground">{S.status[s]}</span>
                    <span className="ml-auto tabular-nums">{counts[s]}</span>
                  </li>
                ))}
              </ul>
              <p className="text-subtle-foreground text-[11px] leading-relaxed">{S.statusHelp}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>{S.fundamentals.title}</CardTitle>
                <CardDescription>{S.fundamentals.description}</CardDescription>
              </div>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {SD_FUNDAMENTALS.map((g) => (
                <div key={g.key}>
                  <p className="text-subtle-foreground mb-1 text-[11px] font-medium tracking-wide uppercase">
                    {S.fundamentals.groups[g.key as keyof typeof S.fundamentals.groups]}
                  </p>
                  <ul className="flex flex-col gap-1">
                    {g.lessons.map((slug) => {
                      const t = topic.get(slug);
                      return (
                        <li key={slug} className="flex items-center gap-2 text-xs">
                          <Link
                            href={`/learn/lesson/${slug}`}
                            className="hover:text-primary min-w-0 flex-1 truncate"
                          >
                            {t?.title ?? slug}
                          </Link>
                          <StatusBadge status={t?.status ?? "not_started"} withHelp={false} />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex flex-col gap-2 pt-4 text-xs">
              {SOURCES.map((s) => (
                <a
                  key={s}
                  href={SD_SOURCES[s].url}
                  target="_blank"
                  rel="noreferrer noopener"
                  className="hover:text-primary inline-flex items-start gap-1.5"
                >
                  <ExternalLink className="mt-0.5 size-3 shrink-0" aria-hidden />
                  <span>
                    {SD_SOURCES[s].name}
                    <span className="text-subtle-foreground block text-[11px]">{SD_SOURCES[s].note}</span>
                  </span>
                </a>
              ))}
              <p className="text-subtle-foreground text-[11px] leading-relaxed">{S.estimateNote}</p>
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}
