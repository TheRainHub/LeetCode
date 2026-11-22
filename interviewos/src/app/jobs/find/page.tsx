import { ExternalLink } from "lucide-react";
import Link from "next/link";
import { JobFinder } from "@/components/jobs/job-finder";
import { JobsSubnav } from "@/components/jobs/jobs-subnav";
import { SaveFoundJob } from "@/components/jobs/save-found-job";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import { normalizeUrl } from "@/lib/jobs/grounding";
import { MIN_RESUME_CHARS } from "@/lib/jobs/model";
import { cn } from "@/lib/utils";
import { getCareerProfile, getSearch, listSearches, savedPostingUrls } from "@/server/jobs";
import { getI18n } from "@/server/user";

export const metadata = { title: "Find jobs" };

export default async function FindJobsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const requested = Number(typeof sp.search === "string" ? sp.search : NaN);
  const [{ m, locale }, profile, history, saved] = await Promise.all([
    getI18n(),
    getCareerProfile(),
    listSearches(10),
    savedPostingUrls(),
  ]);
  const F = m.jobs.find;
  const current =
    Number.isInteger(requested) && requested > 0 ? await getSearch(requested) : (history[0] ?? null);
  const fmt = new Intl.DateTimeFormat(locale === "ru" ? "ru-RU" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  const aiEnabled = isAiConfigured();
  const hasProfile = profile.resume.trim().length >= MIN_RESUME_CHARS || Boolean(profile.targetRoles.trim());
  const disabledReason = !aiEnabled ? m.jobs.aiDisabled : !hasProfile ? F.needsProfile : null;

  return (
    <PageContainer wide>
      <PageHeader title={m.jobs.title} description={F.description} />
      <JobsSubnav current="find" labels={m.jobs.nav} />
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_300px]">
        <div className="flex min-w-0 flex-col gap-4">
          <Card className="p-4">
            <JobFinder
              enabled={!disabledReason}
              disabledReason={disabledReason}
              initial={{
                roles: profile.targetRoles,
                locations: profile.locations,
                workModes: profile.workModes,
                levels: profile.levels,
                focus: "",
              }}
            />
          </Card>

          {current ? (
            <section className="flex flex-col gap-3" data-testid="job-results" data-search={current.id}>
              <div>
                <h2 className="text-sm font-semibold">{F.results}</h2>
                {current.error ? (
                  <p className="text-danger text-xs">{F.failed(current.error)}</p>
                ) : (
                  <>
                    <p className="text-muted-foreground text-xs" data-testid="job-results-count">
                      {F.found(current.results.length, fmt.format(current.createdAt))}
                    </p>
                    <p className="text-subtle-foreground mt-1 text-[11px]">{F.honesty}</p>
                    {current.dropped ? (
                      <p className="text-subtle-foreground text-[11px]" data-testid="job-results-dropped">
                        {F.dropped(current.dropped)}
                      </p>
                    ) : null}
                    {current.notes ? (
                      <p className="text-muted-foreground mt-1 text-xs">{current.notes}</p>
                    ) : null}
                  </>
                )}
              </div>
              {!current.error && !current.results.length ? (
                <Card className="text-muted-foreground p-4 text-sm">{F.none}</Card>
              ) : null}
              {current.results.map((job, index) => {
                const key = normalizeUrl(job.url);
                return (
                  <Card key={job.url} className="flex flex-col gap-2 p-4" data-testid="found-job">
                    <div className="flex flex-wrap items-start gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-semibold">{job.title}</p>
                        <p className="text-muted-foreground text-xs">
                          {job.company}
                          {job.location ? ` · ${job.location}` : ""}
                        </p>
                      </div>
                      <SaveFoundJob
                        searchId={current.id}
                        index={index}
                        savedId={key ? (saved.get(key) ?? null) : null}
                      />
                    </div>
                    <div className="flex flex-wrap gap-1">
                      <Badge tone="neutral">{m.jobs.workMode[job.workMode]}</Badge>
                      <Badge tone="neutral">{m.jobs.level[job.level]}</Badge>
                      {job.deadline ? <Badge tone="warning">{`${F.deadline}: ${job.deadline}`}</Badge> : null}
                    </div>
                    {job.summary ? <p className="text-sm">{job.summary}</p> : null}
                    {job.whyFit ? (
                      <p className="text-xs">
                        <span className="text-success font-medium">{F.whyFit}: </span>
                        {job.whyFit}
                      </p>
                    ) : null}
                    {job.concerns ? (
                      <p className="text-xs">
                        <span className="text-warning font-medium">{F.concerns}: </span>
                        {job.concerns}
                      </p>
                    ) : null}
                    <a
                      href={job.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-primary inline-flex items-center gap-1 self-start text-xs hover:underline"
                    >
                      <ExternalLink className="size-3" aria-hidden />
                      {F.openLink}
                    </a>
                  </Card>
                );
              })}
              {current.sources.length ? (
                <details className="text-xs">
                  <summary className="text-muted-foreground cursor-pointer">
                    {F.sources(current.sources.length)}
                  </summary>
                  <ul className="mt-2 flex flex-col gap-1">
                    {current.sources.map((s) => (
                      <li key={s.url} className="truncate">
                        <a
                          href={s.url}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-muted-foreground hover:text-primary"
                        >
                          {s.title || s.url}
                        </a>
                      </li>
                    ))}
                  </ul>
                </details>
              ) : null}
            </section>
          ) : null}
        </div>
        <aside>
          <Card>
            <CardHeader>
              <CardTitle>{F.history}</CardTitle>
            </CardHeader>
            <CardContent>
              {history.length ? (
                <ul className="flex flex-col gap-1.5 text-xs">
                  {history.map((h) => (
                    <li key={h.id}>
                      <Link
                        href={`/jobs/find?search=${h.id}`}
                        className={cn(
                          "hover:text-primary flex justify-between gap-2",
                          current?.id === h.id && "text-primary font-medium",
                        )}
                      >
                        <span className="truncate">{h.criteria.roles || h.criteria.focus || "—"}</span>
                        <span className="text-subtle-foreground shrink-0 tabular-nums">
                          {h.error ? "!" : h.results.length} · {fmt.format(h.createdAt)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-muted-foreground text-xs">{F.noHistory}</p>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </PageContainer>
  );
}
