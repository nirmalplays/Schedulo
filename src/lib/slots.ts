import { and, eq, gt, gte, lt, ne, or, isNull } from "drizzle-orm";
import { DateTime } from "luxon";
import { db, type DB, type Tx } from "@/db";
import { bookings, dateOverrides, eventTypes, schedules, type EventType } from "@/db/schema";
import { computeSlots, type Busy } from "./availability";
import { getCalendarBusy, subtractInterval, type CalendarBusy } from "./google/calendar";

type Executor = DB | Tx;

const DAY_MS = 24 * 60 * 60 * 1000;

export async function getScheduleFor(eventType: EventType, ex: Executor = db) {
  const [schedule] = await ex
    .select()
    .from(schedules)
    .where(
      eventType.scheduleId
        ? eq(schedules.id, eventType.scheduleId)
        : and(eq(schedules.userId, eventType.userId), eq(schedules.isDefault, true)),
    )
    .limit(1);
  return schedule ?? null;
}

/**
 * Busy intervals for a host from the app's own active bookings, each expanded
 * by its event type's buffers. Calendar busy times join here once sync lands.
 */
async function getBookingBusy(
  hostId: string,
  from: Date,
  to: Date,
  ex: Executor,
  excludeBookingId?: string,
) {
  const now = new Date();
  const rows = await ex
    .select({
      id: bookings.id,
      eventTypeId: bookings.eventTypeId,
      start: bookings.startUtc,
      end: bookings.endUtc,
      before: eventTypes.bufferBeforeMin,
      after: eventTypes.bufferAfterMin,
    })
    .from(bookings)
    .innerJoin(eventTypes, eq(eventTypes.id, bookings.eventTypeId))
    .where(
      and(
        eq(bookings.hostId, hostId),
        lt(bookings.startUtc, to),
        gt(bookings.endUtc, from),
        or(
          eq(bookings.status, "confirmed"),
          and(eq(bookings.status, "held"), or(isNull(bookings.holdExpiresAt), gt(bookings.holdExpiresAt, now))),
        ),
        excludeBookingId ? ne(bookings.id, excludeBookingId) : undefined,
      ),
    );

  const busy: Busy[] = rows.map((r) => ({
    start: new Date(r.start.getTime() - r.before * 60_000),
    end: new Date(r.end.getTime() + r.after * 60_000),
  }));
  return { busy, rows };
}

export async function getAvailableSlots(
  eventType: EventType,
  rangeStart: Date,
  rangeEnd: Date,
  opts: { ex?: Executor; excludeBookingId?: string; now?: Date; liveCalendar?: boolean; calendar?: CalendarBusy } = {},
): Promise<Date[]> {
  const ex = opts.ex ?? db;
  const schedule = await getScheduleFor(eventType, ex);
  if (!schedule) return [];

  // Pad by a day so buffers and daily caps near the range edges are accounted for.
  const padFrom = new Date(rangeStart.getTime() - DAY_MS);
  const padTo = new Date(rangeEnd.getTime() + DAY_MS);

  const fromDate = DateTime.fromJSDate(padFrom, { zone: schedule.timezone }).toISODate()!;
  const toDate = DateTime.fromJSDate(padTo, { zone: schedule.timezone }).toISODate()!;

  const [overrideRows, { busy, rows }, calendar, excluded] = await Promise.all([
    ex
      .select()
      .from(dateOverrides)
      .where(
        and(
          eq(dateOverrides.scheduleId, schedule.id),
          gte(dateOverrides.date, fromDate),
          lt(dateOverrides.date, toDate),
        ),
      ),
    getBookingBusy(eventType.userId, padFrom, padTo, ex, opts.excludeBookingId),
    opts.calendar ?? getCalendarBusy(eventType.userId, padFrom, padTo, { live: opts.liveCalendar }),
    opts.excludeBookingId
      ? ex
          .select({ start: bookings.startUtc, end: bookings.endUtc })
          .from(bookings)
          .where(eq(bookings.id, opts.excludeBookingId))
          .then((r) => r[0])
      : undefined,
  ]);

  // A disconnected calendar pauses the booking page rather than risk double-bookings.
  if (calendar.paused) return [];
  // When rescheduling, the booking's own event in the host's calendar shouldn't block it.
  const calendarBusy = excluded ? subtractInterval(calendar.busy, excluded) : calendar.busy;

  const bookingsPerDay: Record<string, number> = {};
  if (eventType.dailyCap) {
    for (const r of rows) {
      if (r.eventTypeId !== eventType.id) continue;
      const d = DateTime.fromJSDate(r.start, { zone: schedule.timezone }).toISODate()!;
      bookingsPerDay[d] = (bookingsPerDay[d] ?? 0) + 1;
    }
  }

  return computeSlots({
    schedule: {
      timezone: schedule.timezone,
      weeklyRules: schedule.weeklyRules,
      overrides: Object.fromEntries(overrideRows.map((o) => [o.date, o.intervals])),
    },
    eventType,
    busy: [...busy, ...calendarBusy],
    bookingsPerDay,
    now: opts.now ?? new Date(),
    rangeStart,
    rangeEnd,
  });
}

/**
 * Live calendar busy times around `start`, for a submit-time check. Fetch this
 * before opening the booking transaction: no Google calls while holding the host lock.
 */
export function liveCalendarBusyAround(hostId: string, start: Date) {
  return getCalendarBusy(hostId, new Date(start.getTime() - DAY_MS), new Date(start.getTime() + 2 * DAY_MS), { live: true });
}

export async function isSlotAvailable(
  eventType: EventType,
  start: Date,
  opts: { ex?: Executor; excludeBookingId?: string; calendar?: CalendarBusy } = {},
) {
  // Submit-time check: never trust the busy-time cache.
  const slots = await getAvailableSlots(eventType, start, new Date(start.getTime() + 1), { ...opts, liveCalendar: true });
  return slots.some((s) => s.getTime() === start.getTime());
}

export async function nextFreeSlots(eventType: EventType, after: Date, count = 3) {
  const slots = await getAvailableSlots(eventType, new Date(after.getTime() + 1), new Date(after.getTime() + 14 * DAY_MS));
  return slots.slice(0, count);
}
