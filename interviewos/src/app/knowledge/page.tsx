import { ilike, or } from "drizzle-orm";
import { Search } from "lucide-react";
import Link from "next/link";
import { StatusBadge } from "@/components/learn/status-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { PrioritySelect } from "@/components/settings/settings-form";
import { Card } from "@/components/ui/card";
import { EmptyState, NotEnoughData } from "@/components/ui/misc";
import { db } from "@/lib/db";
import { lessons } from "@/lib/db/schema";
import { formatDay } from "@/lib/dates";
import { TOPIC_STATUSES } from "@/lib/mastery/status";
import { cn } from "@/lib/utils";
import { getTopicStates } from "@/server/insights";
import { getI18n, getToday } from "@/server/user";

export const metadata = { title: "Knowledge Base" };

export default async function KnowledgePage({ searchParams }: { searchParams: Promise<{ q?: string; area?: string; status?: string }> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim().slice(0, 100);
  const [{ m, locale }, states, today] = await Promise.all([getI18n(), getTopicStates(), getToday()]);
  const K = m.knowledge;
  let matching: Set<string> | null = null;
  if (q) {
    const pattern = `%${q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
    const rows = await db
      .select({ slug: lessons.slug })
      .from(lessons)
      .where(or(ilike(lessons.title, pattern), ilike(lessons.searchText, pattern)));
    matching = new Set(rows.map((r) => r.slug));
  }
  const areas = [...new Set(states.map((s) => s.area))];
  const filtered = states.filter(
    (s) => (!matching || matching.has(s.slug)) && (!sp.area || s.area === sp.area) && (!sp.status || s.status === sp.status),
  );
  const link = (params: Record<string, string | undefined>) => {
    const u = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: q || undefined, area: sp.area, status: sp.status, ...params })) if (v) u.set(k, v);
    return `/knowledge?${u.toString()}`;
  };

  return (
    <PageContainer wide>
      <PageHeader title={K.title} description={K.description} />
      <form action="/knowledge" className="mb-3 flex max-w-xl items-center gap-2 rounded-md border border-border bg-surface-2 px-2.5">
        <Search className="size-4 text-subtle-foreground" />
        <input
          name="q"
          defaultValue={q}
          placeholder={K.search}
          aria-label={K.search}
          className="h-9 flex-1 bg-transparent text-sm outline-none placeholder:text-subtle-foreground"
        />
        {sp.area ? <input type="hidden" name="area" value={sp.area} /> : null}
        {sp.status ? <input type="hidden" name="status" value={sp.status} /> : null}
      </form>
      <div className="mb-4 flex flex-wrap items-center gap-1.5 text-xs">
        <span className="text-muted-foreground">{K.area}:</span>
        {[undefined, ...areas].map((a) => (
          <Link key={a ?? "all"} href={link({ area: a })} className={cn("rounded px-2 py-0.5", sp.area === a ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {a ? K.areas[a] ?? a : m.common.labels.all}
          </Link>
        ))}
        <span className="ml-3 text-muted-foreground">{m.common.labels.status}:</span>
        {[undefined, ...TOPIC_STATUSES].map((st) => (
          <Link key={st ?? "all"} href={link({ status: st })} className={cn("rounded px-2 py-0.5", sp.status === st ? "bg-surface-3 text-foreground" : "text-muted-foreground hover:text-foreground")}>
            {st ? m.common.status[st] : m.common.labels.all}
          </Link>
        ))}
      </div>
      <p className="mb-2 text-xs text-muted-foreground">{K.results(filtered.length)}</p>
      {filtered.length === 0 ? (
        <EmptyState title={K.noResults} />
      ) : (
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2 text-left text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{K.columns.topic}</th>
                <th className="px-3 py-2 font-medium">{K.area}</th>
                <th className="px-3 py-2 font-medium">{K.columns.status}</th>
                <th className="px-3 py-2 font-medium">{K.columns.accuracy}</th>
                <th className="px-3 py-2 font-medium">{K.columns.review}</th>
                <th className="px-3 py-2 font-medium">{K.columns.priority}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => (
                <tr key={t.id} className="hover:bg-surface-2">
                  <td className="px-3 py-2">
                    <Link href={`/learn/lesson/${t.slug}`} className="font-medium hover:text-primary">
                      {t.title}
                    </Link>
                  </td>
                  <td className="px-3 py-2 text-xs text-muted-foreground">{K.areas[t.area] ?? t.area}</td>
                  <td className="px-3 py-2">
                    <StatusBadge status={t.status} />
                  </td>
                  <td className="px-3 py-2 text-xs tabular-nums">{t.accuracy === null ? <NotEnoughData label={m.common.labels.notEnoughData} /> : `${Math.round(t.accuracy * 100)}% (${t.attempts})`}</td>
                  <td className="px-3 py-2 text-xs">
                    {t.nextReviewOn ? <span className={t.nextReviewOn <= today ? "text-primary" : "text-muted-foreground"}>{formatDay(t.nextReviewOn, locale)}</span> : <span className="text-subtle-foreground">—</span>}
                  </td>
                  <td className="px-3 py-2">
                    <PrioritySelect topicId={t.id} value={t.priority} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
      <details className="mt-6 rounded-lg border border-border bg-surface p-4 text-sm">
        <summary className="cursor-pointer font-medium">{K.statusLegend}</summary>
        <ul className="mt-3 flex flex-col gap-2">
          {TOPIC_STATUSES.map((s) => (
            <li key={s} className="flex items-start gap-3">
              <StatusBadge status={s} withHelp={false} />
              <span className="text-muted-foreground">{m.common.statusHelp[s]}</span>
            </li>
          ))}
        </ul>
      </details>
    </PageContainer>
  );
}
