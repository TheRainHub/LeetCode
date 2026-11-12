import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ActiveTimer } from "@/components/learn/active-timer";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Card } from "@/components/ui/card";
import { Whiteboard } from "@/components/whiteboard/whiteboard";
import { getSdQuestion } from "@/server/system-design";
import { getI18n } from "@/server/user";
import { getBoard } from "@/server/whiteboard";

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const q = getSdQuestion((await params).slug);
  return { title: q ? `Whiteboard · ${q.title}` : "Whiteboard" };
}

export default async function SdQuestionWhiteboardPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const q = getSdQuestion(slug);
  if (!q) notFound();
  const [{ m }, saved] = await Promise.all([getI18n(), getBoard(slug)]);
  const W = m.whiteboard;
  return (
    <PageContainer className="max-w-[1680px]">
      <ActiveTimer kind="exercise" refId={`sd:${slug}`} />
      <PageHeader
        eyebrow={
          <Link
            href={`/practice/system-design/${slug}`}
            className="hover:text-foreground inline-flex items-center gap-1"
            data-testid="wb-back"
          >
            <ChevronLeft className="size-3.5" />
            {W.back}
          </Link>
        }
        title={`${W.title}: ${q.title}`}
        description={W.questionDescription}
      />
      <Card className="mb-3 p-3">
        <p className="text-muted-foreground mb-0.5 text-xs font-medium">{W.prompt}</p>
        <p className="text-sm leading-relaxed" data-testid="wb-prompt">
          {q.prompt}
        </p>
      </Card>
      <Whiteboard
        boardKey={slug}
        initialBoard={saved?.board ?? null}
        expected={{ groups: q.boardBlocks, reference: q.components }}
      />
    </PageContainer>
  );
}
