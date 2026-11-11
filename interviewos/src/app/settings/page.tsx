import { Download } from "lucide-react";
import Link from "next/link";
import { SettingsForm } from "@/components/settings/settings-form";
import { PageContainer, PageHeader } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { isAiConfigured } from "@/lib/ai/config";
import { env } from "@/lib/env";
import { getI18n, getSettings } from "@/server/user";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const [{ m }, s] = await Promise.all([getI18n(), getSettings()]);
  const S = m.settings;
  const e = env();
  const ai = isAiConfigured();
  return (
    <PageContainer className="max-w-4xl">
      <PageHeader title={S.title} description={S.description} />
      <div className="flex flex-col gap-4">
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{S.general}</CardTitle>
              <CardDescription>
                <Link href="/schedule" className="hover:text-foreground">
                  {S.schedule}
                </Link>
              </CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <SettingsForm
              initial={{
                locale: s.locale,
                theme: s.theme,
                preferredLanguage: s.preferredLanguage,
                timezone: s.timezone,
                interviewerProfile: s.interviewerProfile,
              }}
            />
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{S.ai.title}</CardTitle>
              <CardDescription>{S.ai.help}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <dl className="grid grid-cols-1 gap-x-6 gap-y-2 text-sm sm:grid-cols-2">
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{S.ai.status}</dt>
                <dd>
                  <Badge tone={ai ? "success" : "neutral"}>
                    {ai ? m.common.ai.configured : m.common.ai.notConfigured}
                  </Badge>
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{S.ai.model}</dt>
                <dd className="font-mono text-xs">{e.ANTHROPIC_MODEL}</dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{S.ai.effort}</dt>
                <dd className="font-mono text-xs">
                  {e.ANTHROPIC_EFFORT_CHAT} / {e.ANTHROPIC_EFFORT_EVALUATION}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{S.ai.tokens}</dt>
                <dd className="font-mono text-xs">
                  {e.ANTHROPIC_MAX_TOKENS_CHAT} / {e.ANTHROPIC_MAX_TOKENS_EVALUATION}
                </dd>
              </div>
              <div className="flex justify-between gap-2">
                <dt className="text-muted-foreground">{S.ai.fallback}</dt>
                <dd className="font-mono text-xs">{e.ANTHROPIC_FALLBACKS}</dd>
              </div>
            </dl>
            {!ai ? (
              <p className="text-muted-foreground mt-3 text-xs">{m.common.ai.notConfiguredHelp}</p>
            ) : null}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <div>
              <CardTitle>{S.data.title}</CardTitle>
              <CardDescription>{S.data.help}</CardDescription>
            </div>
          </CardHeader>
          <CardContent>
            <Button asChild size="sm">
              <a href="/api/export" download>
                <Download />
                {S.data.export}
              </a>
            </Button>
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
