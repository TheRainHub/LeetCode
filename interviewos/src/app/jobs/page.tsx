import { ExternalLink, Sparkles } from "lucide-react";
import Link from "next/link";
import { AddPosting } from "@/components/jobs/add-posting";
import { AutoSearchRunner } from "@/components/jobs/auto-search";
import { JobsSubnav } from "@/components/jobs/jobs-subnav";
import { StatusSelect } from "@/components/jobs/status-select";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import { ACTIVE_STATUSES, JOB_STATUSES, MIN_RESUME_CHARS } from "@/lib/jobs/model";
import { hasDueAutoSearch, unviewedAutoRuns } from "@/server/job-auto";
import { getCareerProfile, listPostings } from "@/server/jobs";
import { getI18n } from "@/server/user";

export const metadata = { title: "Job search" };
// Importing a posting from a link runs the model with web fetch.
export const maxDuration = 300;

const VERDICT_TONE = { strong: "success", good: "primary", stretch: "warning", weak: "danger" } as const;

export default async function JobsPage() {
  const [{ m, locale }, postings, profile, due, unviewed] = await Promise.all([
    getI18n(),
    listPostings(),
    getCareerProfile(),
    hasDueAutoSearch(),
    unviewedAutoRuns(),
  ]);
  const newCount = unviewed.reduce((n, u) => n + u.results.length, 0);
  const hasProfile = profile.resume.trim().length >= MIN_RESUME_CHARS || Boolean(profile.targetRoles.trim());
  const J = m.jobs;
  const fmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
  });
  const aiEnabled = isAiConfigured();
  const active = postings.filter((p) => ACTIVE_STATUSES.includes(p.status)).length;
  const applied = postings.filter((p) => ["applied", "interviewing", "offer"].includes(p.status)).length;
  const groups = JOB_STATUSES.map((s) => ({
    status: s,
    items: postings.filter((p) => p.status === s),
  })).filter((g) => g.items.length);

  return (
    <PageContainer wide>
      <PageHeader
        title={J.title}
        description={J.description}
        actions={
          aiEnabled ? (
            <Button asChild size="sm" variant="primary">
              <Link href="/jobs/find">
                <Sparkles />
                {J.overview.findCta}
              </Link>
            </Button>
          ) : null
        }
      />
      <JobsSubnav
        current="overview"
        labels={{ ...J.nav, find: newCount ? `${J.nav.find} (${newCount})` : J.nav.find }}
      />
      <AutoSearchRunner due={due && aiEnabled && hasProfile} />
      {newCount && unviewed[0] ? (
        <Card
          className="border-primary/30 bg-primary-soft mb-4 flex flex-wrap items-center gap-3 p-3"
          data-testid="jobs-new-results"
        >
          <p className="flex-1 text-sm font-medium">{J.auto.newResults(newCount)}</p>
          <Button asChild size="sm" variant="primary">
            <Link href={`/jobs/find?search=${unviewed[0].id}`}>{J.auto.view}</Link>
          </Button>
        </Card>
      ) : null}
      {!aiEnabled ? <p className="text-muted-foreground mb-3 text-xs">{J.aiDisabled}</p> : null}
      {profile.resume.trim().length < MIN_RESUME_CHARS ? (
        <Card
          className="border-warning/40 bg-warning-soft mb-4 flex flex-wrap items-center gap-3 p-3"
          data-testid="jobs-profile-missing"
        >
          <p className="flex-1 text-sm">{J.overview.profileMissing}</p>
          <Button asChild size="sm" variant="secondary">
            <Link href="/jobs/profile">{J.overview.profileLink}</Link>
          </Button>
        </Card>
      ) : null}

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="flex min-w-0 flex-col gap-4">
          {postings.length ? (
            <p className="text-muted-foreground text-xs" data-testid="jobs-counts">
              {J.overview.counts(active, applied)}
            </p>
          ) : (
            <Card className="text-muted-foreground p-6 text-center text-sm" data-testid="jobs-empty">
              {J.overview.empty}
            </Card>
          )}
          {groups.map((g) => (
            <section
              key={g.status}
              className="flex flex-col gap-2"
              data-testid="jobs-group"
              data-status={g.status}
            >
              <h2 className="text-muted-foreground text-xs font-semibold tracking-wide uppercase">
                {J.status[g.status]} · {g.items.length}
              </h2>
              <ul className="flex flex-col gap-2">
                {g.items.map((p) => (
                  <li key={p.id}>
                    <Card
                      className="flex flex-wrap items-center gap-3 p-3"
                      data-testid="job-row"
                      data-id={p.id}
                    >
                      <div className="min-w-0 flex-1">
                        <Link
                          href={`/jobs/${p.id}`}
                          className="hover:text-primary block truncate text-sm font-medium"
                        >
                          {p.title}
                        </Link>
                        <p className="text-muted-foreground truncate text-xs">
                          {p.company}
                          {p.location ? ` · ${p.location}` : ""}
                          {p.workMode ? ` · ${J.workMode[p.workMode]}` : ""}
                        </p>
                      </div>
                      {p.fit ? (
                        <Badge tone={VERDICT_TONE[p.fit.verdict]} title={J.verdict[p.fit.verdict]}>
                          {J.overview.fit} {p.fit.score}
                        </Badge>
                      ) : (
                        <Badge tone="neutral">{J.overview.noFit}</Badge>
                      )}
                      <span className="text-subtle-foreground w-16 text-right text-[11px] tabular-nums">
                        {fmt.format(p.updatedAt)}
                      </span>
                      {p.url ? (
                        <a
                          href={p.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          aria-label={J.posting.open}
                          className="text-muted-foreground hover:text-primary"
                        >
                          <ExternalLink className="size-4" />
                        </a>
                      ) : null}
                      <StatusSelect id={p.id} status={p.status} compact />
                    </Card>
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
        <aside>
          <Card>
            <CardHeader>
              <CardTitle>{J.overview.add}</CardTitle>
            </CardHeader>
            <CardContent>
              <AddPosting aiEnabled={aiEnabled} />
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}
