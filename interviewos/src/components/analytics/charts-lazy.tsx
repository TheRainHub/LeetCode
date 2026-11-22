"use client";

import dynamic from "next/dynamic";

// Charts render in the browser only: they need no server rendering, and keeping the charting
// library out of the server bundle keeps the Cloudflare Worker small.
const placeholder = () => <div className="bg-surface-2 h-48 animate-pulse rounded-md" aria-hidden />;

export const WeeklyTimeChart = dynamic(() => import("./charts").then((m) => m.WeeklyTimeChart), {
  ssr: false,
  loading: placeholder,
});
export const RetentionChart = dynamic(() => import("./charts").then((m) => m.RetentionChart), {
  ssr: false,
  loading: placeholder,
});
export const InterviewScoresChart = dynamic(() => import("./charts").then((m) => m.InterviewScoresChart), {
  ssr: false,
  loading: placeholder,
});
export const CalibrationChart = dynamic(() => import("./charts").then((m) => m.CalibrationChart), {
  ssr: false,
  loading: placeholder,
});
