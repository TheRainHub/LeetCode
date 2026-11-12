import { BookOpen, ChevronLeft, ExternalLink, PenTool } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES_FOR_QUESTION } from "@content/guides";
import { SD_SOURCES } from "@content/system-design";
import { GuideList } from "@/components/guides/guide-list";
import { StatusBadge } from "@/components/learn/status-badge";
import { ActiveTimer } from "@/components/learn/active-timer";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { SdMockButton } from "@/components/system-design/mock-button";
import { SdStatusIcon } from "@/components/system-design/status-icon";
import { SdWorkspace } from "@/components/system-design/workspace";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import { fullRubric } from "@/lib/system-design/status";
import { getGuidesBySlugs } from "@/server/guides";
import { getTopicStates } from "@/server/insights";
import { getSdQuestion, getSdWorkspace, listSdProgress } from "@/server/system-design";
import { getI18n } from "@/server/user";
import { getBoard } from "@/server/whiteboard";
import { countComponents } from "@/lib/whiteboard/board";
import { Button } from "@/components/ui/button";

// Server actions on this page include the AI design review.
export const maxDuration = 300;

const DIFFICULTY_TONE = { easy: "success", medium: "warning", hard: "danger" } as const;

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const q = getSdQuestion((await params).slug);
  return { title: q?.title ?? "System design" };
}

export default async function SdQuestionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = getSdQuestion(slug);
  if (!q) notFound();
  const [{ m, locale }, ws, progress, topicStates, relatedGuides, board] = await Promise.all([
    getI18n(),
    getSdWorkspace(slug),
    listSdProgress(),
    getTopicStates(),
    getGuidesBySlugs(GUIDES_FOR_QUESTION[slug] ?? []),
    getBoard(slug),
  ]);
  const boardComponents = countComponents(board?.board);
  const WB = m.whiteboard.card;
  const S = m.sd;
  const status = progress.get(slug)?.status ?? "not_started";
  const topic = new Map(topicStates.map((t) => [t.slug, t]));
  const fmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const history = [
    ...ws.attempts.map((a) => ({
      key: `a${a.id}`,
      at: a.createdAt,
      label: a.gradedBy === "ai" ? S.ws.history.ai : S.ws.history.self,
      value: `${Math.round(a.score * 100)}%`,
      href: null as string | null,
    })),
    ...ws.interviews.map((i) => ({
      key: `i${i.id}`,
      at: i.startedAt,
      label: S.ws.history.interview,
      value: i.overallScore != null ? `${i.overallScore}/100` : S.ws.history.inProgress,
      href: `/interviews/${i.id}`,
    })),
  ].sort((a, b) => b.at.getTime() - a.at.getTime());

  return (
    <PageContainer wide>
      <ActiveTimer kind="exercise" refId={`sd:${slug}`} />
      <PageHeader
        eyebrow={
          <Link
            href="/practice/system-design"
            className="hover:text-foreground inline-flex items-center gap-1"
          >
            <ChevronLeft className="size-3.5" />
            {S.ws.back}
          </Link>
        }
        title={q.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <Badge tone={DIFFICULTY_TONE[q.difficulty]}>{m.common.difficulty[q.difficulty]}</Badge>
            <Badge tone="neutral">{S.categories[q.category]}</Badge>
            <span className="inline-flex items-center gap-1 text-xs" data-testid="sd-status">
              <SdStatusIcon status={status} label={S.status[status]} decorative />
              {S.status[status]}
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-4">
            <p className="text-muted-foreground mb-1 text-xs font-medium">{S.ws.prompt}</p>
            <p className="text-base leading-relaxed" data-testid="sd-prompt">
              {q.prompt}
            </p>
          </Card>
          <Card className="flex flex-wrap items-center gap-3 p-4" data-testid="sd-board-card">
            <span className="bg-primary-soft text-primary grid size-9 shrink-0 place-items-center rounded-md">
              <PenTool className="size-4" aria-hidden />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold">{WB.title}</p>
              <p className="text-muted-foreground text-xs">
                {boardComponents ? WB.count(boardComponents) : WB.empty}
                {boardComponents >= 2 && isAiConfigured() ? ` ${WB.inReview}` : ""}
              </p>
            </div>
            <Button asChild size="sm" variant={boardComponents ? "secondary" : "primary"}>
              <Link href={`/practice/system-design/${slug}/whiteboard`} data-testid="sd-open-board">
                {WB.open}
              </Link>
            </Button>
          </Card>
          <SdWorkspace
            slug={slug}
            rubric={fullRubric(q)}
            initialSections={ws.draft}
            guide={{
              clarify: q.clarify,
              functional: q.functional,
              nonFunctional: q.nonFunctional,
              estimates: q.estimates,
              components: q.components,
              deepDives: q.deepDives,
              pitfalls: q.pitfalls,
              followUps: q.followUps,
            }}
            aiEnabled={isAiConfigured()}
          />
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{S.ws.mock.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">{S.ws.mock.description}</p>
              <SdMockButton slug={slug} enabled={isAiConfigured()} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{S.ws.concepts}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-1.5">
              {q.concepts.map((c) => {
                const t = topic.get(c);
                return (
                  <div key={c} className="flex items-center gap-2 text-xs">
                    <Link href={`/learn/lesson/${c}`} className="hover:text-primary min-w-0 flex-1 truncate">
                      {t?.title ?? c}
                    </Link>
                    <StatusBadge status={t?.status ?? "not_started"} withHelp={false} />
                  </div>
                );
              })}
              {q.caseStudy ? (
                <Link
                  href={`/learn/lesson/${q.caseStudy}`}
                  className="text-primary mt-1 inline-flex items-center gap-1.5 text-xs hover:underline"
                >
                  <BookOpen className="size-3.5" aria-hidden />
                  {topic.get(q.caseStudy)?.title ?? S.caseStudy}
                </Link>
              ) : null}
            </CardContent>
          </Card>

          {relatedGuides.length ? (
            <Card data-testid="sd-guides">
              <CardHeader>
                <CardTitle>{S.guides.card}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-2">
                <GuideList guides={relatedGuides} readLabel={S.guides.markedRead} />
                <p className="text-subtle-foreground text-[11px]">{S.guides.cardHelp}</p>
              </CardContent>
            </Card>
          ) : null}

          {q.listedIn.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{S.ws.listedIn}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {q.listedIn.map((s) => (
                  <a
                    key={s}
                    href={SD_SOURCES[s].url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="hover:text-primary inline-flex items-center gap-1.5 text-xs"
                  >
                    <ExternalLink className="size-3" aria-hidden />
                    {SD_SOURCES[s].name}
                  </a>
                ))}
              </CardContent>
            </Card>
          ) : null}

          <Card data-testid="sd-history">
            <CardHeader>
              <CardTitle>{S.ws.history.title}</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length ? (
                <ul className="flex flex-col gap-1.5 text-xs">
                  {history.map((h) => (
                    <li key={h.key} className="flex items-center gap-2">
                      <span className="text-subtle-foreground w-24 shrink-0 tabular-nums">
                        {fmt.format(h.at)}
                      </span>
                      {h.href ? (
                        <Link href={h.href} className="hover:text-primary flex-1">
                          {h.label}
                        </Link>
                      ) : (
                        <span className="flex-1">{h.label}</span>
                      )}
                      <span className="tabular-nums">{h.value}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-xs">{S.ws.history.empty}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}
