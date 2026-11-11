import { ArrowRight, BookOpen, Building2, CalendarClock, Flame, Layers, Target } from "lucide-react";
import Link from "next/link";
import { MarkUnavailableButton, TaskRow, type PlanTask } from "@/components/dashboard/plan-widgets";
import { WeekChart } from "@/components/dashboard/week-chart";
import { PageContainer } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState, NotEnoughData, Stat } from "@/components/ui/misc";
import { Progress } from "@/components/ui/progress";
import { Tooltip } from "@/components/ui/tooltip";
import { formatDay, formatDuration } from "@/lib/dates";
import type { RecommendationReason } from "@/lib/recommend";
import {
  getAreaAccuracy,
  getCodingSummary,
  getCompanyReadiness,
  getDailyTime,
  getOverallLevel,
  getRecommendations,
  getStreak,
  getUpcomingEvents,
} from "@/server/insights";
import { getNextAction } from "@/server/next-action";
import { ensurePlanUpToDate, getActivePlan, getCapacityFn, getTasksBetween } from "@/server/scheduler";
import { getUpcomingReviewCounts } from "@/server/srs";
import { getI18n, getToday } from "@/server/user";

export const metadata = { title: "Dashboard" };

const AREA_LABEL: Record<string, string> = {
  dsa: "Algorithms & DS",
  java: "Java",
  "linux-networking": "Linux & Networking",
  backend: "Backend",
  "ts-react": "TypeScript & React",
  "system-design": "System Design",
  "ai-engineering": "AI Engineering",
  behavioral: "Behavioral",
};

export default async function DashboardPage() {
  await ensurePlanUpToDate();
  const [{ m, locale }, today] = await Promise.all([getI18n(), getToday()]);
  const d = m.dashboard;
  const [
    plan,
    tasks,
    capacityFn,
    next,
    level,
    streak,
    week,
    coding,
    areas,
    recs,
    reviews,
    companies,
    events,
  ] = await Promise.all([
    getActivePlan(),
    getTasksBetween(today, today),
    getCapacityFn(),
    getNextAction(),
    getOverallLevel(),
    getStreak(),
    getDailyTime(7),
    getCodingSummary(),
    getAreaAccuracy(),
    getRecommendations(5),
    getUpcomingReviewCounts(7),
    getCompanyReadiness(),
    getUpcomingEvents(45),
  ]);

  const capacity = capacityFn(today);
  const planned = tasks.reduce((s, t) => s + t.minutes, 0);
  const weekSeconds = week.reduce((s, x) => s + x.seconds, 0);
  const rated = areas.filter((a) => a.accuracy !== null).sort((a, b) => b.accuracy! - a.accuracy!);
  // Split rated areas into non-overlapping strongest (top) and weakest (bottom) groups.
  const strongest = rated.slice(0, Math.min(3, Math.ceil(rated.length / 2)));
  const weakest = rated.slice(strongest.length).slice(-3).reverse();

  const nextLabel =
    next.kind === "task"
      ? d.next.task(next.title, next.minutes)
      : next.kind === "review"
        ? d.next.review(next.count)
        : next.kind === "problem_review"
          ? d.next.problemReview(next.title)
          : next.kind === "recommendation"
            ? d.next.recommendation(next.title)
            : d.next.explore;

  const reason = (r: RecommendationReason) => {
    switch (r.kind) {
      case "low_accuracy":
        return d.reasons.low_accuracy(r.accuracy);
      case "interview_soon":
        return d.reasons.interview_soon(r.company, r.days);
      case "active_application":
        return d.reasons.active_application(r.company);
      default:
        return d.reasons[r.kind];
    }
  };

  return (
    <PageContainer wide>
      <section className="border-border bg-surface mb-6 flex flex-col gap-4 rounded-lg border p-5 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-muted-foreground text-xs">
            {d.greeting} · {formatDay(today, locale, { weekday: "long", day: "numeric", month: "long" })}
          </p>
          <h1 className="mt-1 text-xl font-semibold tracking-tight">{d.title}</h1>
          <p className="text-muted-foreground mt-1 text-sm">
            <span className="text-subtle-foreground">{d.nextUp}:</span> {nextLabel}
          </p>
        </div>
        <Button asChild variant="primary" size="lg" data-testid="start-session">
          <Link href={next.href}>
            {d.startSession}
            <ArrowRight />
          </Link>
        </Button>
      </section>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <div>
              <CardTitle>{d.plan.title}</CardTitle>
              {plan ? <CardDescription>{d.plan.capacity(planned, capacity.minutes)}</CardDescription> : null}
            </div>
            {plan ? <MarkUnavailableButton /> : null}
          </CardHeader>
          <CardContent>
            {!plan ? (
              <EmptyState
                icon={<CalendarClock />}
                title={d.plan.noPlan}
                description={d.plan.noPlanHelp}
                action={
                  <Button asChild variant="primary" size="sm">
                    <Link href="/schedule">{d.plan.createPlan}</Link>
                  </Button>
                }
              />
            ) : tasks.length === 0 ? (
              <EmptyState icon={<CalendarClock />} title={d.plan.empty} description={d.plan.emptyHelp} />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {tasks.map((t) => (
                  <TaskRow key={t.id} task={t as PlanTask} />
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card>
            <CardHeader>
              <CardTitle>{d.level.title}</CardTitle>
              <Target className="text-subtle-foreground size-4" />
            </CardHeader>
            <CardContent>
              <p className="text-lg font-semibold">{d.level[level.level]}</p>
              <p className="text-muted-foreground mt-1 text-xs">
                {level.level === "not_assessed"
                  ? d.level.notAssessedHelp
                  : d.level.basis(level.gradedResults)}
              </p>
              <div className="bg-surface-3 mt-3 flex h-1.5 overflow-hidden rounded-full" aria-hidden>
                {(["interview_ready", "practicing", "needs_review", "learning"] as const).map((s) => (
                  <div
                    key={s}
                    className={
                      {
                        interview_ready: "bg-success",
                        practicing: "bg-primary",
                        needs_review: "bg-warning",
                        learning: "bg-subtle-foreground",
                      }[s]
                    }
                    style={{ width: `${level.total ? (level.counts[s] / level.total) * 100 : 0}%` }}
                  />
                ))}
              </div>
              <div className="text-muted-foreground mt-2 flex flex-wrap gap-x-3 gap-y-1 text-[11px]">
                <span>
                  {m.common.status.interview_ready}: {level.counts.interview_ready}
                </span>
                <span>
                  {m.common.status.practicing}: {level.counts.practicing}
                </span>
                <span>
                  {m.common.status.needs_review}: {level.counts.needs_review}
                </span>
                <span>
                  {m.common.status.learning}: {level.counts.learning}
                </span>
              </div>
            </CardContent>
          </Card>
          <div className="grid grid-cols-2 gap-4">
            <Card>
              <CardContent className="pt-4">
                <Tooltip content={d.streak.help}>
                  <div>
                    <Stat
                      label={d.streak.title}
                      value={
                        <span className="flex items-center gap-1.5">
                          <Flame
                            className={
                              streak.current > 0 ? "text-warning size-4" : "text-subtle-foreground size-4"
                            }
                          />
                          {d.streak.days(streak.current)}
                        </span>
                      }
                      hint={streak.activeToday ? d.streak.activeToday : d.streak.notYetToday}
                    />
                  </div>
                </Tooltip>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-4">
                <Stat
                  label={d.week.title}
                  value={formatDuration(weekSeconds)}
                  hint={weekSeconds === 0 ? d.week.empty : undefined}
                />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="pt-3 pb-2">
              <WeekChart data={week} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{d.upcoming.title}</CardTitle>
            <CalendarClock className="text-subtle-foreground size-4" />
          </CardHeader>
          <CardContent>
            {events.length === 0 ? (
              <EmptyState title={d.upcoming.empty} description={d.upcoming.emptyHelp} />
            ) : (
              <ul className="flex flex-col gap-2">
                {events.slice(0, 6).map((e) => (
                  <li key={e.id} className="flex items-center justify-between gap-2 text-sm">
                    <div className="min-w-0">
                      <p className="truncate">{e.title}</p>
                      <p className="text-subtle-foreground text-[11px]">
                        {d.eventKinds[e.kind]}
                        {e.companyName ? ` · ${e.companyName}` : ""} · {formatDay(e.date, locale)}
                      </p>
                    </div>
                    <Badge
                      tone={
                        e.kind === "interview" ? "primary" : e.kind === "university" ? "warning" : "neutral"
                      }
                    >
                      {m.common.inDays(e.inDays)}
                    </Badge>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.reviews.title}</CardTitle>
            <Layers className="text-subtle-foreground size-4" />
          </CardHeader>
          <CardContent>
            {reviews.every((r) => r.count === 0) ? (
              <EmptyState title={d.reviews.empty} />
            ) : (
              <>
                <div className="flex items-end justify-between">
                  <Stat label={d.reviews.dueToday} value={reviews[0]?.count ?? 0} />
                  {(reviews[0]?.count ?? 0) > 0 ? (
                    <Button asChild size="sm" variant="primary">
                      <Link href="/practice/review">{d.reviews.start}</Link>
                    </Button>
                  ) : null}
                </div>
                <p className="text-muted-foreground mt-3 mb-1 text-[11px]">{d.reviews.next7}</p>
                <div className="flex items-end gap-1" aria-label={d.reviews.next7}>
                  {reviews.map((r, i) => {
                    const max = Math.max(1, ...reviews.map((x) => x.count));
                    return (
                      <Tooltip key={r.date} content={`${formatDay(r.date, locale)}: ${r.count}`}>
                        <div className="flex flex-1 flex-col items-center gap-1">
                          <div
                            className="bg-primary/70 w-full rounded-sm"
                            style={{ height: `${4 + (r.count / max) * 36}px`, opacity: r.count ? 1 : 0.2 }}
                          />
                          <span className="text-subtle-foreground text-[10px]">
                            {i === 0
                              ? "•"
                              : formatDay(r.date, locale, {
                                  weekday: "narrow",
                                  day: undefined,
                                  month: undefined,
                                })}
                          </span>
                        </div>
                      </Tooltip>
                    );
                  })}
                </div>
              </>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>{d.problems.title}</CardTitle>
            <BookOpen className="text-subtle-foreground size-4" />
          </CardHeader>
          <CardContent>
            {coding.attempts === 0 ? (
              <EmptyState
                title={d.problems.empty}
                action={
                  <Button asChild size="sm">
                    <Link href="/practice">{m.common.nav.practice}</Link>
                  </Button>
                }
              />
            ) : (
              <div className="grid grid-cols-3 gap-3">
                <Stat label={d.problems.solved} value={coding.solved} />
                <Stat label={d.problems.independent} value={coding.solvedIndependently} />
                <Stat label={d.problems.withHelp} value={coding.solvedWithHelp} />
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>{d.recommended.title}</CardTitle>
          </CardHeader>
          <CardContent>
            {recs.length === 0 ? (
              <EmptyState title={d.recommended.empty} />
            ) : (
              <ul className="-mx-2 flex flex-col">
                {recs.map((r) => (
                  <li key={r.topicId}>
                    <Link
                      href={`/learn/lesson/${r.slug}`}
                      className="hover:bg-surface-2 flex items-center justify-between gap-3 rounded-md px-2 py-1.5"
                    >
                      <span className="truncate text-sm">{r.title}</span>
                      <span className="flex shrink-0 flex-wrap justify-end gap-1">
                        {r.reasons.slice(0, 3).map((x, i) => (
                          <Badge
                            key={i}
                            tone={
                              x.kind === "interview_soon" || x.kind === "review_due" ? "primary" : "neutral"
                            }
                          >
                            {reason(x)}
                          </Badge>
                        ))}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>
                {d.areas.strongest} / {d.areas.weakest}
              </CardTitle>
              <CardDescription>{d.areas.help}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            {rated.length === 0 ? (
              <NotEnoughData label={m.common.labels.notEnoughData} />
            ) : (
              <div className="flex flex-col gap-3">
                <div>
                  <p className="text-muted-foreground mb-1 text-[11px]">{d.areas.strongest}</p>
                  {strongest.map((a) => (
                    <div key={a.area} className="mb-1.5">
                      <div className="flex justify-between text-xs">
                        <span>{AREA_LABEL[a.area] ?? a.area}</span>
                        <span className="text-muted-foreground tabular-nums">
                          {Math.round(a.accuracy! * 100)}%
                        </span>
                      </div>
                      <Progress value={a.accuracy! * 100} tone="success" />
                    </div>
                  ))}
                </div>
                {weakest.length > 0 ? (
                  <div>
                    <p className="text-muted-foreground mb-1 text-[11px]">{d.areas.weakest}</p>
                    {weakest.map((a) => (
                      <div key={a.area} className="mb-1.5">
                        <div className="flex justify-between text-xs">
                          <span>{AREA_LABEL[a.area] ?? a.area}</span>
                          <span className="text-muted-foreground tabular-nums">
                            {Math.round(a.accuracy! * 100)}%
                          </span>
                        </div>
                        <Progress value={a.accuracy! * 100} tone="warning" />
                      </div>
                    ))}
                  </div>
                ) : null}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="lg:col-span-3">
          <CardHeader>
            <div>
              <CardTitle>{d.companies.title}</CardTitle>
              <CardDescription>{d.companies.estimatedNote}</CardDescription>
            </div>
            <Building2 className="text-subtle-foreground size-4" />
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4">
              {companies.map((c) => (
                <Link
                  key={c.id}
                  href={`/companies/${c.slug}`}
                  className="group hover:bg-surface-2 rounded-md p-1"
                >
                  <div className="flex items-center justify-between gap-2 text-sm">
                    <span className="group-hover:text-primary truncate font-medium">{c.name}</span>
                    {c.readiness.estimate === null ? (
                      <NotEnoughData label={m.common.labels.notEnoughData} />
                    ) : (
                      <span className="text-muted-foreground text-xs tabular-nums">
                        {c.readiness.estimate}%
                      </span>
                    )}
                  </div>
                  <Progress
                    className="mt-1.5"
                    value={c.readiness.estimate ?? 0}
                    tone={c.readiness.estimate === null ? "muted" : "primary"}
                    label={c.name}
                  />
                  <p className="text-subtle-foreground mt-1 text-[11px]">
                    {d.companies.coverage(c.readiness.startedTopics, c.readiness.totalTopics)}
                    {c.nextInterview ? ` · ${formatDay(c.nextInterview, locale)}` : ""}
                  </p>
                </Link>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
