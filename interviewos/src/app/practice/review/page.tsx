import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { AddCardDialog } from "@/components/review/add-card";
import { ReviewSession } from "@/components/review/review-session";
import { getTopicStates } from "@/server/insights";
import { getDueCards } from "@/server/srs";
import { getI18n } from "@/server/user";

export const metadata = { title: "Review" };

export default async function ReviewPage() {
  const [{ m }, due, topics] = await Promise.all([getI18n(), getDueCards(60), getTopicStates()]);
  const title = new Map(topics.map((t) => [t.id, t.title]));
  return (
    <PageContainer className="max-w-3xl">
      <PageHeader
        eyebrow={
          <Link href="/practice?tab=review" className="hover:text-foreground inline-flex items-center gap-1">
            <ChevronLeft className="size-3.5" />
            {m.practice.title}
          </Link>
        }
        title={m.review.title}
        description={m.review.description}
        actions={<AddCardDialog topics={topics.map((t) => ({ id: t.id, title: t.title }))} />}
      />
      <ReviewSession
        cards={due.map((c) => ({
          scheduleId: c.scheduleId,
          prompt: c.prompt,
          answer: c.answer,
          source: c.source,
          topicTitle: c.topicId ? (title.get(c.topicId) ?? null) : null,
        }))}
      />
    </PageContainer>
  );
}
