import { eq, inArray } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import * as s from "@/lib/db/schema";
import { getCurrentUserId } from "@/server/user";

/** Exports all user-owned data (no content tables) as a JSON download. */
export async function GET() {
  const userId = getCurrentUserId();
  const interviews = await db.select().from(s.mockInterviews).where(eq(s.mockInterviews.userId, userId));
  const interviewIds = interviews.length ? interviews.map((i) => i.id) : [-1];
  const plans = await db.select().from(s.studyPlans).where(eq(s.studyPlans.userId, userId));
  const planIds = plans.length ? plans.map((p) => p.id) : [-1];
  const sessions = await db.select().from(s.studySessions).where(inArray(s.studySessions.planId, planIds));
  const sessionIds = sessions.length ? sessions.map((x) => x.id) : [-1];
  const schedules = await db.select().from(s.reviewSchedules).where(eq(s.reviewSchedules.userId, userId));
  const scheduleIds = schedules.length ? schedules.map((x) => x.id) : [-1];
  const apps = await db.select().from(s.applications).where(eq(s.applications.userId, userId));
  const appIds = apps.length ? apps.map((a) => a.id) : [-1];

  const data = {
    exportedAt: new Date().toISOString(),
    settings: await db.select().from(s.userSettings).where(eq(s.userSettings.userId, userId)),
    lessonProgress: await db.select().from(s.lessonProgress).where(eq(s.lessonProgress.userId, userId)),
    topicProgress: await db.select().from(s.topicProgress).where(eq(s.topicProgress.userId, userId)),
    exerciseAttempts: await db.select().from(s.exerciseAttempts).where(eq(s.exerciseAttempts.userId, userId)),
    codingAttempts: await db.select().from(s.codingAttempts).where(eq(s.codingAttempts.userId, userId)),
    codeDrafts: await db.select().from(s.codeDrafts).where(eq(s.codeDrafts.userId, userId)),
    problemNotes: await db.select().from(s.problemNotes).where(eq(s.problemNotes.userId, userId)),
    customTestCases: await db.select().from(s.customTestCases).where(eq(s.customTestCases.userId, userId)),
    labAttempts: await db.select().from(s.labAttempts).where(eq(s.labAttempts.userId, userId)),
    reviewCards: await db.select().from(s.reviewCards).where(eq(s.reviewCards.userId, userId)),
    reviewSchedules: schedules,
    reviewLogs: await db.select().from(s.reviewLogs).where(inArray(s.reviewLogs.scheduleId, scheduleIds)),
    mockInterviews: interviews,
    interviewMessages: (await db.select().from(s.interviewMessages).where(inArray(s.interviewMessages.interviewId, interviewIds))).map((x) => ({ ...x, apiContent: undefined })),
    interviewEvaluations: await db.select().from(s.interviewEvaluations).where(inArray(s.interviewEvaluations.interviewId, interviewIds)),
    studyPlans: plans,
    studySessions: sessions,
    studyTasks: await db.select().from(s.studyTasks).where(inArray(s.studyTasks.sessionId, sessionIds)),
    calendarEvents: await db.select().from(s.calendarEvents).where(eq(s.calendarEvents.userId, userId)),
    weeklyObjectives: await db.select().from(s.weeklyObjectives).where(eq(s.weeklyObjectives.userId, userId)),
    applications: apps,
    applicationEvents: await db.select().from(s.applicationEvents).where(inArray(s.applicationEvents.applicationId, appIds)),
    companyChecklistItems: await db.select().from(s.companyChecklistItems).where(eq(s.companyChecklistItems.userId, userId)),
    companyNotes: await db.select().from(s.companyNotes).where(eq(s.companyNotes.userId, userId)),
    personalProjects: await db.select().from(s.personalProjects).where(eq(s.personalProjects.userId, userId)),
    starStories: await db.select().from(s.starStories).where(eq(s.starStories.userId, userId)),
    experiencePractice: await db.select().from(s.experiencePractice).where(eq(s.experiencePractice.userId, userId)),
    timeEntries: await db.select().from(s.timeEntries).where(eq(s.timeEntries.userId, userId)),
  };
  return new NextResponse(JSON.stringify(data, null, 2), {
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="interviewos-export-${new Date().toISOString().slice(0, 10)}.json"`,
    },
  });
}
