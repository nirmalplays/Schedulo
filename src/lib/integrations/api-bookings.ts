import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, eventTypes } from "@/db/schema";

/** A booking of this host, or null (never leaks other hosts' bookings). */
export async function findHostBooking(hostId: string, id: string) {
  const [row] = await db
    .select({ booking: bookings, eventType: eventTypes })
    .from(bookings)
    .innerJoin(eventTypes, eq(eventTypes.id, bookings.eventTypeId))
    .where(and(eq(bookings.id, id), eq(bookings.hostId, hostId)))
    .limit(1);
  return row ?? null;
}
