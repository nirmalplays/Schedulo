import { DateTime } from "luxon";
import { WEEKDAYS, type TimeInterval, type WeeklyRules } from "@/db/schema";

/**
 * Pure availability engine. All inputs and outputs are absolute instants (UTC);
 * wall-clock rules are interpreted in the schedule's IANA timezone.
 *
 * A slot is bookable only if it:
 *  1. lies inside weekly hours, or a date override for that local date;
 *  2. starts >= now + minNotice and <= now + windowDays;
 *  3. with the event's buffers applied, overlaps no busy interval;
 *  4. keeps the event type's per-day count under dailyCap;
 *  5. aligns to the slot interval (default = duration) from the interval start.
 */

export type Busy = { start: Date; end: Date };

export type AvailabilityInput = {
  schedule: {
    timezone: string;
    weeklyRules: WeeklyRules;
    /** ISO date (yyyy-MM-dd) -> intervals; [] = day off. */
    overrides: Record<string, TimeInterval[]>;
  };
  eventType: {
    durationMin: number;
    slotIntervalMin?: number | null;
    bufferBeforeMin: number;
    bufferAfterMin: number;
    minNoticeMin: number;
    windowDays: number;
    dailyCap?: number | null;
  };
  /** Calendar busy times and existing bookings (already expanded by their own buffers). */
  busy: Busy[];
  /** Existing bookings of THIS event type per host-local date, for dailyCap. */
  bookingsPerDay?: Record<string, number>;
  now: Date;
  rangeStart: Date;
  rangeEnd: Date;
};

const MINUTE = 60_000;

function parseHm(hm: string): { hour: number; minute: number } {
  const [h, m] = hm.split(":").map(Number);
  return { hour: h, minute: m };
}

/** Wall-clock time on a local date -> DateTime in zone. "24:00" = next midnight. */
function atLocal(date: DateTime, hm: string): DateTime {
  const { hour, minute } = parseHm(hm);
  if (hour === 24) return date.startOf("day").plus({ days: 1 });
  // set() keeps wall-clock semantics across DST (plus({hours}) would not).
  return date.set({ hour, minute, second: 0, millisecond: 0 });
}

export function intervalsForDate(
  schedule: AvailabilityInput["schedule"],
  isoDate: string,
): TimeInterval[] {
  if (isoDate in schedule.overrides) return schedule.overrides[isoDate];
  const weekday = DateTime.fromISO(isoDate).weekday; // 1 = Mon
  return schedule.weeklyRules[WEEKDAYS[weekday - 1]] ?? [];
}

export function computeSlots(input: AvailabilityInput): Date[] {
  const { schedule, eventType, now } = input;
  const zone = schedule.timezone;
  const durationMs = eventType.durationMin * MINUTE;
  const stepMs = (eventType.slotIntervalMin || eventType.durationMin) * MINUTE;
  const beforeMs = eventType.bufferBeforeMin * MINUTE;
  const afterMs = eventType.bufferAfterMin * MINUTE;

  const earliest = Math.max(input.rangeStart.getTime(), now.getTime() + eventType.minNoticeMin * MINUTE);
  const latest = Math.min(input.rangeEnd.getTime(), now.getTime() + eventType.windowDays * 24 * 60 * MINUTE);
  if (earliest >= latest) return [];

  const busy = input.busy
    .map((b) => ({ start: b.start.getTime(), end: b.end.getTime() }))
    .sort((a, b) => a.start - b.start);
  const perDay = { ...(input.bookingsPerDay ?? {}) };

  const slots = new Set<number>();
  // Walk local dates covering the range (±1 day for zone offsets).
  let day = DateTime.fromMillis(earliest, { zone }).startOf("day").minus({ days: 1 });
  const lastDay = DateTime.fromMillis(latest, { zone }).startOf("day").plus({ days: 1 });

  for (; day <= lastDay; day = day.plus({ days: 1 })) {
    const isoDate = day.toISODate()!;
    for (const interval of intervalsForDate(schedule, isoDate)) {
      const intervalStart = atLocal(day, interval.start).toMillis();
      const intervalEnd = atLocal(day, interval.end).toMillis();
      for (let s = intervalStart; s + durationMs <= intervalEnd; s += stepMs) {
        if (s < earliest || s >= latest) continue;
        const e = s + durationMs;
        if (overlapsBusy(busy, s - beforeMs, e + afterMs)) continue;
        slots.add(s);
      }
    }
  }

  const sorted = [...slots].sort((a, b) => a - b);
  if (!eventType.dailyCap) return sorted.map((ms) => new Date(ms));

  // Daily cap: a day that already has `cap` bookings offers no slots.
  return sorted
    .filter((ms) => {
      const d = DateTime.fromMillis(ms, { zone }).toISODate()!;
      return (perDay[d] ?? 0) < eventType.dailyCap!;
    })
    .map((ms) => new Date(ms));
}

function overlapsBusy(busy: { start: number; end: number }[], s: number, e: number): boolean {
  for (const b of busy) {
    if (b.start >= e) break; // sorted by start
    if (b.end > s) return true;
  }
  return false;
}
