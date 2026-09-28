import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { eventTypes } from "@/db/schema";
import { getBookingByToken } from "@/lib/bookings";
import { CalendarUnavailableError } from "@/lib/google/calendar";
import { getAvailableSlots } from "@/lib/slots";

const MAX_RANGE_MS = 45 * 24 * 60 * 60 * 1000;

/** GET /api/slots?eventTypeId=&start=ISO&end=ISO[&reschedule=token] -> { slots: ISO[] } */
export async function GET(req: NextRequest) {
  const p = req.nextUrl.searchParams;
  const eventTypeId = p.get("eventTypeId");
  const start = new Date(p.get("start") ?? "");
  const end = new Date(p.get("end") ?? "");
  if (!eventTypeId || isNaN(+start) || isNaN(+end) || end <= start || +end - +start > MAX_RANGE_MS) {
    return NextResponse.json({ error: "Invalid range" }, { status: 400 });
  }

  const [eventType] = await db
    .select()
    .from(eventTypes)
    .where(and(eq(eventTypes.id, eventTypeId), eq(eventTypes.isActive, true)))
    .limit(1);
  if (!eventType) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // When rescheduling, the booking's own current slot shouldn't block itself.
  let excludeBookingId: string | undefined;
  const token = p.get("reschedule");
  if (token) {
    const found = await getBookingByToken(token);
    if (found?.booking.eventTypeId === eventType.id) excludeBookingId = found.booking.id;
  }

  let slots: Date[];
  try {
    slots = await getAvailableSlots(eventType, start, end, { excludeBookingId });
  } catch (err) {
    if (err instanceof CalendarUnavailableError) {
      return NextResponse.json({ error: "Calendar temporarily unavailable" }, { status: 503 });
    }
    throw err;
  }
  return NextResponse.json(
    { slots: slots.map((s) => s.toISOString()) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
