import { BookOpen, ChevronLeft, Dumbbell, KeyRound, Layers } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/content/markdown";
import { EvaluationRetry } from "@/components/interviews/evaluation-retry";
import { InterviewSession } from "@/components/interviews/session";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { isAiConfigured } from "@/lib/ai/config";
import { DIMENSIONS } from "@/lib/ai/evaluation";
import { displayCandidateMessage } from "@/lib/ai/interviewer";
import { getInterview } from "@/server/interviews";
import { getTopicStates } from "@/server/insights";
import { getI18n, getSettings } from "@/server/user";

export const metadata = { title: "Interview" };

export default async function InterviewPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id)) notFound();
  const [{ m, locale }, data, settings] = await Promise.all([getI18n(), getInterview(id), getSettings()]);
  if (!data) notFound();
  const I = m.interviews;
  const { interview, evaluation } = data;
  const title = `${I.types[interview.type]}${data.companyName ? ` · ${data.companyName}` : ""}`;

  if (interview.status === "in_progress") {
    if (!isAiConfigured()) {
      return (
        <PageContainer>
          <EmptyState icon={<KeyRound />} title={I.disabledTitle} description={I.disabledHelp} />
        </PageContainer>
      );
    }
    return (
      <InterviewSession
        interviewId={interview.id}
        startedAt={interview.startedAt.toISOString()}
        durationMinutes={interview.durationMinutes}
        language={interview.language}
        lastError={interview.lastError}
        theme={settings.theme}
        initialMessages={data.messages.map((x) => ({
          id: String(x.id),
          role: x.role,
          kind: x.kind,
          content: x.content,
        }))}
      />
    );
  }

  const header = (
    <PageHeader
      eyebrow={
        <Link href="/interviews" className="hover:text-foreground inline-flex items-center gap-1">
          <ChevronLeft className="size-3.5" />
          {I.title}
        </Link>
      }
      title={title}
      description={`${interview.startedAt.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short" })} · ${m.common.difficulty[interview.difficulty]} · ${m.common.languages[interview.language]} · ${I.report.hints(interview.hintsRequested)}`}
    />
  );

  const transcript = (
    <details className="border-border bg-surface mt-6 rounded-lg border">
      <summary className="cursor-pointer px-4 py-3 text-sm font-medium">{I.report.transcript}</summary>
      <div className="border-border flex flex-col gap-3 border-t px-4 py-4">
        {data.messages
          .filter((x) => x.kind !== "opening")
          .map((x) => (
            <div key={x.id}>
              <p className="text-subtle-foreground mb-1 text-[11px]">
                {x.role === "assistant" ? I.session.interviewer : I.session.you}
                {x.kind === "hint_request" ? ` · ${I.session.hint}` : ""}
              </p>
              <Markdown compact>
                {x.role === "user" ? displayCandidateMessage(x.content) : x.content}
              </Markdown>
            </div>
          ))}
      </div>
    </details>
  );

  if (!evaluation) {
    return (
      <PageContainer className="max-w-4xl">
        {header}
        {interview.status === "evaluating" ? (
          <EvaluationRetry interviewId={interview.id} error={interview.lastError} />
        ) : (
          <EmptyState title={I.history.status[interview.status]} />
        )}
        {transcript}
      </PageContainer>
    );
  }

  const topicTitle = new Map((await getTopicStates()).map((t) => [t.slug, t.title]));
  const R = I.report;
  return (
    <PageContainer className="max-w-5xl">
      {header}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle>{R.overall}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-semibold tabular-nums" data-testid="overall-score">
              {evaluation.overallScore}
              <span className="text-subtle-foreground text-base">/100</span>
            </p>
            <Progress
              className="mt-3"
              value={evaluation.overallScore}
              tone={
                evaluation.overallScore >= 70
                  ? "success"
                  : evaluation.overallScore >= 50
                    ? "warning"
                    : "danger"
              }
            />
            <p className="text-subtle-foreground mt-3 text-[11px]">{R.disclaimer}</p>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{R.summary}</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{evaluation.summary}</p>
          </CardContent>
        </Card>

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>{R.dimensions}</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-x-8 gap-y-4 md:grid-cols-2">
            {DIMENSIONS.map((k) => {
              const d = evaluation.dimensions[k];
              return (
                <div key={k}>
                  <div className="flex items-center justify-between text-sm">
                    <span>{R.dims[k]}</span>
                    <span className="text-muted-foreground tabular-nums">
                      {d?.score ? `${d.score}/5` : R.notExercised}
                    </span>
                  </div>
                  <Progress
                    className="mt-1"
                    value={d?.score ? (d.score / 5) * 100 : 0}
                    tone={
                      !d?.score ? "muted" : d.score >= 4 ? "success" : d.score >= 3 ? "primary" : "warning"
                    }
                  />
                  {d?.evidence ? <p className="text-muted-foreground mt-1 text-xs">{d.evidence}</p> : null}
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{R.strengths}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm">
              {evaluation.strengths.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>{R.weaknesses}</CardTitle>
          </CardHeader>
          <CardContent>
            <ul className="flex list-disc flex-col gap-1.5 pl-4 text-sm">
              {evaluation.weaknesses.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        {evaluation.mistakes.length ? (
          <Card className="md:col-span-3">
            <CardHeader>
              <CardTitle>{R.mistakes}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {evaluation.mistakes.map((x, i) => (
                <div key={i} className="border-border bg-surface-2 rounded-md border p-3 text-sm">
                  <p className="font-medium">{x.description}</p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    <span className="text-subtle-foreground">{R.evidence}: </span>“{x.evidence}”
                  </p>
                  <p className="mt-1 text-xs">
                    <span className="text-subtle-foreground">{R.correction}: </span>
                    {x.correction}
                  </p>
                </div>
              ))}
            </CardContent>
          </Card>
        ) : null}

        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>{R.modelAnswer}</CardTitle>
          </CardHeader>
          <CardContent>
            <Markdown>{evaluation.modelAnswer}</Markdown>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{R.reading}</CardTitle>
            <BookOpen className="text-subtle-foreground size-4" />
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {evaluation.recommendedTopics.map((t) => (
                <li key={t.topicSlug}>
                  <Link
                    href={`/learn/lesson/${t.topicSlug}`}
                    className="text-primary font-medium hover:underline"
                  >
                    {topicTitle.get(t.topicSlug) ?? t.topicSlug}
                  </Link>
                  <p className="text-muted-foreground text-xs">{t.reason}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{R.exercises}</CardTitle>
            <Dumbbell className="text-subtle-foreground size-4" />
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {evaluation.followUpExercises.map((f) => (
                <li key={f.title}>
                  {f.problemSlug ? (
                    <Link
                      href={`/practice/problems/${f.problemSlug}`}
                      className="text-primary font-medium hover:underline"
                    >
                      {f.title}
                    </Link>
                  ) : (
                    <span className="font-medium">{f.title}</span>
                  )}
                  <p className="text-muted-foreground text-xs">{f.description}</p>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle>{R.srs}</CardTitle>
            <Layers className="text-subtle-foreground size-4" />
          </CardHeader>
          <CardContent>
            <ul className="flex flex-col gap-2 text-sm">
              {evaluation.srsSuggestions.map((c) => (
                <li key={c.prompt}>
                  <p>{c.prompt}</p>
                  {c.topicSlug ? (
                    <Badge className="mt-1">{topicTitle.get(c.topicSlug) ?? c.topicSlug}</Badge>
                  ) : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>
      {transcript}
    </PageContainer>
  );
}
