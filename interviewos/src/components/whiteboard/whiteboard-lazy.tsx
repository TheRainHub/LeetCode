"use client";

import dynamic from "next/dynamic";

/** The whiteboard is interactive only, so React Flow is loaded in the browser and not server-rendered. */
export const Whiteboard = dynamic(() => import("./whiteboard").then((m) => m.Whiteboard), {
  ssr: false,
  loading: () => (
    <div
      className="border-border bg-surface-2 h-[60vh] min-h-[420px] animate-pulse rounded-lg border"
      aria-hidden
    />
  ),
});
