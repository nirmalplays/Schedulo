import { and, asc, eq, lt, sql } from "drizzle-orm";
import { DateTime } from "luxon";
import { z } from "zod";
import { db, type Tx } from "@/db";
import { bookingQuestions, bookings, eventTypes, users, type Booking, type EventType, type User } from "@/db/schema";
import { CalendarUnavailableError } from "./google/calendar";
import { isSlotAvailable, liveCalendarBusyAround, nextFreeSlots } from "./slots";

export const isValidZone = (zone: string) => DateTime.local().setZone(zone).isValid;

export const bookingInputSchema = z.object({
  eventTypeId: z.string().min(1),
  start: z.iso.datetime({ offset: true }),
  name: z.string().trim().min(1, "Please enter your name").max(120),
  email: z.email("Please enter a valid email").max(254),
  phone: z.string().trim().max(32).optional().or(z.literal("")),
  timezone: z.string().refine(isValidZone, "Unknown timezone"),
  answers: z.record(z.string(), z.string().max(2000)).default({}),
});
export type BookingInput = z.input<typeof bookingInputSchema>;

export type BookingContext = { booking: Booking; eventType: EventType; host: User };

export type BookingResult =
  | { ok: true; ctx: BookingContext }
  | { ok: false; error: "slot_taken"; alternatives: string[] }
  | { ok: false; error: "invalid"; message: string };

class SlotTakenError extends Error {}

/** Postgres exclusion_violation / unique_violation => someone else got the slot. */
function isConflict(err: unknown): boolean {
  const codes = new Set(["23P01", "23505"]);
  let e: unknown = err;
  for (let i = 0; i < 3 && e; i++) {
    if (typeof e === "object" && e && "code" in e && codes.has(String((e as { code: unknown }).code))) return true;
    e = (e as { cause?: unknown }).cause;
  }
  return false;
}

/** Serialises all booking writes for one host within the transaction. */
async function lockHost(tx: Tx, hostId: string) {
  await tx.execute(sql`select pg_advisory_xact_lock(hashtext(${hostId}))`);
  await tx
    .update(bookings)
    .set({ status: "cancelled", cancelReason: "Payment hold expired", updatedAt: new Date() })
    .where(and(eq(bookings.hostId, hostId), eq(bookings.status, "held"), lt(bookings.holdExpiresAt, new Date())));
}

const calendarUnavailable: BookingResult = {
  ok: false,
  error: "invalid",
  message: "We couldn't check the host's calendar just now. Please try again in a moment.",
};

async function slotTaken(eventType: EventType, start: Date): Promise<BookingResult> {
  const alternatives = await nextFreeSlots(eventType, start);
  return { ok: false, error: "slot_taken", alternatives: alternatives.map((d) => d.toISOString()) };
}

export async function createBooking(raw: BookingInput): Promise<BookingResult> {
  const parsed = bookingInputSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, error: "invalid", message: parsed.error.issues[0].message };
  const input = parsed.data;

  const [row] = await db
    .select({ eventType: eventTypes, host: users })
    .from(eventTypes)
    .innerJoin(users, eq(users.id, eventTypes.userId))
    .where(and(eq(eventTypes.id, input.eventTypeId), eq(eventTypes.isActive, true)))
    .limit(1);
  if (!row) return { ok: false, error: "invalid", message: "This event is no longer available." };
  const { eventType, host } = row;

  const questions = await db
    .select()
    .from(bookingQuestions)
    .where(eq(bookingQuestions.eventTypeId, eventType.id))
    .orderBy(asc(bookingQuestions.position));
  const answers: Booking["answers"] = [];
  for (const q of questions) {
    const value = (input.answers[q.id] ?? "").trim();
    if (q.required && !value) return { ok: false, error: "invalid", message: `"${q.label}" is required.` };
    if (q.type === "select" && value && !q.options?.includes(value))
      return { ok: false, error: "invalid", message: `Invalid option for "${q.label}".` };
    answers.push({ questionId: q.id, label: q.label, value });
  }

  const start = new Date(input.start);
  const end = new Date(start.getTime() + eventType.durationMin * 60_000);

  try {
    const calendar = await liveCalendarBusyAround(host.id, start);
    const booking = await db.transaction(async (tx) => {
      await lockHost(tx, host.id);
      if (!(await isSlotAvailable(eventType, start, { ex: tx, calendar }))) throw new SlotTakenError();
      const [created] = await tx
        .insert(bookings)
        .values({
          eventTypeId: eventType.id,
          hostId: host.id,
          startUtc: start,
          endUtc: end,
          status: "confirmed",
          inviteeName: input.name,
          inviteeEmail: input.email.toLowerCase(),
          inviteePhone: input.phone || null,
          inviteeTimezone: input.timezone,
          answers,
          location: eventType.location,
        })
        .returning();
      return created;
    });
    return { ok: true, ctx: { booking, eventType, host } };
  } catch (err) {
    if (err instanceof SlotTakenError || isConflict(err)) return slotTaken(eventType, start);
    if (err instanceof CalendarUnavailableError) return calendarUnavailable;
    throw err;
  }
}

export async function getBookingByToken(token: string) {
  const [row] = await db
    .select({ booking: bookings, eventType: eventTypes, host: users })
    .from(bookings)
    .innerJoin(eventTypes, eq(eventTypes.id, bookings.eventTypeId))
    .innerJoin(users, eq(users.id, bookings.hostId))
    .where(eq(bookings.cancelToken, token))
    .limit(1);
  return row ?? null;
}

export async function getBookingById(id: string) {
  const [row] = await db
    .select({ booking: bookings, eventType: eventTypes, host: users })
    .from(bookings)
    .innerJoin(eventTypes, eq(eventTypes.id, bookings.eventTypeId))
    .innerJoin(users, eq(users.id, bookings.hostId))
    .where(eq(bookings.id, id))
    .limit(1);
  return row ?? null;
}

/** Moves a booking to a new start time, keeping its ID. */
export async function rescheduleBooking(
  token: string,
  newStartIso: string,
): Promise<BookingResult & { previousStart?: Date }> {
  const found = await getBookingByToken(token);
  if (!found || found.booking.status !== "confirmed")
    return { ok: false, error: "invalid", message: "This booking can no longer be changed." };
  if (found.booking.startUtc.getTime() <= Date.now())
    return { ok: false, error: "invalid", message: "This meeting has already started." };
  const parsed = z.iso.datetime({ offset: true }).safeParse(newStartIso);
  if (!parsed.success) return { ok: false, error: "invalid", message: "Invalid time." };

  const { eventType, host } = found;
  const start = new Date(parsed.data);
  const end = new Date(start.getTime() + eventType.durationMin * 60_000);
  const previousStart = found.booking.startUtc;

  try {
    const calendar = await liveCalendarBusyAround(host.id, start);
    const booking = await db.transaction(async (tx) => {
      await lockHost(tx, host.id);
      const ok = await isSlotAvailable(eventType, start, { ex: tx, excludeBookingId: found.booking.id, calendar });
      if (!ok) throw new SlotTakenError();
      const [updated] = await tx
        .update(bookings)
        .set({
          startUtc: start,
          endUtc: end,
          rescheduleCount: sql`${bookings.rescheduleCount} + 1`,
          updatedAt: new Date(),
        })
        .where(and(eq(bookings.id, found.booking.id), eq(bookings.status, "confirmed")))
        .returning();
      if (!updated) throw new Error("Booking changed concurrently");
      return updated;
    });
    return { ok: true, ctx: { booking, eventType, host }, previousStart };
  } catch (err) {
    if (err instanceof SlotTakenError || isConflict(err)) return slotTaken(eventType, start);
    if (err instanceof CalendarUnavailableError) return calendarUnavailable;
    throw err;
  }
}

export async function cancelBooking(
  where: { token: string } | { id: string; hostId: string },
  reason: string | undefined,
): Promise<{ ok: true; ctx: BookingContext } | { ok: false; message: string }> {
  const found = "token" in where ? await getBookingByToken(where.token) : await getBookingById(where.id);
  if (!found || ("hostId" in where && found.booking.hostId !== where.hostId))
    return { ok: false, message: "Booking not found." };
  if (found.booking.status === "cancelled") return { ok: false, message: "This booking is already cancelled." };

  const [booking] = await db
    .update(bookings)
    .set({
      status: "cancelled",
      cancelReason: reason?.trim().slice(0, 500) || null,
      cancelledBy: "token" in where ? "invitee" : "host",
      updatedAt: new Date(),
    })
    .where(and(eq(bookings.id, found.booking.id), eq(bookings.status, found.booking.status)))
    .returning();
  if (!booking) return { ok: false, message: "This booking was just changed. Please reload." };
  return { ok: true, ctx: { booking, eventType: found.eventType, host: found.host } };
}
