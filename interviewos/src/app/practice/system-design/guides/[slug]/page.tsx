import { BookOpen, ChevronLeft, ExternalLink, Network } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { GUIDES_SOURCE, guideSourceUrl } from "@content/guides";
import { SD_QUESTIONS } from "@content/system-design";
import { Markdown } from "@/components/content/markdown";
import { GuideReadToggle } from "@/components/guides/read-toggle";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatDay } from "@/lib/dates";
import { toRenderableMarkdown } from "@/lib/guides/parse";
import { getGuide } from "@/server/guides";
import { getTopicStates } from "@/server/insights";
import { getI18n } from "@/server/user";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const g = await getGuide((await params).slug);
  return { title: g?.title ?? "Visual guide" };
}

export default async function GuidePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const [{ m, locale }, guide, topics] = await Promise.all([getI18n(), getGuide(slug), getTopicStates()]);
  if (!guide) notFound();
  const G = m.sd.guides;
  const lessonTitle = new Map(topics.map((t) => [t.slug, t.title]));
  const questions = SD_QUESTIONS.filter((q) => guide.questions.includes(q.slug));

  return (
    <PageContainer>
      <PageHeader
        eyebrow={
          <Link
            href="/practice/system-design/guides"
            className="hover:text-foreground inline-flex items-center gap-1"
          >
            <ChevronLeft className="size-3.5" />
            {G.title}
          </Link>
        }
        title={guide.title}
        description={guide.description || undefined}
        actions={<GuideReadToggle slug={guide.slug} read={guide.read} />}
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_260px]">
        <article className="min-w-0" data-testid="guide-content">
          <Markdown>{toRenderableMarkdown(guide.content)}</Markdown>
        </article>
        <aside className="flex flex-col gap-4">
          <Card data-testid="guide-attribution">
            <CardContent className="flex flex-col gap-2 pt-4 text-xs">
              <p className="text-muted-foreground">
                {G.attribution(GUIDES_SOURCE.author, GUIDES_SOURCE.license)}
              </p>
              <a
                href={guideSourceUrl(guide.path)}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-primary inline-flex items-center gap-1.5"
              >
                <ExternalLink className="size-3" aria-hidden />
                {G.original}
              </a>
              <a
                href={GUIDES_SOURCE.licenseUrl}
                target="_blank"
                rel="noreferrer noopener"
                className="hover:text-primary inline-flex items-center gap-1.5"
              >
                <ExternalLink className="size-3" aria-hidden />
                {G.license}: {GUIDES_SOURCE.license}
              </a>
              {guide.publishedOn ? (
                <span className="text-subtle-foreground">
                  {formatDay(guide.publishedOn, locale, { weekday: undefined, year: "numeric" })}
                </span>
              ) : null}
              <div className="flex flex-wrap gap-1">
                {guide.tags.map((t) => (
                  <Badge key={t} tone="outline">
                    {t}
                  </Badge>
                ))}
              </div>
            </CardContent>
          </Card>
          {guide.lessons.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{G.relatedLessons}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {guide.lessons.map((l) => (
                  <Link
                    key={l}
                    href={`/learn/lesson/${l}`}
                    className="hover:text-primary inline-flex items-center gap-1.5 text-xs"
                  >
                    <BookOpen className="text-primary size-3.5" aria-hidden />
                    {lessonTitle.get(l) ?? l}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
          {questions.length ? (
            <Card>
              <CardHeader>
                <CardTitle>{G.relatedQuestions}</CardTitle>
              </CardHeader>
              <CardContent className="flex flex-col gap-1.5">
                {questions.map((q) => (
                  <Link
                    key={q.slug}
                    href={`/practice/system-design/${q.slug}`}
                    className="hover:text-primary inline-flex items-center gap-1.5 text-xs"
                  >
                    <Network className="text-primary size-3.5" aria-hidden />
                    {q.title}
                  </Link>
                ))}
              </CardContent>
            </Card>
          ) : null}
        </aside>
      </div>
    </PageContainer>
  );
}
