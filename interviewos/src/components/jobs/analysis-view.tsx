import { AlertTriangle, ArrowRight, CheckCircle2, CircleDashed, ExternalLink, XCircle } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import type { Messages } from "@/lib/i18n";
import type { JobAnalysis, WebSource } from "@/lib/jobs/model";
import { cn } from "@/lib/utils";

const VERDICT_TONE = { strong: "success", good: "primary", stretch: "warning", weak: "danger" } as const;
const PRIORITY_TONE = { high: "danger", medium: "warning", low: "neutral" } as const;

function Section({
  title,
  children,
  help,
  testId,
}: {
  title: string;
  children: React.ReactNode;
  help?: string;
  testId?: string;
}) {
  return (
    <section className="border-border flex flex-col gap-2 border-t pt-3" data-testid={testId}>
      <h3 className="text-sm font-semibold">{title}</h3>
      {help ? <p className="text-subtle-foreground -mt-1 text-[11px]">{help}</p> : null}
      {children}
    </section>
  );
}

const Bullets = ({ items }: { items: string[] }) => (
  <ul className="flex list-disc flex-col gap-0.5 pl-5 text-sm">
    {items.map((x) => (
      <li key={x}>{x}</li>
    ))}
  </ul>
);

export function AnalysisView({
  analysis: a,
  sources,
  droppedRewrites,
  lessonTitles,
  sdTitles,
  m,
}: {
  analysis: JobAnalysis;
  sources: WebSource[];
  droppedRewrites: number;
  lessonTitles: Map<string, string>;
  sdTitles: Map<string, string>;
  m: Messages["jobs"];
}) {
  const A = m.analysis;
  return (
    <div className="flex flex-col gap-3" data-testid="analysis">
      <div className="flex flex-wrap items-center gap-3">
        <div className="text-center" title={A.scoreHelp}>
          <p className="text-3xl font-semibold tabular-nums" data-testid="analysis-score">
            {a.fit.score}
          </p>
          <p className="text-muted-foreground text-[11px]">{A.score}</p>
        </div>
        <div className="min-w-0 flex-1">
          <Badge tone={VERDICT_TONE[a.fit.verdict]}>{m.verdict[a.fit.verdict]}</Badge>
          <p className="mt-1 text-sm">{a.summary}</p>
          <p className="text-muted-foreground mt-1 text-xs">{a.fit.reasoning}</p>
        </div>
      </div>

      {a.redFlags.length ? (
        <div
          className="border-danger/30 bg-danger-soft rounded-md border p-3"
          data-testid="analysis-redflags"
        >
          <p className="text-danger mb-1 flex items-center gap-1.5 text-xs font-semibold">
            <AlertTriangle className="size-3.5" aria-hidden />
            {A.redFlags}
          </p>
          <Bullets items={a.redFlags} />
        </div>
      ) : null}

      <Section title={A.requirements} testId="analysis-requirements">
        <ul className="flex flex-col gap-1.5">
          {a.requirements.map((r) => (
            <li key={r.requirement} className="flex gap-2 text-sm">
              {r.status === "met" ? (
                <CheckCircle2 className="text-success mt-0.5 size-4 shrink-0" aria-label={A.reqStatus.met} />
              ) : r.status === "partial" ? (
                <CircleDashed
                  className="text-warning mt-0.5 size-4 shrink-0"
                  aria-label={A.reqStatus.partial}
                />
              ) : (
                <XCircle className="text-danger mt-0.5 size-4 shrink-0" aria-label={A.reqStatus.missing} />
              )}
              <div className="min-w-0">
                <p>
                  {r.requirement}{" "}
                  <span className="text-subtle-foreground text-[11px]">· {A.importance[r.importance]}</span>
                </p>
                <p className="text-muted-foreground text-xs">{r.evidence}</p>
              </div>
            </li>
          ))}
        </ul>
      </Section>

      <Section title={A.resume} testId="analysis-resume">
        {a.resume.headline ? (
          <div>
            <p className="text-muted-foreground text-xs font-medium">{A.headline}</p>
            <p className="bg-surface-2 rounded-md p-2 text-sm">{a.resume.headline}</p>
          </div>
        ) : null}
        <div className="grid gap-3 sm:grid-cols-2">
          {a.resume.emphasize.length ? (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">{A.emphasize}</p>
              <Bullets items={a.resume.emphasize} />
            </div>
          ) : null}
          {a.resume.deemphasize.length ? (
            <div>
              <p className="text-muted-foreground mb-1 text-xs font-medium">{A.deemphasize}</p>
              <Bullets items={a.resume.deemphasize} />
            </div>
          ) : null}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">{A.keywordsPresent}</p>
            <div className="flex flex-wrap gap-1">
              {a.resume.keywordsPresent.map((k) => (
                <Badge key={k} tone="success">
                  {k}
                </Badge>
              ))}
              {!a.resume.keywordsPresent.length ? (
                <span className="text-subtle-foreground text-xs">{A.none}</span>
              ) : null}
            </div>
          </div>
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">{A.keywordsMissing}</p>
            <div className="flex flex-wrap gap-1">
              {a.resume.keywordsMissing.map((k) => (
                <Badge key={k} tone="outline">
                  {k}
                </Badge>
              ))}
              {!a.resume.keywordsMissing.length ? (
                <span className="text-subtle-foreground text-xs">{A.none}</span>
              ) : null}
            </div>
            <p className="text-subtle-foreground mt-1 text-[11px]">{A.keywordsMissingHelp}</p>
          </div>
        </div>
        {a.resume.rewrites.length || droppedRewrites ? (
          <div data-testid="analysis-rewrites">
            <p className="text-muted-foreground text-xs font-medium">{A.rewrites}</p>
            <p className="text-subtle-foreground mb-1 text-[11px]">{A.rewritesHelp}</p>
            <ul className="flex flex-col gap-2">
              {a.resume.rewrites.map((r) => (
                <li key={r.original} className="border-border rounded-md border p-2 text-sm">
                  <p className="text-muted-foreground">
                    <span className="text-[11px] font-medium uppercase">{A.before}: </span>
                    {r.original}
                  </p>
                  <p className="mt-1 flex gap-1">
                    <ArrowRight className="text-primary mt-0.5 size-3.5 shrink-0" aria-hidden />
                    <span>
                      <span className="text-primary text-[11px] font-medium uppercase">{A.after}: </span>
                      {r.suggested}
                    </span>
                  </p>
                  {r.why ? <p className="text-subtle-foreground mt-1 text-[11px]">{r.why}</p> : null}
                </li>
              ))}
            </ul>
            {droppedRewrites ? (
              <p className="text-subtle-foreground mt-1 text-[11px]">{A.dropped(droppedRewrites)}</p>
            ) : null}
          </div>
        ) : null}
        {a.resume.gaps.length ? (
          <div data-testid="analysis-gaps">
            <p className="text-muted-foreground mb-1 text-xs font-medium">{A.gaps}</p>
            <ul className="flex flex-col gap-2">
              {a.resume.gaps.map((g) => (
                <li key={g.gap} className="text-sm">
                  <p className="font-medium">{g.gap}</p>
                  <p className="text-muted-foreground text-xs">
                    <span className="font-medium">{A.honestFraming}: </span>
                    {g.honestFraming}
                  </p>
                  <p className="text-muted-foreground text-xs">
                    <span className="font-medium">{A.howToClose}: </span>
                    {g.howToClose}
                  </p>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
      </Section>

      <Section title={A.prep} testId="analysis-prep">
        <ul className="flex flex-col gap-2">
          {a.preparation.focusAreas.map((f) => (
            <li key={f.area} className="border-border rounded-md border p-2">
              <div className="flex items-center gap-2">
                <p className="flex-1 text-sm font-medium">{f.area}</p>
                <Badge tone={PRIORITY_TONE[f.priority]}>{A.priority[f.priority]}</Badge>
              </div>
              <p className="text-muted-foreground text-xs">{f.why}</p>
              {f.lessons.length || f.sdQuestions.length ? (
                <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs">
                  {f.lessons.map((l) => (
                    <Link
                      key={l}
                      href={`/learn/lesson/${l}`}
                      className="text-primary hover:underline"
                      data-testid="prep-lesson"
                    >
                      {lessonTitles.get(l) ?? l}
                    </Link>
                  ))}
                  {f.sdQuestions.map((q) => (
                    <Link
                      key={q}
                      href={`/practice/system-design/${q}`}
                      className="text-primary hover:underline"
                    >
                      {sdTitles.get(q) ?? q}
                    </Link>
                  ))}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
        {a.preparation.stories.length ? (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">{A.stories}</p>
            <ul className="flex flex-col gap-1 text-sm">
              {a.preparation.stories.map((s) => (
                <li key={s.story}>
                  <span className="font-medium">{s.story}</span>{" "}
                  <span className="text-muted-foreground">— {s.useFor}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}
        {a.preparation.process ? (
          <div data-testid="analysis-process" data-basis={a.preparation.processBasis}>
            <p className="text-muted-foreground text-xs font-medium">
              {A.process}{" "}
              <span className={cn("text-[11px]", a.preparation.processBasis === "general" && "text-warning")}>
                ({a.preparation.processBasis === "sources" ? A.processSources : A.processGeneral})
              </span>
            </p>
            <p className="text-sm">{a.preparation.process}</p>
            {sources.length ? (
              <ul className="mt-1 flex flex-col gap-0.5 text-xs">
                {sources.map((s) => (
                  <li key={s.url} className="truncate">
                    <a
                      href={s.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-muted-foreground hover:text-primary inline-flex items-center gap-1"
                    >
                      <ExternalLink className="size-3" aria-hidden />
                      {s.title || s.url}
                    </a>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        ) : null}
        {a.preparation.questionsToAsk.length ? (
          <div>
            <p className="text-muted-foreground mb-1 text-xs font-medium">{A.questions}</p>
            <Bullets items={a.preparation.questionsToAsk} />
          </div>
        ) : null}
      </Section>

      {a.pitch ? (
        <Section title={A.pitch}>
          <p className="text-sm">{a.pitch}</p>
        </Section>
      ) : null}
    </div>
  );
}
