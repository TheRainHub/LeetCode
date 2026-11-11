import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { formatMinutes } from "@/lib/dates";
import { getPathsOverview } from "@/server/learn";
import { getI18n } from "@/server/user";

export const metadata = { title: "Learning Paths" };

export default async function LearnPage() {
  const [{ m }, paths] = await Promise.all([getI18n(), getPathsOverview()]);
  return (
    <PageContainer>
      <PageHeader title={m.learn.title} description={m.learn.description} />
      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
        {paths.map((p) => (
          <Link key={p.id} href={`/learn/${p.slug}`} className="group">
            <Card className="group-hover:border-border-strong h-full p-4 transition-colors">
              <div className="flex items-start justify-between gap-3">
                <h2 className="group-hover:text-primary text-sm font-semibold">{p.title}</h2>
                <ArrowRight className="text-subtle-foreground size-4 transition-transform group-hover:translate-x-0.5" />
              </div>
              <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed">{p.description}</p>
              <div className="text-subtle-foreground mt-4 flex items-center gap-3 text-[11px]">
                <span>{m.learn.modules(p.moduleCount)}</span>
                <span>{m.learn.lessons(p.lessonCount)}</span>
                <span className="flex items-center gap-1">
                  <Clock className="size-3" />
                  {formatMinutes(p.minutes)}
                </span>
              </div>
              <Progress
                className="mt-3"
                value={p.lessonCount ? (p.ready / p.lessonCount) * 100 : 0}
                tone="success"
                label={p.title}
              />
              <p className="text-subtle-foreground mt-1.5 text-[11px]">
                {m.learn.progressLabel(p.ready, p.practiced, p.lessonCount)}
              </p>
            </Card>
          </Link>
        ))}
      </div>
    </PageContainer>
  );
}
