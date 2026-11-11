import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { labAttempts, labTopics, practicalLabs, topics } from "@/lib/db/schema";
import { getCurrentUserId } from "./user";

export async function listLabs() {
  const userId = getCurrentUserId();
  const [labs, attempts] = await Promise.all([
    db.select().from(practicalLabs).orderBy(asc(practicalLabs.order)),
    db
      .select({ labId: labAttempts.labId, status: labAttempts.status, updatedAt: labAttempts.updatedAt })
      .from(labAttempts)
      .where(eq(labAttempts.userId, userId))
      .orderBy(desc(labAttempts.updatedAt)),
  ]);
  return labs.map((l) => {
    const mine = attempts.filter((a) => a.labId === l.id);
    const status = mine.some((a) => a.status === "verified")
      ? "verified"
      : mine.length
        ? "in_progress"
        : null;
    return {
      id: l.id,
      slug: l.slug,
      title: l.title,
      summary: l.summary,
      estimatedMinutes: l.estimatedMinutes,
      difficulty: l.difficulty,
      stepCount: l.steps.length,
      status,
    };
  });
}

export async function getLab(slug: string) {
  const userId = getCurrentUserId();
  const [lab] = await db.select().from(practicalLabs).where(eq(practicalLabs.slug, slug));
  if (!lab) return null;
  const [attempts, topicRows] = await Promise.all([
    db
      .select()
      .from(labAttempts)
      .where(and(eq(labAttempts.userId, userId), eq(labAttempts.labId, lab.id)))
      .orderBy(desc(labAttempts.startedAt)),
    db
      .select({ slug: topics.slug, title: topics.title })
      .from(labTopics)
      .innerJoin(topics, eq(topics.id, labTopics.topicId))
      .where(eq(labTopics.labId, lab.id)),
  ]);
  return {
    lab,
    attempt: attempts[0] ?? null,
    verifiedBefore: attempts.some((a) => a.status === "verified"),
    topics: topicRows,
  };
}
