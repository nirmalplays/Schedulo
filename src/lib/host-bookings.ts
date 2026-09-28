import { and, asc, desc, eq, gte, ilike, lt, or, sql } from "drizzle-orm";
import { db } from "@/db";
import { bookings, eventTypes } from "@/db/schema";

export type BookingTab = "upcoming" | "past" | "cancelled";
export const parseTab = (v: unknown): BookingTab => (v === "past" || v === "cancelled" ? v : "upcoming");

export async function listHostBookings(hostId: string, tab: BookingTab, q?: string, limit = 200) {
  const now = new Date();
  const search = q?.trim()
    ? or(ilike(bookings.inviteeName, `%${escapeLike(q.trim())}%`), ilike(bookings.inviteeEmail, `%${escapeLike(q.trim())}%`))
    : undefined;

  const filter =
    tab === "cancelled"
      ? eq(bookings.status, "cancelled")
      : and(eq(bookings.status, "confirmed"), tab === "upcoming" ? gte(bookings.endUtc, now) : lt(bookings.endUtc, now));

  return db
    .select({ booking: bookings, eventTitle: eventTypes.title, eventColor: eventTypes.color })
    .from(bookings)
    .innerJoin(eventTypes, eq(eventTypes.id, bookings.eventTypeId))
    .where(and(eq(bookings.hostId, hostId), filter, search))
    .orderBy(tab === "upcoming" ? asc(bookings.startUtc) : desc(bookings.startUtc))
    .limit(limit);
}

/** Counts per tab, in one query. */
export async function countHostBookings(hostId: string): Promise<Record<BookingTab, number>> {
  // Raw SQL params aren't mapped by column type, so send an ISO string and cast it.
  const now = sql`${new Date().toISOString()}::timestamptz`;
  const [row] = await db
    .select({
      upcoming: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed' and ${bookings.endUtc} >= ${now})`.mapWith(Number),
      past: sql<number>`count(*) filter (where ${bookings.status} = 'confirmed' and ${bookings.endUtc} < ${now})`.mapWith(Number),
      cancelled: sql<number>`count(*) filter (where ${bookings.status} = 'cancelled')`.mapWith(Number),
    })
    .from(bookings)
    .where(eq(bookings.hostId, hostId));
  return row ?? { upcoming: 0, past: 0, cancelled: 0 };
}

const escapeLike = (s: string) => s.replace(/[\\%_]/g, (c) => `\\${c}`);
