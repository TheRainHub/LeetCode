import { Check, ChevronLeft, Info, Play } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
  AddFocusTopic,
  Checklist,
  CompanyNotes,
  EditCompanyDialog,
  Pipeline,
  WeightSelect,
} from "@/components/companies/company-widgets";
import { Markdown } from "@/components/content/markdown";
import { StatusBadge } from "@/components/learn/status-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, NotEnoughData } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { isAiConfigured } from "@/lib/ai/config";
import { formatDay } from "@/lib/dates";
import { getCompanyPage } from "@/server/companies";
import { getI18n, getToday } from "@/server/user";

export default async function CompanyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ m, locale }, data, today] = await Promise.all([getI18n(), getCompanyPage(slug), getToday()]);
  if (!data) notFound();
  const C = m.companies;
  const { company, readiness } = data;
  const active = data.focus.filter((f) => f.weight > 0);
  const excluded = data.focus.filter((f) => f.weight === 0);

  return (
    <PageContainer wide>
      <PageHeader
        eyebrow={
          <Link href="/companies" className="hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-3.5" />
            {C.title}
          </Link>
        }
        title={company.name}
        description={company.role}
        actions={
          <EditCompanyDialog
            companyId={company.id}
            role={company.role}
            overview={company.overview}
            prepNotes={company.prepNotes}
          />
        }
      />
      <p className="text-muted-foreground -mt-3 mb-6 flex items-start gap-2 text-xs">
        <Info className="mt-0.5 size-3.5 shrink-0" />
        {company.sourceNote}
      </p>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{C.readiness}</CardTitle>
              <CardDescription>{C.readinessHelp}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {readiness.readiness.estimate === null ? (
              <NotEnoughData label={m.common.labels.notEnoughData} className="text-sm" />
            ) : (
              <p className="text-3xl font-semibold tabular-nums">{readiness.readiness.estimate}%</p>
            )}
            <Progress
              className="mt-2"
              value={readiness.readiness.estimate ?? 0}
              tone={readiness.readiness.estimate === null ? "muted" : "primary"}
            />
            <p className="text-subtle-foreground mt-2 text-[11px]">
              {m.dashboard.companies.coverage(
                readiness.readiness.startedTopics,
                readiness.readiness.totalTopics,
              )}{" "}
              · {m.common.status.interview_ready}: {readiness.readiness.readyTopics}
            </p>
            <div className="border-border mt-4 border-t pt-3">
              <p className="text-muted-foreground text-xs">{C.observed}</p>
              <p className="mt-1 text-sm">
                {readiness.avgMockScore === null
                  ? C.noMocks
                  : `${readiness.avgMockScore}/100 · ${readiness.mockCount}`}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{C.pipeline.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Pipeline
              companyId={company.id}
              companyName={company.name}
              defaultRole={company.role}
              today={today}
              application={data.application}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{C.overview}</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown compact>{company.overview}</Markdown>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {company.techStack.map((t) => (
                <Badge key={t} tone="outline">
                  {t}
                </Badge>
              ))}
            </div>
            <h3 className="text-muted-foreground mt-5 mb-1 text-xs font-semibold tracking-wide uppercase">
              {C.prepNotes}
            </h3>
            <Markdown compact>{company.prepNotes}</Markdown>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{C.checklist.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <Checklist
              companyId={company.id}
              items={data.checklist.map((c) => ({ id: c.id, text: c.text, done: c.done }))}
            />
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{C.focus.title}</CardTitle>
              <CardDescription>{C.focus.help}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-muted-foreground text-left text-[11px]">
                  <tr>
                    <th className="pb-2 font-medium">{C.focus.topic}</th>
                    <th className="pb-2 font-medium">{C.focus.status}</th>
                    <th className="pb-2 font-medium">{C.focus.accuracy}</th>
                    <th className="pb-2 font-medium">{C.focus.weight}</th>
                  </tr>
                </thead>
                <tbody className="divide-border divide-y">
                  {[...active, ...excluded].map((f) => (
                    <tr key={f.topicId} className={f.weight === 0 ? "opacity-50" : ""}>
                      <td className="py-1.5 pr-3">
                        <Link href={`/learn/lesson/${f.topic.slug}`} className="hover:text-primary">
                          {f.topic.title}
                        </Link>
                      </td>
                      <td className="py-1.5 pr-3">
                        <StatusBadge status={f.topic.status} withHelp={false} />
                      </td>
                      <td className="text-muted-foreground py-1.5 pr-3 text-xs tabular-nums">
                        {f.topic.accuracy === null ? (
                          <NotEnoughData label={m.common.labels.notEnoughData} />
                        ) : (
                          `${Math.round(f.topic.accuracy * 100)}%`
                        )}
                      </td>
                      <td className="py-1.5">
                        <WeightSelect companyId={company.id} topicId={f.topicId} weight={f.weight} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="mt-3">
              <AddFocusTopic companyId={company.id} options={data.otherTopics} />
            </div>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{C.problems}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1">
                {data.problems.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/practice/problems/${p.slug}`}
                      className="hover:bg-surface-2 flex items-center gap-2 rounded-md px-1 py-1 text-sm"
                    >
                      {p.independent ? (
                        <Check className="text-success size-3.5" />
                      ) : p.solved ? (
                        <Check className="text-primary size-3.5" />
                      ) : (
                        <span className="size-3.5" />
                      )}
                      <span className="flex-1">{p.title}</span>
                      <Badge>{m.common.difficulty[p.difficulty]}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{C.presets}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1.5">
                {data.presets.map((p) => (
                  <li key={p.id} className="flex items-center gap-2 text-sm">
                    <span className="flex-1">
                      {p.title}
                      <span className="text-subtle-foreground block text-[11px]">
                        {m.interviews.types[p.type]} · {m.common.minutes(p.durationMinutes)} ·{" "}
                        {m.common.languages[p.language]}
                      </span>
                    </span>
                    {isAiConfigured() ? (
                      <Button asChild size="sm" variant="ghost">
                        <Link href={`/interviews?preset=${p.id}`}>
                          <Play />
                          {C.startPreset}
                        </Link>
                      </Button>
                    ) : null}
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>
        </div>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{C.notes.title}</CardTitle>
          </CardHeader>
          <CardContent>
            <CompanyNotes companyId={company.id} initial={data.notes} />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{C.history}</CardTitle>
          </CardHeader>
          <CardContent>
            {data.mocks.length === 0 ? (
              <EmptyState title={C.noMocks} />
            ) : (
              <ul className="flex flex-col gap-1">
                {data.mocks.map((x) => (
                  <li key={x.id}>
                    <Link
                      href={`/interviews/${x.id}`}
                      className="hover:bg-surface-2 flex items-center justify-between rounded-md px-1 py-1 text-sm"
                    >
                      <span>
                        {m.interviews.types[x.type]}
                        <span className="text-subtle-foreground block text-[11px]">
                          {formatDay(x.startedAt.toISOString().slice(0, 10), locale)}
                        </span>
                      </span>
                      <span className="font-semibold tabular-nums">{x.score ?? "—"}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
