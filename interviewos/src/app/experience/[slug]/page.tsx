import { and, desc, eq } from "drizzle-orm";
import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { QuestionList } from "@/components/experience/practice";
import { ProjectForm } from "@/components/experience/project-form";
import { StoryDialog } from "@/components/experience/star-dialog";
import { ActiveTimer } from "@/components/learn/active-timer";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import { db } from "@/lib/db";
import { experiencePractice, personalProjects, starStories } from "@/lib/db/schema";
import { generateProjectQuestions } from "@/lib/experience";
import { getCurrentUserId, getI18n } from "@/server/user";

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const userId = getCurrentUserId();
  const [{ m, locale }, rows] = await Promise.all([
    getI18n(),
    db
      .select()
      .from(personalProjects)
      .where(and(eq(personalProjects.userId, userId), eq(personalProjects.slug, slug))),
  ]);
  const project = rows[0];
  if (!project) notFound();
  const E = m.experience;
  const [answers, stories, allProjects] = await Promise.all([
    db
      .select()
      .from(experiencePractice)
      .where(eq(experiencePractice.projectId, project.id))
      .orderBy(desc(experiencePractice.createdAt))
      .limit(20),
    db
      .select()
      .from(starStories)
      .where(and(eq(starStories.userId, userId), eq(starStories.projectId, project.id))),
    db
      .select({ id: personalProjects.id, title: personalProjects.title })
      .from(personalProjects)
      .where(eq(personalProjects.userId, userId)),
  ]);
  const questions = generateProjectQuestions(project);

  return (
    <PageContainer wide>
      <ActiveTimer kind="experience" refId={project.slug} />
      <PageHeader
        eyebrow={
          <Link href="/experience" className="hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-3.5" />
            {E.title}
          </Link>
        }
        title={project.title}
        description={project.organization}
        actions={
          <Badge tone={project.needsReview ? "warning" : "success"}>
            {project.needsReview ? E.needsReview : E.verified}
          </Badge>
        }
      />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>{E.projects}</CardTitle>
          </CardHeader>
          <CardContent>
            <ProjectForm project={project} />
          </CardContent>
        </Card>
        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{E.questions.title}</CardTitle>
                <p className="text-muted-foreground text-xs">{E.questions.generated}</p>
              </div>
            </CardHeader>
            <CardContent>
              <QuestionList
                projectId={project.id}
                questions={questions}
                aiEnabled={isAiConfigured()}
                fieldLabels={E.fields}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{E.stories}</CardTitle>
              <StoryDialog projects={allProjects} defaultProjectId={project.id} />
            </CardHeader>
            <CardContent>
              {stories.length === 0 ? (
                <p className="text-muted-foreground text-xs">{E.noStories}</p>
              ) : (
                <ul className="flex flex-col gap-2">
                  {stories.map((s) => (
                    <li
                      key={s.id}
                      className="border-border flex items-center justify-between rounded-md border px-3 py-2 text-sm"
                    >
                      <span>
                        {s.title} <Badge className="ml-1">{s.competency}</Badge>
                      </span>
                      <StoryDialog story={s} projects={allProjects} />
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{E.practice.history}</CardTitle>
            </CardHeader>
            <CardContent>
              {answers.length === 0 ? (
                <p className="text-muted-foreground text-xs">{E.practice.none}</p>
              ) : (
                <ul className="flex flex-col gap-3">
                  {answers.map((a) => (
                    <li key={a.id} className="text-sm">
                      <p className="font-medium">{a.question}</p>
                      <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{a.answer}</p>
                      <p className="text-subtle-foreground mt-1 text-[11px]">
                        {a.createdAt.toLocaleDateString(locale === "ru" ? "ru-RU" : "en-GB")} · {a.selfScore}
                        /5
                      </p>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
