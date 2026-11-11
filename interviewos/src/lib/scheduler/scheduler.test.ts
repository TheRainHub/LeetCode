import { describe, expect, it } from "vitest";
import { addDays } from "@/lib/dates";
import {
  dayCapacity,
  UNIVERSITY_DAY_MINUTES,
  type CalendarEventLite,
  type CapacitySettings,
} from "./capacity";
import { placeTasks } from "./placement";

const settings: CapacitySettings = { dailyBudgetMinutes: 90, restWeekdays: [], prioritizeUniversity: true };
const zwa: CalendarEventLite = { kind: "university", date: "2026-11-11", lightDaysBefore: 3 };

describe("dayCapacity", () => {
  it("keeps days before a university test light and the test day minimal", () => {
    expect(dayCapacity("2026-11-08", settings, [zwa])).toMatchObject({
      reason: "university_prep",
      minutes: 36,
    });
    expect(dayCapacity("2026-11-10", settings, [zwa])).toMatchObject({
      reason: "university_prep",
      minutes: 36,
    });
    expect(dayCapacity("2026-11-11", settings, [zwa])).toMatchObject({
      reason: "university_day",
      minutes: UNIVERSITY_DAY_MINUTES,
    });
    expect(dayCapacity("2026-11-12", settings, [zwa])).toMatchObject({ reason: "normal", minutes: 90 });
    expect(dayCapacity("2026-11-07", settings, [zwa]).reason).toBe("normal");
  });

  it("is less restrictive when university work is not prioritized", () => {
    expect(dayCapacity("2026-11-10", { ...settings, prioritizeUniversity: false }, [zwa]).minutes).toBe(63);
  });

  it("returns zero on rest weekdays and unavailable days", () => {
    expect(dayCapacity("2026-11-15", { ...settings, restWeekdays: [0] }, []).reason).toBe("rest"); // Sunday
    expect(
      dayCapacity("2026-11-13", settings, [{ kind: "unavailable", date: "2026-11-13", lightDaysBefore: 0 }])
        .minutes,
    ).toBe(0);
  });

  it("lightens interview days and the day before", () => {
    const iv: CalendarEventLite = { kind: "interview", date: "2026-11-20", lightDaysBefore: 0 };
    expect(dayCapacity("2026-11-20", settings, [iv]).minutes).toBe(30);
    expect(dayCapacity("2026-11-19", settings, [iv]).minutes).toBe(54);
  });

  it("picks the most restrictive rule", () => {
    const events: CalendarEventLite[] = [
      zwa,
      { kind: "unavailable", date: "2026-11-10", lightDaysBefore: 0 },
    ];
    expect(dayCapacity("2026-11-10", settings, events)).toMatchObject({ minutes: 0, reason: "unavailable" });
  });
});

describe("placeTasks", () => {
  const cap = (d: string) => dayCapacity(d, settings, [zwa]).minutes;

  it("never exceeds daily capacity and preserves order", () => {
    const tasks = [25, 30, 20, 15, 15, 30, 30, 35].map((minutes, i) => ({ id: i, minutes }));
    const placed = placeTasks(tasks, { from: "2026-11-09", capacityOf: cap });
    const used: Record<string, number> = {};
    for (const p of placed) used[p.date] = (used[p.date] ?? 0) + tasks[p.id as number]!.minutes;
    for (const [d, m] of Object.entries(used)) expect(m).toBeLessThanOrEqual(cap(d));
    const dates = placed.map((p) => p.date);
    expect([...dates].sort()).toEqual(dates);
    expect(placed[0]!.date).toBe("2026-11-09");
    expect(placed.find((p) => p.id === 2)!.date).toBe("2026-11-11"); // 20 min fits the exam-day cap
  });

  it("flags a task larger than any day's capacity and places it alone", () => {
    const placed = placeTasks([{ id: "big", minutes: 120 }], {
      from: "2026-11-12",
      capacityOf: () => 90,
      horizonDays: 10,
    });
    expect(placed[0]).toMatchObject({ overCapacity: true, date: "2026-11-12" });
  });

  it("moves tasks off a day that became unavailable", () => {
    const unavailable = (d: string) => (d === "2026-11-13" ? 0 : 90);
    const placed = placeTasks([{ id: 1, minutes: 30, date: "2026-11-13" }], {
      from: "2026-11-12",
      capacityOf: unavailable,
    });
    expect(placed[0]).toMatchObject({ date: "2026-11-14", moved: true });
  });

  it("does not pull future tasks earlier unless asked", () => {
    const tasks = [{ id: 1, minutes: 30, date: "2026-11-20" }];
    expect(placeTasks(tasks, { from: "2026-11-12", capacityOf: () => 90 })[0]!.date).toBe("2026-11-20");
    expect(
      placeTasks(tasks, { from: "2026-11-12", capacityOf: () => 90, allowPullForward: true })[0]!.date,
    ).toBe("2026-11-12");
  });

  it("keeps valid pinned tasks and their capacity", () => {
    const placed = placeTasks(
      [
        { id: "pinned", minutes: 80, date: "2026-11-14", pinned: true },
        { id: "next", minutes: 30, date: "2026-11-14" },
      ],
      { from: "2026-11-12", capacityOf: () => 90 },
    );
    expect(placed.find((p) => p.id === "pinned")!.date).toBe("2026-11-14");
    expect(placed.find((p) => p.id === "next")!.date).toBe("2026-11-15");
  });

  it("carries overdue tasks to today (callers pass undefined dates for past tasks)", () => {
    const placed = placeTasks([{ id: 1, minutes: 20 }], {
      from: "2026-11-12",
      capacityOf: () => 90,
      used: { "2026-11-12": 80 },
    });
    expect(placed[0]!.date).toBe(addDays("2026-11-12", 1));
  });
});
