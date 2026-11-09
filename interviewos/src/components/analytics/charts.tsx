"use client";

import { Bar, BarChart, CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { formatDay } from "@/lib/dates";
import { useI18n } from "@/lib/i18n/client";

const axis = { fontSize: 11, fill: "var(--muted-foreground)" };
const tooltipStyle = { background: "var(--surface-3)", border: "1px solid var(--border)", borderRadius: 6, fontSize: 12, color: "var(--foreground)" };
const SERIES = ["learning", "coding", "review", "other"] as const;
const SERIES_COLOR: Record<(typeof SERIES)[number], string> = {
  learning: "var(--series-1)",
  coding: "var(--series-2)",
  review: "var(--series-3)",
  other: "var(--series-4)",
};

export function WeeklyTimeChart({ data }: { data: { week: string; learning: number; coding: number; review: number; other: number }[] }) {
  const { m, locale } = useI18n();
  const W = m.analytics.weekly;
  const rows = data.map((d) => ({ ...d, label: formatDay(d.week, locale, { weekday: undefined }) }));
  return (
    <div>
      <ul className="mb-2 flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-muted-foreground" aria-label="Legend">
        {SERIES.map((s) => (
          <li key={s} className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm" style={{ background: SERIES_COLOR[s] }} />
            {W.series[s]}
          </li>
        ))}
      </ul>
      <div className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
            <CartesianGrid vertical={false} stroke="var(--border)" />
            <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
            <YAxis tickLine={false} axisLine={false} tick={axis} allowDecimals={false} />
            <Tooltip cursor={{ fill: "var(--surface-3)", opacity: 0.6 }} contentStyle={tooltipStyle} formatter={(v, name) => [`${v} min`, W.series[name as (typeof SERIES)[number]] ?? name]} />
            {SERIES.map((s, i) => (
              <Bar key={s} dataKey={s} stackId="t" fill={SERIES_COLOR[s]} stroke="var(--surface)" strokeWidth={2} maxBarSize={36} radius={i === SERIES.length - 1 ? [4, 4, 0, 0] : 0} />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function RetentionChart({ data }: { data: { week: string; retention: number | null; reviews: number }[] }) {
  const { locale } = useI18n();
  const rows = data.map((d) => ({ label: formatDay(d.week, locale, { weekday: undefined }), retention: d.retention === null ? null : Math.round(d.retention * 100), reviews: d.reviews }));
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={rows} margin={{ top: 4, right: 4, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={axis} unit="%" />
          <Tooltip cursor={{ fill: "var(--surface-3)", opacity: 0.6 }} contentStyle={tooltipStyle} formatter={(v) => [v === null ? "—" : `${v}%`, ""]} />
          <Bar dataKey="retention" fill="var(--series-1)" maxBarSize={36} radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}

export function InterviewScoresChart({ data }: { data: { date: string; score: number; type: string }[] }) {
  const { m, locale } = useI18n();
  const rows = data.map((d, i) => ({ ...d, n: i + 1, label: formatDay(d.date, locale, { weekday: undefined }) }));
  return (
    <div className="h-48">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={rows} margin={{ top: 8, right: 8, bottom: 0, left: -18 }}>
          <CartesianGrid vertical={false} stroke="var(--border)" />
          <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axis} />
          <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={axis} />
          <ReferenceLine y={70} stroke="var(--subtle-foreground)" strokeDasharray="3 3" />
          <Tooltip
            contentStyle={tooltipStyle}
            formatter={(v) => [`${v}/100`, m.analytics.interviews.score]}
            labelFormatter={(_, p) => {
              const t = (p?.[0]?.payload as { type?: string } | undefined)?.type;
              return t ? m.interviews.types[t as keyof typeof m.interviews.types] : "";
            }}
          />
          <Line type="monotone" dataKey="score" stroke="var(--series-1)" strokeWidth={2} dot={{ r: 4, fill: "var(--series-1)", stroke: "var(--surface)", strokeWidth: 2 }} activeDot={{ r: 5 }} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}

export function CalibrationChart({ data }: { data: { title: string; confidence: number; accuracy: number }[] }) {
  const { m } = useI18n();
  const C = m.analytics.calibration;
  return (
    <div className="h-56">
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={{ top: 8, right: 12, bottom: 12, left: -12 }}>
          <CartesianGrid stroke="var(--border)" />
          <XAxis type="number" dataKey="confidence" name={C.confidence} domain={[0.5, 5.5]} ticks={[1, 2, 3, 4, 5]} tickLine={false} axisLine={false} tick={axis} />
          <YAxis type="number" dataKey="accuracy" name={C.accuracy} domain={[0, 100]} tickLine={false} axisLine={false} tick={axis} unit="%" />
          <ZAxis range={[64, 64]} />
          <ReferenceLine segment={[{ x: 1, y: 20 }, { x: 5, y: 100 }]} stroke="var(--subtle-foreground)" strokeDasharray="3 3" />
          <Tooltip
            cursor={{ strokeDasharray: "3 3" }}
            contentStyle={tooltipStyle}
            formatter={(v, name) => [String(v), String(name)]}
            labelFormatter={() => ""}
            content={({ payload }) => {
              const p = payload?.[0]?.payload as { title: string; confidence: number; accuracy: number } | undefined;
              if (!p) return null;
              return (
                <div style={tooltipStyle} className="px-2 py-1">
                  <p className="font-medium">{p.title}</p>
                  <p>
                    {C.confidence}: {p.confidence} · {C.accuracy}: {p.accuracy}%
                  </p>
                </div>
              );
            }}
          />
          <Scatter data={data} fill="var(--series-1)" stroke="var(--surface)" strokeWidth={2} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
