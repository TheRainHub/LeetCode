import { addDays, maxDate, type ISODate } from "@/lib/dates";

export interface PlaceableTask {
  id: number | string;
  minutes: number;
  /** Current date (undefined for brand-new tasks). */
  date?: ISODate;
  /** Pinned tasks keep their date if it is still valid (>= from and the day has capacity). */
  pinned?: boolean;
}

export interface Placement {
  id: number | string;
  date: ISODate;
  /** True when the task is larger than any day's capacity and was placed alone on a day. */
  overCapacity: boolean;
  moved: boolean;
}

export interface PlacementOptions {
  from: ISODate;
  capacityOf: (date: ISODate) => number;
  /** Minutes already consumed per day (e.g. completed tasks). */
  used?: Record<ISODate, number>;
  /**
   * When false (default), a task is never moved earlier than its current date:
   * finishing today's work early must not silently pull tomorrow's tasks in.
   */
  allowPullForward?: boolean;
  horizonDays?: number;
}

/**
 * Places tasks in the given order onto days, never exceeding a day's capacity.
 * Order is preserved: a task is never scheduled before the task preceding it.
 * Tasks are atomic. A single task larger than every day's capacity is placed
 * on the next day with any capacity and flagged `overCapacity`.
 */
export function placeTasks(tasks: readonly PlaceableTask[], opts: PlacementOptions): Placement[] {
  const horizon = opts.horizonDays ?? 180;
  const used: Record<ISODate, number> = { ...(opts.used ?? {}) };
  const free = (d: ISODate) => opts.capacityOf(d) - (used[d] ?? 0);
  const placements: Placement[] = [];

  // Pinned tasks that are still valid claim their capacity first.
  const keptPinned = new Set<PlaceableTask["id"]>();
  for (const t of tasks) {
    if (t.pinned && t.date && t.date >= opts.from && opts.capacityOf(t.date) > 0) {
      keptPinned.add(t.id);
      used[t.date] = (used[t.date] ?? 0) + t.minutes;
    }
  }

  let cursor = opts.from;
  for (const t of tasks) {
    if (keptPinned.has(t.id)) {
      placements.push({ id: t.id, date: t.date!, overCapacity: false, moved: false });
      continue;
    }

    let earliest = cursor;
    if (!opts.allowPullForward && t.date && t.date > earliest) earliest = t.date;
    earliest = maxDate(earliest, opts.from);

    let chosen: ISODate | null = null;
    for (let i = 0; i < horizon; i++) {
      const d = addDays(earliest, i);
      if (free(d) >= t.minutes) {
        chosen = d;
        break;
      }
    }

    let overCapacity = false;
    if (!chosen) {
      // Oversized task: put it alone on the first empty day that has any capacity.
      for (let i = 0; i < horizon; i++) {
        const d = addDays(earliest, i);
        if (opts.capacityOf(d) > 0 && (used[d] ?? 0) === 0) {
          chosen = d;
          break;
        }
      }
      overCapacity = true;
    }
    if (!chosen) chosen = earliest;

    used[chosen] = (used[chosen] ?? 0) + t.minutes;
    cursor = chosen;
    placements.push({
      id: t.id,
      date: chosen,
      overCapacity,
      moved: t.date !== undefined && t.date !== chosen,
    });
  }

  return placements;
}
