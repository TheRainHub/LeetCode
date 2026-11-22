"use client";

import dynamic from "next/dynamic";

/** Browser-only chart (see components/analytics/charts-lazy.tsx). */
export const WeekChart = dynamic(() => import("./week-chart").then((m) => m.WeekChart), {
  ssr: false,
  loading: () => <div className="bg-surface-2 h-40 animate-pulse rounded-md" aria-hidden />,
});
