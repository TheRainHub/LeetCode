import { ChevronLeft, ExternalLink } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Markdown } from "@/components/content/markdown";
import { AnalysisView } from "@/components/jobs/analysis-view";
import {
  AnalyzeButton,
  DeletePosting,
  EditPosting,
  FetchTextButton,
  StartJobInterview,
} from "@/components/jobs/posting-actions";
import { StatusSelect } from "@/components/jobs/status-select";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import { MIN_RESUME_CHARS } from "@/lib/jobs/model";
import { getCareerProfile, getPosting, getPreparationContext, resumeFingerprint } from "@/server/jobs";
import { getI18n } from "@/server/user";

// Analysis (with optional web research), importing text and starting interviews run the model.
export const maxDuration = 300;

export async function generateMetadata({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  const data = Number.isInteger(id) && id > 0 ? await getPosting(id) : null;
  return { title: data ? `${data.posting.title} — ${data.posting.company}` : "Job posting" };
}

export default async function JobPostingPage({ params }: { params: Promise<{ id: string }> }) {
  const id = Number((await params).id);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [{ m, locale }, data, profile, context] = await Promise.all([
    getI18n(),
    getPosting(id),
    getCareerProfile(),
    getPreparationContext(),
  ]);
  if (!data) notFound();
  const { posting, events, analyses, interviews } = data;
  const J = m.jobs;
  const fmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const fmtTime = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const aiEnabled = isAiConfigured();
  const latest = analyses[0] ?? null;
  const stale = latest ? latest.resumeHash !== (await resumeFingerprint(profile.resume)) : false;
  const hasText = posting.description.trim().length >= 200;
  const disabledReason = !aiEnabled
    ? J.aiDisabled
    : profile.resume.trim().length < MIN_RESUME_CHARS
      ? J.analysis.needsResume
      : !hasText
        ? J.analysis.needsText
        : null;

  return (
    <PageContainer wide>
      <PageHeader
        eyebrow={
          <Link href="/jobs" className="hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-3.5" />
            {J.posting.back}
          </Link>
        }
        title={posting.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <span data-testid="posting-company">{posting.company}</span>
            {posting.location ? <span>· {posting.location}</span> : null}
            {posting.workMode ? <Badge tone="neutral">{J.workMode[posting.workMode]}</Badge> : null}
            <Badge tone="outline">{J.source[posting.source]}</Badge>
          </span>
        }
        actions={
          <>
            {posting.url ? (
              <a
                href={posting.url}
                target="_blank"
                rel="noreferrer noopener"
                className="text-primary inline-flex items-center gap-1 text-sm hover:underline"
              >
                <ExternalLink className="size-4" aria-hidden />
                {J.posting.open}
              </a>
            ) : null}
            <StatusSelect id={posting.id} status={posting.status} />
          </>
        }
      />

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card data-testid="analysis-card">
            <CardHeader>
              <CardTitle>{J.analysis.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {latest ? (
                <>
                  <p className="text-subtle-foreground text-[11px]">
                    {J.analysis.made(fmtTime.format(latest.createdAt))}
                  </p>
                  {stale ? (
                    <p
                      className="border-warning/40 bg-warning-soft rounded-md border p-2 text-xs"
                      data-testid="analysis-stale"
                    >
                      {J.analysis.stale}
                    </p>
                  ) : null}
                  <AnalysisView
                    analysis={latest.data}
                    sources={latest.sources}
                    droppedRewrites={latest.droppedRewrites}
                    lessonTitles={new Map(context.lessons.map((l) => [l.slug, l.title]))}
                    sdTitles={new Map(context.sdQuestions.map((q) => [q.slug, q.title]))}
                    m={J}
                  />
                </>
              ) : (
                <p className="text-muted-foreground text-sm">{J.analysis.empty}</p>
              )}
              <AnalyzeButton id={posting.id} rerun={Boolean(latest)} disabledReason={disabledReason} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>{J.posting.text}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {posting.description.trim() ? (
                <div className="max-h-[32rem] overflow-y-auto" data-testid="posting-text">
                  <Markdown compact>{posting.description}</Markdown>
                </div>
              ) : (
                <p className="text-muted-foreground text-sm">{J.posting.noText}</p>
              )}
              {!hasText && posting.url && aiEnabled ? <FetchTextButton id={posting.id} /> : null}
              <EditPosting
                id={posting.id}
                initial={{
                  title: posting.title,
                  company: posting.company,
                  location: posting.location,
                  workMode: posting.workMode,
                  url: posting.url,
                  description: posting.description,
                  notes: posting.notes,
                }}
              />
            </CardContent>
          </Card>
        </div>

        <aside className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{J.interview.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-2">
              <p className="text-muted-foreground text-xs">{J.interview.help}</p>
              <StartJobInterview id={posting.id} enabled={aiEnabled} />
              {interviews.length ? (
                <div className="mt-1">
                  <p className="text-muted-foreground mb-1 text-xs font-medium">{J.interview.past}</p>
                  <ul className="flex flex-col gap-1 text-xs">
                    {interviews.map((i) => (
                      <li key={i.id}>
                        <Link href={`/interviews/${i.id}`} className="hover:text-primary">
                          {fmtTime.format(i.startedAt)}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </CardContent>
          </Card>

          {posting.companySlug ? (
            <Card className="p-4">
              <Link
                href={`/companies/${posting.companySlug}`}
                className="text-primary text-sm hover:underline"
                data-testid="posting-company-track"
              >
                {J.posting.companyTrack} →
              </Link>
            </Card>
          ) : null}

          <Card>
            <CardHeader>
              <CardTitle>{J.posting.notes}</CardTitle>
            </CardHeader>
            <CardContent>
              {posting.notes.trim() ? (
                <p className="text-sm whitespace-pre-line" data-testid="posting-notes">
                  {posting.notes}
                </p>
              ) : (
                <p className="text-muted-foreground text-xs">{J.posting.noNotes}</p>
              )}
            </CardContent>
          </Card>

          <Card data-testid="posting-history">
            <CardHeader>
              <CardTitle>{J.posting.history}</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="flex flex-col gap-1 text-xs">
                {events.map((e) => (
                  <li key={e.id} className="flex justify-between gap-2">
                    <span>{J.status[e.status]}</span>
                    <span className="text-subtle-foreground tabular-nums">{fmt.format(e.createdAt)}</span>
                  </li>
                ))}
              </ul>
            </CardContent>
          </Card>

          <DeletePosting id={posting.id} />
        </aside>
      </div>
    </PageContainer>
  );
}
