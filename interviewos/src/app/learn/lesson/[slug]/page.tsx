import {
  ArrowLeft,
  ArrowRight,
  Check,
  ChevronLeft,
  CircleDashed,
  Clock,
  ExternalLink,
  Info,
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/content/markdown";
import { ActiveTimer } from "@/components/learn/active-timer";
import { ExplainExercise } from "@/components/learn/explain-exercise";
import { HideInInterviewMode, LessonShell } from "@/components/learn/lesson-shell";
import {
  ConfidencePicker,
  MarkReadButton,
  NotesEditor,
  RevealAnswer,
} from "@/components/learn/lesson-widgets";
import { Quiz } from "@/components/learn/quiz";
import { StatusBadge } from "@/components/learn/status-badge";
import { PageContainer } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import type { TopicStatus } from "@/lib/mastery/status";
import { cn } from "@/lib/utils";
import { gradeExplanationAction } from "@/app/learn/ai-actions";
import { LessonBankPractice } from "@/components/bank/lesson-practice";
import { getLessonBankPractice } from "@/server/bank";
import { getLessonPage } from "@/server/learn";
import { getI18n } from "@/server/user";

function Section({
  id,
  title,
  children,
  className,
}: {
  id: string;
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section id={id} aria-labelledby={`${id}-h`} className={cn("scroll-mt-6", className)}>
      <h2 id={`${id}-h`} className="mb-3 text-base font-semibold tracking-tight">
        {title}
      </h2>
      {children}
    </section>
  );
}

function Check2({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2 text-sm">
      {ok ? (
        <Check className="text-success size-4" />
      ) : (
        <CircleDashed className="text-subtle-foreground size-4" />
      )}
      <span className={ok ? "" : "text-muted-foreground"}>{label}</span>
    </li>
  );
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  return { title: slug.replace(/-/g, " ") };
}

// Server actions on this page include AI grading of explanations.
export const maxDuration = 300;

export default async function LessonPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ m }, data, bankPractice] = await Promise.all([
    getI18n(),
    getLessonPage(slug),
    getLessonBankPractice(slug, 6),
  ]);
  if (!data) notFound();
  const L = m.learn.lesson;
  const { lesson } = data;
  const status = (data.topic?.status ?? "not_started") as TopicStatus;
  const missing = (data.topic?.missing ?? ["read", "recognize", "explain", "more_results"]).filter(
    (x) => x in m.common.missing,
  ) as (keyof typeof m.common.missing)[];
  const read = Boolean(data.progress?.readAt);
  const toc = [
    ["objectives", L.objectives],
    ["explanation", L.explanation],
    ["examples", L.workedExamples],
    ["misconceptions", L.misconceptions],
    ["exercises", L.exercises],
    ["reading", L.readings],
    ["interview", L.interviewQuestions],
    ["quiz", L.quiz],
    ["explain", L.explain],
    ["self", L.selfAssessment],
    ["completion", L.completion],
  ] as const;

  return (
    <LessonShell>
      <ActiveTimer kind="lesson" refId={lesson.slug} />
      <PageContainer wide>
        <div className="grid grid-cols-1 gap-8 xl:grid-cols-[minmax(0,1fr)_240px]">
          <article className="min-w-0">
            <header className="mb-8">
              <Link
                href={`/learn/${data.path.slug}`}
                className="text-muted-foreground hover:text-foreground inline-flex items-center gap-1 text-xs"
              >
                <ChevronLeft className="size-3.5" />
                {data.path.title} · {data.module.title}
              </Link>
              <h1 className="mt-2 text-2xl font-semibold tracking-tight">{lesson.title}</h1>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <StatusBadge status={status} />
                <Badge tone="outline">
                  {lesson.depth === "full" ? m.learn.depth.full : m.learn.depth.concise}
                </Badge>
                <span className="text-muted-foreground flex items-center gap-1 text-xs">
                  <Clock className="size-3.5" />
                  {L.minutes(lesson.estimatedMinutes)}
                </span>
                <span className="ml-auto">
                  <MarkReadButton lessonId={lesson.id} read={read} />
                </span>
              </div>
              {lesson.depth === "concise" ? (
                <p className="border-border bg-surface-2 text-muted-foreground mt-3 flex items-start gap-2 rounded-md border px-3 py-2 text-xs">
                  <Info className="mt-0.5 size-3.5 shrink-0" />
                  {m.learn.depthHelp.concise}
                </p>
              ) : null}
            </header>

            <div className="flex flex-col gap-10">
              <Section id="objectives" title={L.objectives}>
                <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                  {lesson.objectives.map((o) => (
                    <li key={o}>{o}</li>
                  ))}
                </ul>
                <p className="text-muted-foreground mt-4 text-xs">
                  {m.learn.prerequisites}:{" "}
                  {data.prerequisites.length === 0
                    ? m.learn.noPrerequisites
                    : data.prerequisites.map((p, i) => (
                        <span key={p.slug}>
                          {i > 0 ? ", " : ""}
                          <Link href={`/learn/lesson/${p.slug}`} className="text-primary hover:underline">
                            {p.title}
                          </Link>
                          <span className="text-subtle-foreground"> ({m.common.status[p.status]})</span>
                        </span>
                      ))}
                </p>
              </Section>

              <HideInInterviewMode>
                <div className="flex flex-col gap-10">
                  <Section id="explanation" title={L.explanation}>
                    <Markdown>{lesson.explanation}</Markdown>
                  </Section>
                  <Section id="examples" title={L.workedExamples}>
                    <Markdown>{lesson.workedExamples}</Markdown>
                  </Section>
                  <Section id="misconceptions" title={L.misconceptions}>
                    <Markdown>{lesson.misconceptions}</Markdown>
                  </Section>
                  <Section id="exercises" title={L.exercises}>
                    <Markdown>{lesson.practicalExercises}</Markdown>
                    {data.problems.length ? (
                      <div className="mt-4">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">{L.relatedProblems}</p>
                        <div className="flex flex-wrap gap-2">
                          {data.problems.map((p) => (
                            <Button key={p.id} asChild size="sm" variant="outline">
                              <Link href={`/practice/problems/${p.slug}`}>
                                {p.solved ? <Check className="text-success" /> : null}
                                {p.title}
                                <Badge tone="neutral">{m.common.difficulty[p.difficulty]}</Badge>
                              </Link>
                            </Button>
                          ))}
                        </div>
                      </div>
                    ) : null}
                    <LessonBankPractice lesson={lesson.slug} practice={bankPractice} m={m} />
                  </Section>
                  <Section id="reading" title={L.readings}>
                    <ul className="flex flex-col gap-2">
                      {lesson.readings.map((r) => (
                        <li key={r.url}>
                          <a
                            href={r.url}
                            target="_blank"
                            rel="noreferrer noopener"
                            className="group border-border bg-surface hover:border-border-strong flex items-start gap-3 rounded-md border px-3 py-2.5"
                          >
                            <ExternalLink className="text-subtle-foreground group-hover:text-primary mt-0.5 size-3.5 shrink-0" />
                            <span className="min-w-0">
                              <span className="group-hover:text-primary block text-sm">{r.title}</span>
                              {r.note ? (
                                <span className="text-muted-foreground block text-xs">{r.note}</span>
                              ) : null}
                              <span className="text-subtle-foreground block truncate text-[11px]">
                                {r.kind} · {new URL(r.url).hostname}
                              </span>
                            </span>
                          </a>
                        </li>
                      ))}
                    </ul>
                  </Section>
                  <Section id="interview" title={L.interviewQuestions}>
                    <ul className="flex flex-col gap-2">
                      {lesson.interviewQuestions.map((q) => (
                        <RevealAnswer key={q.q} question={q.q} answer={q.a} />
                      ))}
                    </ul>
                  </Section>
                  <Section id="quiz" title={L.quiz}>
                    <p className="text-muted-foreground -mt-1 mb-3 text-xs">{L.quizHelp}</p>
                    <Quiz lessonId={lesson.id} questions={data.quiz} />
                  </Section>
                </div>
              </HideInInterviewMode>

              {data.explain ? (
                <Section id="explain" title={L.explain}>
                  <ExplainExercise
                    exerciseId={data.explain.id}
                    prompt={data.explain.prompt}
                    attempts={data.explainState.attempts}
                    best={data.explainState.best}
                    aiGrader={isAiConfigured() ? gradeExplanationAction : undefined}
                  />
                </Section>
              ) : null}

              <HideInInterviewMode>
                <div className="flex flex-col gap-10">
                  <Section id="self" title={L.selfAssessment}>
                    <ul className="text-muted-foreground mb-4 flex list-disc flex-col gap-1 pl-5 text-sm">
                      {lesson.selfAssessment.map((s) => (
                        <li key={s}>{s}</li>
                      ))}
                    </ul>
                    <ConfidencePicker lessonId={lesson.id} value={data.progress?.confidence ?? null} />
                  </Section>

                  <Section id="completion" title={L.completion}>
                    <div className="grid gap-4 md:grid-cols-2">
                      <Card className="p-4">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">{L.systemChecks}</p>
                        <ul className="flex flex-col gap-1.5">
                          <Check2 ok={read} label={L.checks.read} />
                          <Check2
                            ok={data.quizState.passed}
                            label={`${L.checks.quiz} (${data.quizState.correct}/${data.quizState.total})`}
                          />
                          <Check2 ok={data.explainState.passed} label={L.checks.explain} />
                          <Check2 ok={data.progress?.confidence != null} label={L.checks.confidence} />
                        </ul>
                        {data.progress?.completedAt ? (
                          <Badge tone="success" className="mt-3">
                            {L.completed}
                          </Badge>
                        ) : null}
                      </Card>
                      <Card className="p-4">
                        <p className="text-muted-foreground mb-2 text-xs font-medium">{L.lessonCriteria}</p>
                        <ul className="flex list-disc flex-col gap-1 pl-5 text-sm">
                          {lesson.completionCriteria.map((c) => (
                            <li key={c}>{c}</li>
                          ))}
                        </ul>
                      </Card>
                    </div>
                    <div className="mt-6">
                      <p className="text-muted-foreground mb-2 text-xs font-medium">{L.notes}</p>
                      <NotesEditor lessonId={lesson.id} initial={data.progress?.notes ?? ""} />
                    </div>
                  </Section>

                  <nav className="border-border flex items-center justify-between border-t pt-4">
                    {data.prev ? (
                      <Link
                        href={`/learn/lesson/${data.prev.slug}`}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
                      >
                        <ArrowLeft className="size-4" />
                        {data.prev.title}
                      </Link>
                    ) : (
                      <span />
                    )}
                    {data.next ? (
                      <Link
                        href={`/learn/lesson/${data.next.slug}`}
                        className="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
                      >
                        {data.next.title}
                        <ArrowRight className="size-4" />
                      </Link>
                    ) : null}
                  </nav>
                </div>
              </HideInInterviewMode>
            </div>
          </article>

          <aside className="hidden xl:block">
            <div className="sticky top-6 flex flex-col gap-5">
              <div>
                <p className="text-subtle-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
                  {L.contents}
                </p>
                <ul className="border-border flex flex-col gap-1 border-l">
                  {toc.map(([id, label]) => (
                    <li key={id}>
                      <a
                        href={`#${id}`}
                        className="text-muted-foreground hover:border-foreground hover:text-foreground -ml-px block border-l border-transparent py-0.5 pl-3 text-xs"
                      >
                        {label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
              <div>
                <p className="text-subtle-foreground mb-2 text-[11px] font-medium tracking-wide uppercase">
                  {L.whatsMissing}
                </p>
                {status === "interview_ready" ? (
                  <p className="text-success text-xs">{m.common.status.interview_ready}</p>
                ) : (
                  <ul className="flex flex-col gap-1.5">
                    {missing.map((k) => (
                      <li key={k} className="text-muted-foreground flex items-start gap-1.5 text-xs">
                        <CircleDashed className="mt-0.5 size-3 shrink-0" />
                        {m.common.missing[k]}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </aside>
        </div>
      </PageContainer>
    </LessonShell>
  );
}
