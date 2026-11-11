"use client";

import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { formatDay } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";

export function WeekChart({ data }: { data: { date: string; seconds: number }[] }) {
  const { locale } = useI18n();
  const rows = data.map((d) => ({
    label: formatDay(d.date, locale, { weekday: "narrow", day: undefined, month: undefined }),
    full: formatDay(d.date, locale),
    minutes: Math.round(d.seconds / 60),
  }));
  return (
    <div className="h-20 w-full" aria-hidden>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 0, bottom: 0, left: 0 }}>
          <XAxis
            dataKey="label"
            tickLine={false}
            axisLine={false}
            tick={{ fontSize: 10, fill: "var(--subtle-foreground)" }}
          />
          <Tooltip
            cursor={{ fill: "var(--surface-3)" }}
            contentStyle={{
              background: "var(--surface-3)",
              border: "1px solid var(--border)",
              borderRadius: 6,
              fontSize: 12,
            }}
            labelFormatter={(_, p) => (p?.[0]?.payload as { full?: string } | undefined)?.full ?? ""}
            formatter={(v) => [`${v} min`, ""]}
          />
          <Bar dataKey="minutes" fill="var(--primary)" radius={[3, 3, 0, 0]} maxBarSize={22} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
