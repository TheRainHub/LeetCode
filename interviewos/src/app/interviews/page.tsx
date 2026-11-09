import { KeyRound } from "lucide-react";
import Link from "next/link";
import { asc } from "drizzle-orm";
import { SetupForm, type CompanyOption } from "@/components/interviews/setup-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/misc";
import { isAiConfigured } from "@/lib/ai/config";
import { INTERVIEW_TYPES, type InterviewType } from "@/lib/ai/interviewer";
import type { Language } from "@/lib/content/types";
import { db } from "@/lib/db";
import { companies, interviewPresets } from "@/lib/db/schema";
import { listInterviews } from "@/server/interviews";
import { getI18n, getSettings } from "@/server/user";

export const metadata = { title: "Mock Interviews" };

export default async function InterviewsPage({ searchParams }: { searchParams: Promise<{ company?: string; preset?: string; type?: string }> }) {
  const sp = await searchParams;
  const [{ m, locale }, settings, history, companyRows, presetRows] = await Promise.all([
    getI18n(),
    getSettings(),
    listInterviews(),
    db.select().from(companies).orderBy(asc(companies.order)),
    db.select().from(interviewPresets).orderBy(asc(interviewPresets.order)),
  ]);
  const I = m.interviews;
  const ai = isAiConfigured();
  const options: CompanyOption[] = companyRows.map((c) => ({
    slug: c.slug,
    name: c.name,
    presets: presetRows
      .filter((p) => p.companyId === c.id)
      .map((p) => ({ id: p.id, title: p.title, type: p.type, difficulty: p.difficulty, durationMinutes: p.durationMinutes, language: p.language })),
  }));
  const preset = presetRows.find((p) => String(p.id) === sp.preset);
  const company = companyRows.find((c) => c.slug === sp.company || c.id === preset?.companyId);
  const type = (INTERVIEW_TYPES as readonly string[]).includes(sp.type ?? "") ? (sp.type as InterviewType) : "algorithms";

  return (
    <PageContainer>
      <PageHeader title={I.title} description={I.description} />
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>{I.setup.title}</CardTitle>
        </CardHeader>
        <CardContent>
          {ai ? (
            <SetupForm
              companies={options}
              initial={{
                company: company?.slug ?? "",
                type: preset?.type ?? type,
                difficulty: preset?.difficulty ?? "medium",
                duration: preset?.durationMinutes ?? 45,
                language: (preset?.language ?? settings.preferredLanguage) as Language,
              }}
            />
          ) : (
            <EmptyState icon={<KeyRound />} title={I.disabledTitle} description={I.disabledHelp} />
          )}
        </CardContent>
      </Card>

      <h2 className="mb-2 text-sm font-semibold">{I.history.title}</h2>
      {history.length === 0 ? (
        <EmptyState title={I.history.empty} />
      ) : (
        <Card className="divide-y divide-border">
          {history.map((h) => (
            <Link key={h.id} href={`/interviews/${h.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2">
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">
                  {I.types[h.type]}
                  {h.companyName ? <span className="text-muted-foreground"> · {h.companyName}</span> : null}
                </p>
                <p className="text-[11px] text-subtle-foreground">
                  {h.startedAt.toLocaleString(locale === "ru" ? "ru-RU" : "en-GB", { dateStyle: "medium", timeStyle: "short" })} · {m.common.difficulty[h.difficulty]} ·{" "}
                  {m.common.minutes(h.durationMinutes)}
                </p>
              </div>
              <Badge tone={h.status === "completed" ? "success" : h.status === "in_progress" ? "primary" : h.status === "evaluating" ? "warning" : "neutral"}>
                {I.history.status[h.status]}
              </Badge>
              <span className="w-12 text-right text-sm font-semibold tabular-nums">{h.score ?? "—"}</span>
            </Link>
          ))}
        </Card>
      )}
    </PageContainer>
  );
}
