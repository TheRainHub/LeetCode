import { describe, expect, it } from "vitest";
import {
  gradeFromCodingAttempt,
  INITIAL_SRS_STATE,
  MAX_INTERVAL_DAYS,
  MIN_EASE,
  nextEase,
  review,
} from "./sm2";

const today = "2026-11-09";

describe("SM-2 variant", () => {
  it("schedules a first successful review for tomorrow and the second at 3 days", () => {
    const first = review(INITIAL_SRS_STATE, "good", { today });
    expect(first).toMatchObject({ intervalDays: 1, repetitions: 1, dueOn: "2026-11-10" });
    const second = review(first, "good", { today: "2026-11-10" });
    expect(second).toMatchObject({ intervalDays: 3, repetitions: 2, dueOn: "2026-11-13" });
  });

  it("grows intervals by the ease factor after the second repetition", () => {
    const s = { ease: 2.5, intervalDays: 3, repetitions: 2, lapses: 0 };
    const r = review(s, "good", { today });
    expect(r.intervalDays).toBe(Math.round(3 * nextEase(2.5, 4)));
  });

  it("resets on 'again', counts a lapse and lowers ease", () => {
    const s = { ease: 2.5, intervalDays: 20, repetitions: 5, lapses: 1 };
    const r = review(s, "again", { today });
    expect(r).toMatchObject({ intervalDays: 1, repetitions: 0, lapses: 2, dueOn: "2026-11-10" });
    expect(r.ease).toBeLessThan(2.5);
  });

  it("never lets ease drop below the floor", () => {
    let s = { ...INITIAL_SRS_STATE };
    for (let i = 0; i < 20; i++) s = review(s, "again", { today });
    expect(s.ease).toBe(MIN_EASE);
  });

  it("'hard' grows more slowly than 'good', 'easy' faster", () => {
    const s = { ease: 2.5, intervalDays: 10, repetitions: 3, lapses: 0 };
    const hard = review(s, "hard", { today }).intervalDays;
    const good = review(s, "good", { today }).intervalDays;
    const easy = review(s, "easy", { today }).intervalDays;
    expect(hard).toBeLessThan(good);
    expect(easy).toBeGreaterThan(good);
  });

  it("caps intervals at 60 days", () => {
    const s = { ease: 3, intervalDays: 50, repetitions: 8, lapses: 0 };
    expect(review(s, "easy", { today }).intervalDays).toBe(MAX_INTERVAL_DAYS);
  });

  it("shortens intervals so the item is reviewed at least two days before an interview", () => {
    const s = { ease: 2.5, intervalDays: 10, repetitions: 3, lapses: 0 };
    const r = review(s, "good", { today, interviewOn: "2026-11-16" });
    expect(r.intervalDays).toBe(5);
    expect(r.dueOn <= "2026-11-14").toBe(true);
  });

  it("maps coding attempts to grades honestly", () => {
    const base = { durationSeconds: 600, targetSeconds: 900 };
    expect(gradeFromCodingAttempt({ ...base, outcome: "passed", independence: "independent" })).toBe("good");
    expect(
      gradeFromCodingAttempt({
        ...base,
        durationSeconds: 300,
        outcome: "passed",
        independence: "independent",
      }),
    ).toBe("easy");
    expect(gradeFromCodingAttempt({ ...base, outcome: "passed", independence: "with_hints" })).toBe("hard");
    expect(gradeFromCodingAttempt({ ...base, outcome: "passed", independence: "with_solution" })).toBe(
      "again",
    );
    expect(gradeFromCodingAttempt({ ...base, outcome: "failed", independence: "independent" })).toBe("again");
    expect(gradeFromCodingAttempt({ ...base, outcome: "not_run", independence: "independent" })).toBe(
      "again",
    );
  });
});
