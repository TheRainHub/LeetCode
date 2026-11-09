import Link from "next/link";
import { CalibrationChart, InterviewScoresChart, RetentionChart, WeeklyTimeChart } from "@/components/analytics/charts";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { NotEnoughData, Stat } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { formatDay, formatDuration } from "@/lib/dates";
import { getAnalytics, MIN_REVIEWS_PER_WEEK } from "@/server/analytics";
import { getI18n } from "@/server/user";

export const metadata = { title: "Analytics" };

function DataTable({ label, head, rows }: { label: string; head: string[]; rows: (string | number)[][] }) {
  return (
    <details className="mt-3">
      <summary className="cursor-pointer text-[11px] text-muted-foreground hover:text-foreground">{label}</summary>
      <div className="mt-2 overflow-x-auto">
        <table className="w-full text-xs">
          <thead className="text-left text-muted-foreground">
            <tr>
              {head.map((h) => (
                <th key={h} className="pr-3 pb-1 font-medium">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="tabular-nums">
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-border">
                {r.map((c, j) => (
                  <td key={j} className="py-1 pr-3">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </details>
  );
}

function Tag({ observed, label }: { observed: boolean; label: string }) {
  return <Badge tone={observed ? "success" : "warning"}>{label}</Badge>;
}

export default async function AnalyticsPage() {
  const [{ m, locale }, a] = await Promise.all([getI18n(), getAnalytics()]);
  const A = m.analytics;
  const nd = <NotEnoughData label={m.common.labels.notEnoughData} />;
  const hasWeekly = a.weekly.some((w) => w.learning + w.coding + w.review + w.other > 0);
  const hasRetention = a.retention.some((r) => r.retention !== null);
  const best = { independent: A.coding.independent, with_hints: A.coding.withHints, with_solution: A.coding.withSolution };

  return (
    <PageContainer wide>
      <PageHeader title={A.title} description={A.description} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{A.accuracy.title}</CardTitle>
              <CardDescription>{A.accuracy.help(a.minResults)}</CardDescription>
            </div>
            <Tag observed label={A.observedTag} />
          </CardHeader>
          <CardContent>
            {a.accuracy.length === 0 ? (
              nd
            ) : (
              <ul className="flex flex-col gap-2">
                {a.accuracy.slice(0, 12).map((t) => (
                  <li key={t.slug}>
                    <div className="flex justify-between text-xs">
                      <Link href={`/learn/lesson/${t.slug}`} className="hover:text-primary">
                        {t.title}
                      </Link>
                      <span className="tabular-nums text-muted-foreground">
                        {Math.round(t.accuracy * 100)}% · {t.attempts}
                      </span>
                    </div>
                    <Progress value={t.accuracy * 100} tone={t.accuracy >= 0.7 ? "success" : t.accuracy >= 0.5 ? "primary" : "warning"} label={t.title} />
                  </li>
                ))}
              </ul>
            )}
            {a.insufficient > 0 ? <p className="mt-3 text-[11px] text-subtle-foreground">{A.accuracy.insufficient(a.insufficient)}</p> : null}
            {a.accuracy.length ? (
              <DataTable label={A.showTable} head={[A.accuracy.topic, "%", A.accuracy.results]} rows={a.accuracy.map((t) => [t.title, Math.round(t.accuracy * 100), t.attempts])} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{A.coding.title}</CardTitle>
            <Tag observed label={A.observedTag} />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <Stat label={A.coding.avgTime} value={a.coding.avgSeconds === null ? "—" : formatDuration(a.coding.avgSeconds)} />
              <Stat label={A.coding.independent} value={a.coding.independent} />
              <Stat label={A.coding.withHints} value={a.coding.withHints} />
              <Stat label={A.coding.withSolution} value={a.coding.withSolution} />
            </div>
            {a.coding.attempts === 0 ? (
              <div className="mt-3">{nd}</div>
            ) : (
              <table className="mt-4 w-full text-xs">
                <thead className="text-left text-muted-foreground">
                  <tr>
                    <th className="pb-1 font-medium">{A.coding.problem}</th>
                    <th className="pb-1 font-medium">{A.coding.best}</th>
                    <th className="pb-1 text-right font-medium">{A.coding.time}</th>
                  </tr>
                </thead>
                <tbody>
                  {a.coding.problems.map((p) => (
                    <tr key={p.slug} className="border-t border-border">
                      <td className="py-1.5">
                        <Link href={`/practice/problems/${p.slug}`} className="hover:text-primary">
                          {p.title}
                        </Link>
                      </td>
                      <td className="py-1.5 text-muted-foreground">{p.best ? best[p.best] : m.practice.problemStatus.attempted}</td>
                      <td className="py-1.5 text-right tabular-nums">{p.avgSeconds === null ? "—" : formatDuration(p.avgSeconds)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{A.weekly.title}</CardTitle>
              <CardDescription>{A.weekly.help}</CardDescription>
            </div>
            <Tag observed label={A.observedTag} />
          </CardHeader>
          <CardContent>
            {hasWeekly ? <WeeklyTimeChart data={a.weekly} /> : nd}
            {hasWeekly ? (
              <DataTable
                label={A.showTable}
                head={[A.weekly.week, A.weekly.series.learning, A.weekly.series.coding, A.weekly.series.review, A.weekly.series.other]}
                rows={a.weekly.map((w) => [formatDay(w.week, locale), w.learning, w.coding, w.review, w.other])}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{A.retention.title}</CardTitle>
              <CardDescription>{A.retention.help(MIN_REVIEWS_PER_WEEK)}</CardDescription>
            </div>
            <Tag observed label={A.observedTag} />
          </CardHeader>
          <CardContent>
            {hasRetention ? <RetentionChart data={a.retention} /> : nd}
            {hasRetention ? (
              <DataTable
                label={A.showTable}
                head={[A.weekly.week, "%", A.retention.reviews]}
                rows={a.retention.map((r) => [formatDay(r.week, locale), r.retention === null ? "—" : Math.round(r.retention * 100), r.reviews])}
              />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{A.interviews.title}</CardTitle>
              <CardDescription>{A.interviews.help}</CardDescription>
            </div>
            <Tag observed label={A.observedTag} />
          </CardHeader>
          <CardContent>
            {a.interviews.length < 2 ? (
              <div className="flex flex-col gap-1">
                {nd}
                {a.interviews[0] ? <p className="text-xs text-muted-foreground">{a.interviews[0].score}/100</p> : null}
              </div>
            ) : (
              <InterviewScoresChart data={a.interviews} />
            )}
            {a.interviews.length ? (
              <DataTable label={A.showTable} head={[A.interviews.date, A.interviews.score]} rows={a.interviews.map((i) => [formatDay(i.date, locale), i.score])} />
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>{A.calibration.title}</CardTitle>
              <CardDescription>{A.calibration.help}</CardDescription>
            </div>
            <Tag observed label={A.observedTag} />
          </CardHeader>
          <CardContent>
            {a.calibration.length < 3 ? nd : <CalibrationChart data={a.calibration} />}
            {a.calibration.length ? (
              <DataTable label={A.showTable} head={[A.accuracy.topic, A.calibration.confidence, A.calibration.accuracy]} rows={a.calibration.map((c) => [c.title, c.confidence, c.accuracy])} />
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{A.readiness.title}</CardTitle>
              <CardDescription>{A.readiness.help}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <table className="w-full text-sm">
              <thead className="text-left text-[11px] text-muted-foreground">
                <tr>
                  <th className="pb-2 font-medium">{A.readiness.company}</th>
                  <th className="pb-2 font-medium">
                    {A.readiness.estimated} <Tag observed={false} label={A.estimatedTag} />
                  </th>
                  <th className="pb-2 font-medium">
                    {A.readiness.observed} <Tag observed label={A.observedTag} />
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {a.readiness.map((r) => (
                  <tr key={r.slug}>
                    <td className="py-2 pr-4">
                      <Link href={`/companies/${r.slug}`} className="hover:text-primary">
                        {r.name}
                      </Link>
                    </td>
                    <td className="py-2 pr-4">
                      {r.estimate === null ? (
                        nd
                      ) : (
                        <div className="flex items-center gap-2">
                          <Progress className="w-40" value={r.estimate} />
                          <span className="text-xs tabular-nums">{r.estimate}%</span>
                        </div>
                      )}
                    </td>
                    <td className="py-2 text-xs tabular-nums">{r.observed === null ? nd : `${r.observed}/100 (${r.mocks})`}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
