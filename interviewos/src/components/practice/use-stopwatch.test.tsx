// @vitest-environment jsdom
import { act, renderHook } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useStopwatch } from "./use-stopwatch";

describe("useStopwatch", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-11-11T10:00:00Z"));
  });
  afterEach(() => vi.useRealTimers());

  it("accumulates time only while running", () => {
    const { result } = renderHook(() => useStopwatch());
    expect(result.current.elapsed).toBe(0);

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(5_000));
    expect(result.current.running).toBe(true);
    expect(result.current.elapsed).toBeCloseTo(5, 0);

    act(() => result.current.pause());
    act(() => vi.advanceTimersByTime(60_000));
    expect(result.current.running).toBe(false);
    expect(result.current.elapsed).toBeCloseTo(5, 0);

    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(3_000));
    expect(result.current.read()).toBeCloseTo(8, 0);
  });

  it("ignores a second start and resets to zero", () => {
    const { result } = renderHook(() => useStopwatch());
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(2_000));
    act(() => result.current.start());
    act(() => vi.advanceTimersByTime(2_000));
    expect(result.current.read()).toBeCloseTo(4, 0);

    act(() => result.current.reset());
    expect(result.current.running).toBe(false);
    expect(result.current.elapsed).toBe(0);
    expect(result.current.read()).toBe(0);
  });
});
