import { ChevronLeft, Clock } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveTimer } from "@/components/learn/active-timer";
import { LabRunner } from "@/components/labs/lab-runner";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { getLab } from "@/server/labs";
import { getI18n } from "@/server/user";

function List({ title, items }: { title: string; items: string[] }) {
  return (
    <Card className="p-4">
      <p className="mb-2 text-xs font-medium text-muted-foreground">{title}</p>
      <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
        {items.map((i) => (
          <li key={i}>{i}</li>
        ))}
      </ul>
    </Card>
  );
}

export default async function LabPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ m }, data] = await Promise.all([getI18n(), getLab(slug)]);
  if (!data) notFound();
  const { lab, attempt } = data;
  const L = m.labs;
  return (
    <PageContainer>
      <ActiveTimer kind="lab" refId={lab.slug} />
      <PageHeader
        eyebrow={
          <Link href="/practice?tab=labs" className="inline-flex items-center gap-1 hover:text-foreground">
            <ChevronLeft className="size-3.5" />
            {m.practice.tabs.labs}
          </Link>
        }
        title={lab.title}
        description={lab.summary}
        actions={
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Clock className="size-3.5" />
            {m.common.minutes(lab.estimatedMinutes)}
            <Badge>{m.common.difficulty[lab.difficulty]}</Badge>
          </div>
        }
      />
      <div className="mb-6 grid grid-cols-1 gap-3 md:grid-cols-2">
        <List title={L.objectives} items={lab.objectives} />
        <List title={L.deliverables} items={lab.deliverables} />
        <List title={L.prerequisites} items={lab.prerequisites} />
        <List title={L.tools} items={lab.tools} />
      </div>
      {data.topics.length ? (
        <p className="mb-6 text-xs text-muted-foreground">
          {m.common.labels.topics}:{" "}
          {data.topics.map((t, i) => (
            <span key={t.slug}>
              {i ? ", " : ""}
              <Link className="text-primary hover:underline" href={`/learn/lesson/${t.slug}`}>
                {t.title}
              </Link>
            </span>
          ))}
        </p>
      ) : null}
      <LabRunner
        key={attempt?.id ?? 0}
        labId={lab.id}
        steps={lab.steps}
        reflectionQuestions={lab.reflectionQuestions}
        attempt={attempt ? { id: attempt.id, status: attempt.status, stepEvidence: attempt.stepEvidence, reflections: attempt.reflections, minutesSpent: attempt.minutesSpent } : null}
      />
      <section className="mt-8">
        <h2 className="mb-3 text-base font-semibold">{L.failures}</h2>
        <Card className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2 text-left text-[11px] text-muted-foreground">
              <tr>
                <th className="px-3 py-2 font-medium">{L.symptom}</th>
                <th className="px-3 py-2 font-medium">{L.cause}</th>
                <th className="px-3 py-2 font-medium">{L.fix}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {lab.failureScenarios.map((f) => (
                <tr key={f.symptom} className="align-top">
                  <td className="px-3 py-2">{f.symptom}</td>
                  <td className="px-3 py-2 text-muted-foreground">{f.cause}</td>
                  <td className="px-3 py-2 text-muted-foreground">{f.fix}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      </section>
    </PageContainer>
  );
}
