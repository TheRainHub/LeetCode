import "server-only";
import { taskHref, type TaskKind } from "@/lib/tasks";
import { getRecommendations } from "./insights";
import { getTasksBetween } from "./scheduler";
import { getDueCards, getDueProblems } from "./srs";
import { getToday } from "./user";

export type NextAction =
  | { kind: "task"; href: string; title: string; minutes: number }
  | { kind: "review"; href: string; count: number }
  | { kind: "problem_review"; href: string; title: string }
  | { kind: "recommendation"; href: string; title: string }
  | { kind: "explore"; href: string };

/**
 * Highest-priority next step: today's planned work first, then due reviews,
 * then problems due for re-solving, then the top recommendation.
 */
export async function getNextAction(): Promise<NextAction> {
  const today = await getToday();
  const tasks = (await getTasksBetween(today, today)).filter((t) => t.status === "todo");
  const first = tasks[0];
  if (first) {
    return {
      kind: "task",
      href: taskHref(first.kind as TaskKind, first.refSlug),
      title: first.title,
      minutes: first.minutes,
    };
  }
  const cards = await getDueCards(200);
  if (cards.length > 0) return { kind: "review", href: "/practice/review", count: cards.length };
  const problems = await getDueProblems();
  if (problems[0])
    return {
      kind: "problem_review",
      href: `/practice/problems/${problems[0].slug}`,
      title: problems[0].title,
    };
  const [rec] = await getRecommendations(1);
  if (rec) return { kind: "recommendation", href: `/learn/lesson/${rec.slug}`, title: rec.title };
  return { kind: "explore", href: "/learn" };
}
