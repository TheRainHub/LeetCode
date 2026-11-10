import { addDays, diffDays, weekday, type ISODate } from "@/lib/dates";

export type CalendarKind = "university" | "interview" | "unavailable" | "other";

export interface CalendarEventLite {
  kind: CalendarKind;
  date: ISODate;
  lightDaysBefore: number;
}

export interface CapacitySettings {
  dailyBudgetMinutes: number;
  restWeekdays: number[];
  prioritizeUniversity: boolean;
}

export type CapacityReason =
  | "normal"
  | "rest"
  | "unavailable"
  | "university_day"
  | "university_prep"
  | "interview_day"
  | "interview_eve";

export interface DayCapacity {
  minutes: number;
  reason: CapacityReason;
}

/** Hard cap for an exam day: only a short review keeps the streak alive. */
export const UNIVERSITY_DAY_MINUTES = 20;
export const INTERVIEW_DAY_MINUTES = 30;

/**
 * How many minutes of interview preparation fit into a calendar day.
 * When several rules apply, the most restrictive one wins.
 */
export function dayCapacity(
  date: ISODate,
  settings: CapacitySettings,
  events: readonly CalendarEventLite[],
): DayCapacity {
  const budget = Math.max(0, settings.dailyBudgetMinutes);
  const candidates: DayCapacity[] = [{ minutes: budget, reason: "normal" }];

  if (settings.restWeekdays.includes(weekday(date))) candidates.push({ minutes: 0, reason: "rest" });

  for (const ev of events) {
    const until = diffDays(date, ev.date); // days from `date` to the event
    if (ev.kind === "unavailable" && until === 0) {
      candidates.push({ minutes: 0, reason: "unavailable" });
    } else if (ev.kind === "university") {
      if (until === 0) {
        candidates.push({
          minutes: settings.prioritizeUniversity
            ? Math.min(UNIVERSITY_DAY_MINUTES, budget)
            : Math.round(budget * 0.5),
          reason: "university_day",
        });
      } else if (until > 0 && until <= ev.lightDaysBefore) {
        candidates.push({
          minutes: Math.round(budget * (settings.prioritizeUniversity ? 0.4 : 0.7)),
          reason: "university_prep",
        });
      }
    } else if (ev.kind === "interview") {
      if (until === 0) candidates.push({ minutes: Math.min(INTERVIEW_DAY_MINUTES, budget), reason: "interview_day" });
      else if (until === 1) candidates.push({ minutes: Math.round(budget * 0.6), reason: "interview_eve" });
    }
  }

  return candidates.reduce((min, c) => (c.minutes < min.minutes ? c : min));
}

export function capacityRange(
  from: ISODate,
  days: number,
  settings: CapacitySettings,
  events: readonly CalendarEventLite[],
): { date: ISODate; capacity: DayCapacity }[] {
  return Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    return { date, capacity: dayCapacity(date, settings, events) };
  });
}
