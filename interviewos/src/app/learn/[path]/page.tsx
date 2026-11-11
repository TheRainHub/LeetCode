import { ChevronLeft, CircleCheck } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { StatusBadge } from "@/components/learn/status-badge";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { getPath } from "@/server/learn";
import { getI18n } from "@/server/user";

export default async function PathPage({ params }: { params: Promise<{ path: string }> }) {
  const { path: slug } = await params;
  const [{ m }, data] = await Promise.all([getI18n(), getPath(slug)]);
  if (!data) notFound();
  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <Link href="/learn" className="hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-3.5" />
            {m.learn.title}
          </Link>
        }
        title={data.path.title}
        description={data.path.description}
      />
      <div className="flex flex-col gap-6">
        {data.modules.map((mod, mi) => (
          <section key={mod.id} aria-labelledby={`mod-${mod.id}`}>
            <div className="mb-2 flex items-baseline gap-2">
              <span className="text-subtle-foreground text-xs tabular-nums">
                {String(mi + 1).padStart(2, "0")}
              </span>
              <h2 id={`mod-${mod.id}`} className="text-sm font-semibold">
                {mod.title}
              </h2>
              <span className="text-muted-foreground text-xs">— {mod.description}</span>
            </div>
            {mod.lessons.length === 0 ? (
              <EmptyState title={m.learn.emptyModule} />
            ) : (
              <Card className="divide-border divide-y">
                {mod.lessons.map((l) => (
                  <Link
                    key={l.id}
                    href={`/learn/lesson/${l.slug}`}
                    className="hover:bg-surface-2 flex flex-col gap-1 px-4 py-3 sm:flex-row sm:items-center sm:gap-4"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        {l.completedAt ? (
                          <CircleCheck
                            className="text-success size-3.5"
                            aria-label={m.learn.lesson.completed}
                          />
                        ) : null}
                        <span className="truncate text-sm font-medium">{l.title}</span>
                      </div>
                      {l.prerequisites.length ? (
                        <p className="text-subtle-foreground mt-0.5 truncate text-[11px]">
                          {m.learn.prerequisites}: {l.prerequisites.map((p) => p.title).join(", ")}
                        </p>
                      ) : null}
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <Badge tone="outline">
                        {l.depth === "full" ? m.learn.depth.full : m.learn.depth.concise}
                      </Badge>
                      <span className="text-subtle-foreground w-14 text-right text-xs tabular-nums">
                        {m.common.minutes(l.minutes)}
                      </span>
                      <StatusBadge status={l.status} withHelp={false} />
                    </div>
                  </Link>
                ))}
              </Card>
            )}
          </section>
        ))}
      </div>
    </PageContainer>
  );
}
