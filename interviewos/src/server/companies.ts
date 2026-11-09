import "server-only";
import { and, asc, desc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import {
  applicationEvents,
  applications,
  codingAttempts,
  codingProblems,
  companies,
  companyChecklistItems,
  companyFocusTopics,
  companyNotes,
  companyProblems,
  interviewEvaluations,
  interviewPresets,
  mockInterviews,
} from "@/lib/db/schema";
import { getCompanyReadiness, getTopicStates } from "./insights";
import { getCurrentUserId } from "./user";

export async function getCompanyPage(slug: string) {
  const userId = getCurrentUserId();
  const [company] = await db.select().from(companies).where(eq(companies.slug, slug));
  if (!company) return null;
  const [focus, states, problems, attempts, presets, checklist, notes, apps, mocks, readiness] = await Promise.all([
    db.select().from(companyFocusTopics).where(eq(companyFocusTopics.companyId, company.id)),
    getTopicStates(),
    db
      .select({ id: codingProblems.id, slug: codingProblems.slug, title: codingProblems.title, difficulty: codingProblems.difficulty })
      .from(companyProblems)
      .innerJoin(codingProblems, eq(codingProblems.id, companyProblems.problemId))
      .where(eq(companyProblems.companyId, company.id))
      .orderBy(asc(codingProblems.order)),
    db
      .select({ problemId: codingAttempts.problemId, outcome: codingAttempts.outcome, independence: codingAttempts.independence })
      .from(codingAttempts)
      .where(eq(codingAttempts.userId, userId)),
    db.select().from(interviewPresets).where(eq(interviewPresets.companyId, company.id)).orderBy(asc(interviewPresets.order)),
    db
      .select()
      .from(companyChecklistItems)
      .where(and(eq(companyChecklistItems.userId, userId), eq(companyChecklistItems.companyId, company.id)))
      .orderBy(asc(companyChecklistItems.order)),
    db.select().from(companyNotes).where(and(eq(companyNotes.userId, userId), eq(companyNotes.companyId, company.id))),
    db
      .select()
      .from(applications)
      .where(and(eq(applications.userId, userId), eq(applications.companyId, company.id)))
      .orderBy(desc(applications.updatedAt)),
    db
      .select({ id: mockInterviews.id, type: mockInterviews.type, status: mockInterviews.status, startedAt: mockInterviews.startedAt, score: interviewEvaluations.overallScore })
      .from(mockInterviews)
      .leftJoin(interviewEvaluations, eq(interviewEvaluations.interviewId, mockInterviews.id))
      .where(and(eq(mockInterviews.userId, userId), eq(mockInterviews.companyId, company.id)))
      .orderBy(desc(mockInterviews.startedAt)),
    getCompanyReadiness(),
  ]);
  const app = apps[0] ?? null;
  const events = app
    ? await db.select().from(applicationEvents).where(eq(applicationEvents.applicationId, app.id)).orderBy(asc(applicationEvents.occurredOn), asc(applicationEvents.id))
    : [];
  const stateById = new Map(states.map((s) => [s.id, s]));
  const focusIds = new Set(focus.map((f) => f.topicId));
  return {
    company,
    readiness: readiness.find((r) => r.id === company.id)!,
    focus: focus
      .map((f) => ({ ...f, topic: stateById.get(f.topicId)! }))
      .filter((f) => f.topic)
      .sort((a, b) => b.weight - a.weight || a.topic.title.localeCompare(b.topic.title)),
    otherTopics: states.filter((s) => !focusIds.has(s.id)).map((s) => ({ id: s.id, title: s.title })),
    problems: problems.map((p) => {
      const mine = attempts.filter((a) => a.problemId === p.id);
      return {
        ...p,
        solved: mine.some((a) => a.outcome === "passed"),
        independent: mine.some((a) => a.outcome === "passed" && a.independence === "independent"),
      };
    }),
    presets,
    checklist,
    notes: notes[0]?.notes ?? "",
    application: app ? { id: app.id, role: app.role, stage: app.stage, events: events.map((e) => ({ stage: e.stage, occurredOn: e.occurredOn, note: e.note })) } : null,
    mocks,
  };
}
