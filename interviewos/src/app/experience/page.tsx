import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { StoryDialog } from "@/components/experience/star-dialog";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { db } from "@/lib/db";
import { personalProjects, starStories } from "@/lib/db/schema";
import { projectCompleteness } from "@/lib/experience";
import { getCurrentUserId, getI18n } from "@/server/user";

export const metadata = { title: "My Engineering Experience" };

// Server actions on this page include AI feedback on answers.
export const maxDuration = 300;

export default async function ExperiencePage() {
  const userId = getCurrentUserId();
  const [{ m }, projects, stories] = await Promise.all([
    getI18n(),
    db
      .select()
      .from(personalProjects)
      .where(eq(personalProjects.userId, userId))
      .orderBy(asc(personalProjects.id)),
    db.select().from(starStories).where(eq(starStories.userId, userId)).orderBy(asc(starStories.id)),
  ]);
  const E = m.experience;
  const options = projects.map((p) => ({ id: p.id, title: p.title }));
  return (
    <PageContainer>
      <PageHeader title={E.title} description={E.description} actions={<StoryDialog projects={options} />} />
      <h2 className="mb-2 text-sm font-semibold">{E.projects}</h2>
      <div className="mb-8 grid grid-cols-1 gap-3 md:grid-cols-3">
        {projects.map((p) => {
          const pct = Math.round(projectCompleteness(p) * 100);
          return (
            <Link key={p.id} href={`/experience/${p.slug}`} className="group">
              <Card className="group-hover:border-border-strong h-full p-4">
                <div className="flex items-start justify-between gap-2">
                  <h3 className="group-hover:text-primary text-sm font-semibold">{p.title}</h3>
                  <Badge tone={p.needsReview ? "warning" : "success"}>
                    {p.needsReview ? E.needsReview : E.verified}
                  </Badge>
                </div>
                <p className="text-muted-foreground mt-0.5 text-xs">{p.organization}</p>
                <p className="text-muted-foreground mt-2 line-clamp-3 text-xs">{p.context || p.problem}</p>
                <Progress className="mt-3" value={pct} tone={pct >= 80 ? "success" : "primary"} />
                <p className="text-subtle-foreground mt-1 text-[11px]">{E.completeness(pct)}</p>
              </Card>
            </Link>
          );
        })}
      </div>
      <h2 className="mb-2 text-sm font-semibold">{E.stories}</h2>
      {stories.length === 0 ? (
        <EmptyState title={E.noStories} action={<StoryDialog projects={options} />} />
      ) : (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {stories.map((s) => (
            <Card key={s.id} className="p-4">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h3 className="text-sm font-semibold">{s.title}</h3>
                  <Badge className="mt-1">{s.competency}</Badge>
                </div>
                <StoryDialog story={s} projects={options} />
              </div>
              <dl className="mt-3 grid gap-1.5 text-xs">
                {(["situation", "task", "action", "result"] as const).map((k) => (
                  <div key={k} className="grid grid-cols-[72px_1fr] gap-2">
                    <dt className="text-subtle-foreground">{E.star[k]}</dt>
                    <dd className="text-muted-foreground">{s[k] || "—"}</dd>
                  </div>
                ))}
              </dl>
            </Card>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
