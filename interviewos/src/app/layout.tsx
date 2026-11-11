import { GeistMono } from "geist/font/mono";
import { GeistSans } from "geist/font/sans";
import type { Metadata } from "next";
import { asc } from "drizzle-orm";
import { Toaster } from "sonner";
import { CommandPalette, type PaletteEntry } from "@/components/layout/command-palette";
import { MainContainer, Sidebar } from "@/components/layout/sidebar";
import { TooltipProvider } from "@/components/ui/tooltip";
import { isAiConfigured } from "@/lib/ai/config";
import { db } from "@/lib/db";
import { codingProblems, lessons } from "@/lib/db/schema";
import { I18nProvider } from "@/lib/i18n/client";
import { getI18n, getSettings } from "@/server/user";
import "./globals.css";

// Every page reads live, per-user data from PostgreSQL.
export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { default: "InterviewOS", template: "%s · InterviewOS" },
  description: "Personal software engineering interview preparation platform.",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [settings, { locale, m }] = await Promise.all([getSettings(), getI18n()]);
  const [lessonRows, problemRows] = await Promise.all([
    db.select({ slug: lessons.slug, title: lessons.title }).from(lessons).orderBy(asc(lessons.title)),
    db
      .select({ slug: codingProblems.slug, title: codingProblems.title })
      .from(codingProblems)
      .orderBy(asc(codingProblems.order)),
  ]);
  const palette: PaletteEntry[] = [
    ...problemRows.map((p) => ({
      label: p.title,
      href: `/practice/problems/${p.slug}`,
      group: m.common.nav.practice,
    })),
    ...lessonRows.map((l) => ({
      label: l.title,
      href: `/learn/lesson/${l.slug}`,
      group: m.common.nav.learn,
    })),
  ];

  return (
    <html lang={locale} data-theme={settings.theme} className={`${GeistSans.variable} ${GeistMono.variable}`}>
      <body>
        <I18nProvider locale={locale}>
          <TooltipProvider>
            <Sidebar aiEnabled={isAiConfigured()} />
            <MainContainer>{children}</MainContainer>
            <CommandPalette extra={palette} />
            <Toaster
              theme={settings.theme}
              position="bottom-right"
              toastOptions={{ className: "!bg-surface !border-border !text-foreground" }}
            />
          </TooltipProvider>
        </I18nProvider>
      </body>
    </html>
  );
}
