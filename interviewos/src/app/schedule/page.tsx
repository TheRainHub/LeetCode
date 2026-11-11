import { and, asc, eq, gte } from "drizzle-orm";
import { TaskRow, type PlanTask } from "@/components/dashboard/plan-widgets";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import {
  AddEventForm,
  CapacitySettingsForm,
  CreatePlanForm,
  DayActions,
  DeleteEventButton,
  MoveTask,
  Objectives,
  PullForwardButton,
} from "@/components/schedule/schedule-widgets";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { INTERVIEW_SPRINT } from "@content/plan-template";
import { db } from "@/lib/db";
import { calendarEvents, companies, weeklyObjectives } from "@/lib/db/schema";
import { addDays, formatDay, formatMinutes, startOfWeek } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { ensurePlanUpToDate, getActivePlan, getCapacityFn, getTasksBetween } from "@/server/scheduler";
import { getCurrentUserId, getI18n, getSettings, getToday } from "@/server/user";

export const metadata = { title: "Study Schedule" };

const HORIZON = 21;

export default async function SchedulePage() {
  await ensurePlanUpToDate();
  const userId = getCurrentUserId();
  const [{ m, locale }, settings, today, plan, capacity] = await Promise.all([
    getI18n(),
    getSettings(),
    getToday(),
    getActivePlan(),
    getCapacityFn(),
  ]);
  const S = m.schedule;
  const weekStart = startOfWeek(today);
  const [tasks, events, companyRows, objectives] = await Promise.all([
    getTasksBetween(today, addDays(today, 60)),
    db
      .select({
        id: calendarEvents.id,
        kind: calendarEvents.kind,
        title: calendarEvents.title,
        date: calendarEvents.date,
        lightDaysBefore: calendarEvents.lightDaysBefore,
      })
      .from(calendarEvents)
      .where(and(eq(calendarEvents.userId, userId), gte(calendarEvents.date, today)))
      .orderBy(asc(calendarEvents.date)),
    db.select({ slug: companies.slug, name: companies.name }).from(companies).orderBy(asc(companies.order)),
    db
      .select()
      .from(weeklyObjectives)
      .where(and(eq(weeklyObjectives.userId, userId), eq(weeklyObjectives.weekStart, weekStart)))
      .orderBy(asc(weeklyObjectives.id)),
  ]);
  const template = INTERVIEW_SPRINT;
  const templateMinutes = template.sessions.reduce(
    (s, x) => s + x.tasks.reduce((a, t) => a + t.minutes, 0),
    0,
  );
  const days = Array.from({ length: HORIZON }, (_, i) => addDays(today, i));
  const laterTasks = tasks.filter((t) => t.date >= addDays(today, HORIZON));

  return (
    <PageContainer wide>
      <PageHeader title={S.title} description={S.description} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="flex flex-col gap-4">
          {!plan ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{S.create.title}</CardTitle>
                  <CardDescription>
                    {template.name} · {S.create.sessions(template.sessions.length)} ·{" "}
                    {S.create.totalMinutes(formatMinutes(templateMinutes))}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <p className="text-muted-foreground text-sm">{template.description}</p>
                <p className="text-subtle-foreground text-xs">
                  {S.create.historical(
                    formatDay(template.historicalRange.start, locale),
                    formatDay(template.historicalRange.end, locale),
                  )}
                </p>
                <CreatePlanForm templateKey={template.key} defaultStart={today} />
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{S.days.title}</CardTitle>
                  <CardDescription>{S.days.overdue}</CardDescription>
                </div>
                <PullForwardButton />
              </CardHeader>
              <CardContent className="flex flex-col gap-1">
                {days.map((d) => {
                  const cap = capacity(d);
                  const dayTasks = tasks.filter((t) => t.date === d);
                  const used = dayTasks.reduce((s, t) => s + t.minutes, 0);
                  return (
                    <section
                      key={d}
                      className={cn(
                        "rounded-md border px-3 py-2",
                        d === today ? "border-primary/40 bg-primary-soft/30" : "border-border",
                      )}
                      data-testid={`day-${d}`}
                    >
                      <div className="flex items-center gap-2">
                        <span className="w-28 shrink-0 text-xs font-medium">
                          {d === today ? m.common.labels.today : formatDay(d, locale)}
                        </span>
                        {cap.reason !== "normal" ? (
                          <Badge
                            tone={
                              cap.reason === "unavailable" || cap.reason === "rest" ? "neutral" : "warning"
                            }
                            data-reason={cap.reason}
                          >
                            {S.days.reasons[cap.reason]}
                          </Badge>
                        ) : null}
                        <div className="ml-auto flex items-center gap-2">
                          {cap.minutes > 0 ? (
                            <>
                              <Progress
                                className="w-20"
                                value={cap.minutes ? (used / cap.minutes) * 100 : 0}
                                tone={used > cap.minutes ? "danger" : "primary"}
                              />
                              <span className="text-muted-foreground w-20 text-right text-[11px] tabular-nums">
                                {S.days.capacity(used, cap.minutes)}
                              </span>
                            </>
                          ) : null}
                          {cap.reason !== "unavailable" ? <DayActions date={d} /> : null}
                        </div>
                      </div>
                      {dayTasks.length ? (
                        <div className="-mx-2 mt-1 flex flex-col">
                          {dayTasks.map((t) => (
                            <div key={t.id} className="flex items-center gap-1">
                              <ul className="min-w-0 flex-1">
                                <TaskRow task={t as PlanTask} />
                              </ul>
                              {t.status === "todo" ? <MoveTask taskId={t.id} date={t.date} /> : null}
                            </div>
                          ))}
                        </div>
                      ) : null}
                    </section>
                  );
                })}
                {laterTasks.length ? (
                  <p className="text-muted-foreground mt-2 text-xs">+ {laterTasks.length} later</p>
                ) : null}
              </CardContent>
            </Card>
          )}
          {plan ? (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>{S.sessionsTitle}</CardTitle>
                  <CardDescription>
                    {plan.name} · {formatDay(plan.startDate, locale)}
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="flex flex-col gap-3">
                <ol className="grid grid-cols-1 gap-1.5 sm:grid-cols-2">
                  {template.sessions.map((s, i) => (
                    <li key={s.title} className="border-border rounded-md border px-3 py-2 text-xs">
                      <span className="font-medium">{s.title}</span>
                      <span className="text-subtle-foreground block">
                        {s.focus} · {formatMinutes(s.tasks.reduce((a, t) => a + t.minutes, 0))}
                      </span>
                      <span className="sr-only">{i + 1}</span>
                    </li>
                  ))}
                </ol>
                <CreatePlanForm templateKey={template.key} defaultStart={today} regenerate />
              </CardContent>
            </Card>
          ) : null}
        </div>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{S.settings.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <CapacitySettingsForm
                budget={settings.dailyBudgetMinutes}
                restWeekdays={settings.restWeekdays}
                prioritizeUniversity={settings.prioritizeUniversity}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{S.objectives.title}</CardTitle>
            </CardHeader>
            <CardContent>
              <Objectives
                weekStart={weekStart}
                items={objectives.map((o) => ({ id: o.id, text: o.text, done: o.done }))}
              />
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{S.events.title}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {events.length === 0 ? (
                <p className="text-muted-foreground text-xs">{S.events.none}</p>
              ) : (
                <ul className="flex flex-col gap-1.5">
                  {events.map((e) => (
                    <li key={e.id} className="flex items-center gap-2 text-sm">
                      <Badge
                        tone={
                          e.kind === "interview" ? "primary" : e.kind === "university" ? "warning" : "neutral"
                        }
                      >
                        {S.events.kinds[e.kind]}
                      </Badge>
                      <span className="min-w-0 flex-1 truncate">{e.title}</span>
                      <span className="text-subtle-foreground text-[11px]">{formatDay(e.date, locale)}</span>
                      <DeleteEventButton id={e.id} />
                    </li>
                  ))}
                </ul>
              )}
              <AddEventForm companies={companyRows} today={today} />
            </CardContent>
          </Card>
        </div>
      </div>
    </PageContainer>
  );
}
