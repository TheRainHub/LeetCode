import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { NotEnoughData } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { formatDay } from "@/lib/dates";
import { getCompanyReadiness } from "@/server/insights";
import { getI18n } from "@/server/user";

export const metadata = { title: "Company Preparation" };

export default async function CompaniesPage() {
  const [{ m, locale }, rows] = await Promise.all([getI18n(), getCompanyReadiness()]);
  const C = m.companies;
  return (
    <PageContainer>
      <PageHeader title={C.title} description={C.description} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {rows.map((c) => (
          <Link key={c.id} href={`/companies/${c.slug}`} className="group">
            <Card className="h-full p-4 group-hover:border-border-strong">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h2 className="text-sm font-semibold group-hover:text-primary">{c.name}</h2>
                  <p className="text-xs text-muted-foreground">{c.role}</p>
                </div>
                {c.stage ? <Badge tone={c.stage === "offer" ? "success" : c.stage === "rejected" ? "danger" : "primary"}>{C.pipeline.stages[c.stage as "applied"]}</Badge> : null}
              </div>
              <div className="mt-4 flex items-center justify-between text-xs">
                <span className="text-muted-foreground">{C.readiness}</span>
                {c.readiness.estimate === null ? <NotEnoughData label={m.common.labels.notEnoughData} /> : <span className="tabular-nums">{c.readiness.estimate}%</span>}
              </div>
              <Progress className="mt-1.5" value={c.readiness.estimate ?? 0} tone={c.readiness.estimate === null ? "muted" : "primary"} label={C.readiness} />
              <div className="mt-2 flex flex-wrap gap-x-3 text-[11px] text-subtle-foreground">
                <span>{m.dashboard.companies.coverage(c.readiness.startedTopics, c.readiness.totalTopics)}</span>
                <span>
                  {C.observed}: {c.avgMockScore === null ? "—" : `${c.avgMockScore}/100 (${c.mockCount})`}
                </span>
                {c.nextInterview ? (
                  <span>
                    {C.nextInterview}: {formatDay(c.nextInterview, locale)}
                  </span>
                ) : null}
              </div>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
