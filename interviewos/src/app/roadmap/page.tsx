import Link from "next/link";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { RoadmapTree, StatusDot, type TreeEdge, type TreeNode } from "@/components/roadmap/tree";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import type { TopicStatus } from "@/lib/mastery/status";
import { DEFAULT_LAYOUT, layoutDag, type LayoutOptions } from "@/lib/roadmap/layout";
import { cn } from "@/lib/utils";
import { getRoadmap } from "@/server/roadmap";
import { getI18n } from "@/server/user";

export const metadata = { title: "Roadmap" };

const STATUSES: TopicStatus[] = ["not_started", "learning", "practicing", "needs_review", "interview_ready"];
const PRACTISED: TopicStatus[] = ["practicing", "needs_review", "interview_ready"];
/** Path cards carry a progress bar, so they are taller than lesson cards. */
const OVERVIEW_LAYOUT: LayoutOptions = { ...DEFAULT_LAYOUT, nodeWidth: 200, nodeHeight: 76 };

export default async function RoadmapPage({ searchParams }: { searchParams: Promise<{ path?: string }> }) {
  const sp = await searchParams;
  const [{ m }, data] = await Promise.all([getI18n(), getRoadmap()]);
  const R = m.roadmap;
  if (!data.lessons.length) {
    return (
      <PageContainer>
        <PageHeader title={R.title} description={R.description} />
        <EmptyState title={R.empty} />
      </PageContainer>
    );
  }
  const current = data.paths.some((p) => p.slug === sp.path) ? sp.path! : "all";
  const lessonBySlug = new Map(data.lessons.map((l) => [l.slug, l]));
  const pathTitle = new Map(data.paths.map((p) => [p.slug, p.title]));

  let nodes: TreeNode[] = [];
  let edges: TreeEdge[] = [];
  let size = { width: 0, height: 0 };
  let external: { lesson: string; prerequisite: string }[] = [];

  if (current === "all") {
    // Path-level tree: an edge A → B when a lesson in B builds on a lesson in A.
    const pairs = new Set<string>();
    for (const l of data.lessons)
      for (const p of l.prerequisites) {
        const from = lessonBySlug.get(p)?.path;
        if (from && from !== l.path) pairs.add(`${from}|${l.path}`);
      }
    const pathEdges = [...pairs].map((k) => {
      const [from, to] = k.split("|") as [string, string];
      return { from, to };
    });
    const layout = layoutDag(
      data.paths.map((p) => ({ id: p.slug, order: p.order })),
      pathEdges,
      OVERVIEW_LAYOUT,
    );
    size = layout;
    const statusOf = (p: (typeof data.paths)[number]): TopicStatus =>
      p.ready === p.total && p.total > 0
        ? "interview_ready"
        : p.practised > 0
          ? "practicing"
          : p.started > 0
            ? "learning"
            : "not_started";
    nodes = data.paths.map((p) => ({
      ...layout.nodes.get(p.slug)!,
      id: p.slug,
      href: `/roadmap?path=${p.slug}`,
      title: p.title,
      status: statusOf(p),
      progress: p.total ? p.practised / p.total : 0,
      meta: R.progress(p.practised, p.total),
    }));
    edges = layout.edges.map((e) => ({
      ...e,
      active: (() => {
        const p = data.paths.find((x) => x.slug === e.from)!;
        return p.total > 0 && p.practised === p.total;
      })(),
    }));
  } else {
    const ls = data.lessons.filter((l) => l.path === current);
    const internal = ls.flatMap((l) =>
      l.prerequisites
        .filter((p) => lessonBySlug.get(p)?.path === current)
        .map((p) => ({ from: p, to: l.slug })),
    );
    external = ls.flatMap((l) =>
      l.prerequisites
        .filter((p) => lessonBySlug.get(p)?.path !== current)
        .map((p) => ({ lesson: l.slug, prerequisite: p })),
    );
    const layout = layoutDag(
      ls.map((l) => ({ id: l.slug, order: l.moduleOrder * 100 + l.order })),
      internal,
    );
    size = layout;
    nodes = ls.map((l) => {
      const ext = l.prerequisites.filter((p) => lessonBySlug.get(p)?.path !== current);
      return {
        ...layout.nodes.get(l.slug)!,
        id: l.slug,
        href: `/learn/lesson/${l.slug}`,
        title: l.title,
        status: l.status,
        next: l.next,
        meta: `${m.common.status[l.status]} · ${R.minutes(l.minutes)}${ext.length ? ` · ${R.needs(ext.length)}` : ""}`,
        tooltip: `${l.module}${ext.length ? `\n${R.external}: ${ext.map((p) => lessonBySlug.get(p)?.title ?? p).join(", ")}` : ""}`,
      };
    });
    edges = layout.edges.map((e) => ({ ...e, active: PRACTISED.includes(lessonBySlug.get(e.from)!.status) }));
  }

  const tab = (active: boolean) =>
    cn(
      "rounded-md px-2.5 py-1 text-xs whitespace-nowrap",
      active ? "bg-surface-3 text-foreground font-medium" : "text-muted-foreground hover:text-foreground",
    );
  const nextCount = nodes.filter((n) => n.next).length;

  return (
    <PageContainer wide>
      <PageHeader title={R.title} description={R.description} />
      <nav className="mb-3 flex flex-wrap gap-1" aria-label={R.title} data-testid="roadmap-tabs">
        <Link
          href="/roadmap"
          className={tab(current === "all")}
          aria-current={current === "all" ? "page" : undefined}
        >
          {R.all}
        </Link>
        {data.paths.map((p) => (
          <Link
            key={p.slug}
            href={`/roadmap?path=${p.slug}`}
            className={tab(current === p.slug)}
            aria-current={current === p.slug ? "page" : undefined}
          >
            {p.title}{" "}
            <span className="text-subtle-foreground tabular-nums">
              {p.practised}/{p.total}
            </span>
          </Link>
        ))}
      </nav>

      <div
        className="text-muted-foreground mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px]"
        aria-label={R.legend}
      >
        {STATUSES.map((s) => (
          <span key={s} className="inline-flex items-center gap-1.5">
            <StatusDot status={s} />
            {m.common.status[s]}
          </span>
        ))}
        {current !== "all" ? (
          <span className="inline-flex items-center gap-1.5" title={R.nextHelp}>
            <span className="ring-primary inline-block size-2.5 rounded-sm ring-2" aria-hidden />
            {R.next} {nextCount ? `(${nextCount})` : ""}
          </span>
        ) : (
          <span>{R.allHelp}</span>
        )}
      </div>

      <RoadmapTree
        nodes={nodes}
        edges={edges}
        width={size.width}
        height={size.height}
        layout={current === "all" ? OVERVIEW_LAYOUT : DEFAULT_LAYOUT}
        statusLabel={m.common.status}
        nextLabel={R.next}
        label={current === "all" ? R.all : (pathTitle.get(current) ?? R.title)}
      />

      {external.length ? (
        <Card className="mt-4" data-testid="roadmap-external">
          <CardHeader>
            <div>
              <CardTitle>{R.external}</CardTitle>
              <CardDescription>{R.externalHelp}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <ul className="divide-border flex flex-col divide-y text-xs">
              {[...new Set(external.map((x) => x.lesson))].map((lesson) => (
                <li key={lesson} className="flex flex-col gap-1 py-2 sm:flex-row sm:items-baseline sm:gap-3">
                  <Link
                    href={`/learn/lesson/${lesson}`}
                    className="hover:text-primary shrink-0 font-medium sm:w-72"
                  >
                    {lessonBySlug.get(lesson)?.title ?? lesson}
                  </Link>
                  <span className="text-subtle-foreground hidden sm:inline">←</span>
                  <span className="flex flex-wrap gap-x-3 gap-y-1">
                    {external
                      .filter((x) => x.lesson === lesson)
                      .map(({ prerequisite }) => {
                        const pre = lessonBySlug.get(prerequisite);
                        return (
                          <Link
                            key={prerequisite}
                            href={`/learn/lesson/${prerequisite}`}
                            className="hover:text-primary inline-flex items-center gap-1.5"
                          >
                            {pre ? <StatusDot status={pre.status} /> : null}
                            {pre?.title ?? prerequisite}
                            <span className="text-subtle-foreground">
                              · {pathTitle.get(pre?.path ?? "") ?? ""}
                            </span>
                          </Link>
                        );
                      })}
                  </span>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      ) : null}
    </PageContainer>
  );
}
