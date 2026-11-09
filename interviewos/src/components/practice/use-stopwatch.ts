"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/** Wall-clock stopwatch that survives re-renders; elapsed seconds update once per second. */
export function useStopwatch() {
  const [running, setRunning] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const base = useRef(0);
  const startedAt = useRef<number | null>(null);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => {
      if (startedAt.current !== null) setElapsed(base.current + (Date.now() - startedAt.current) / 1000);
    }, 1000);
    return () => window.clearInterval(id);
  }, [running]);

  const start = useCallback(() => {
    if (startedAt.current !== null) return;
    startedAt.current = Date.now();
    setRunning(true);
  }, []);
  const pause = useCallback(() => {
    if (startedAt.current === null) return;
    base.current += (Date.now() - startedAt.current) / 1000;
    startedAt.current = null;
    setElapsed(base.current);
    setRunning(false);
  }, []);
  const reset = useCallback(() => {
    base.current = 0;
    startedAt.current = null;
    setElapsed(0);
    setRunning(false);
  }, []);
  const read = useCallback(() => base.current + (startedAt.current !== null ? (Date.now() - startedAt.current) / 1000 : 0), []);

  return { running, elapsed, start, pause, reset, read };
}
