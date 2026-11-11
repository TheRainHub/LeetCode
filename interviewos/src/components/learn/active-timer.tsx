"use client";

import { useEffect, useRef } from "react";

type Kind = "lesson" | "problem" | "review" | "lab" | "interview" | "experience" | "exercise";

function send(kind: Kind, ref: string, seconds: number) {
  if (seconds < 5) return;
  const body = JSON.stringify({ kind, ref, seconds: Math.round(seconds) });
  if (navigator.sendBeacon) navigator.sendBeacon("/api/time", new Blob([body], { type: "application/json" }));
  else void fetch("/api/time", { method: "POST", body, keepalive: true });
}

/**
 * Logs time while the tab is visible and the user has interacted recently
 * (idle > 3 min stops counting). Flushes every minute and on hide/unmount.
 */
export function ActiveTimer({ kind, refId }: { kind: Kind; refId: string }) {
  const acc = useRef(0);
  const lastTick = useRef<number>(0);
  const lastInput = useRef<number>(0);

  useEffect(() => {
    lastTick.current = Date.now();
    lastInput.current = Date.now();
    const onInput = () => (lastInput.current = Date.now());
    const tick = () => {
      const now = Date.now();
      const visible = document.visibilityState === "visible";
      const idle = now - lastInput.current > 3 * 60_000;
      if (visible && !idle) acc.current += (now - lastTick.current) / 1000;
      lastTick.current = now;
    };
    const flush = () => {
      tick();
      send(kind, refId, acc.current);
      acc.current = 0;
    };
    const interval = window.setInterval(tick, 5000);
    const flushInterval = window.setInterval(flush, 60_000);
    const onVisibility = () =>
      document.visibilityState === "hidden" ? flush() : (lastTick.current = Date.now());
    for (const ev of ["keydown", "mousemove", "scroll", "pointerdown"])
      window.addEventListener(ev, onInput, { passive: true });
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", flush);
    return () => {
      flush();
      window.clearInterval(interval);
      window.clearInterval(flushInterval);
      for (const ev of ["keydown", "mousemove", "scroll", "pointerdown"])
        window.removeEventListener(ev, onInput);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", flush);
    };
  }, [kind, refId]);

  return null;
}
