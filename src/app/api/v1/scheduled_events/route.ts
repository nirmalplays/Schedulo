import { and, asc, desc, eq, gt, gte, lt, lte, or } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { bookings, eventTypes } from "@/db/schema";
import { apiError, decodeCursor, encodeCursor, withApiAuth } from "@/lib/integrations/api-auth";
import { serializeScheduledEvent } from "@/lib/integrations/serialize";

type Cursor = { t: string; id: string };

/**
 * GET /api/v1/scheduled_events
 *   status=active|canceled, min_start_time, max_start_time (ISO), invitee_email,
 *   sort=start_time:asc|start_time:desc, count (1–100, default 20), page_token
 */
export const GET = withApiAuth(async (req, user) => {
  const p = new URL(req.url).searchParams;
  const count = Math.min(Math.max(Number(p.get("count") ?? 20) || 20, 1), 100);
  const desc_ = p.get("sort") === "start_time:desc";
  const status = p.get("status");
  if (status && status !== "active" && status !== "canceled") return apiError(400, "Invalid Argument", "status must be active or canceled.");
  const minStart = p.get("min_start_time") ? new Date(p.get("min_start_time")!) : null;
  const maxStart = p.get("max_start_time") ? new Date(p.get("max_start_time")!) : null;
  if ((minStart && isNaN(+minStart)) || (maxStart && isNaN(+maxStart))) return apiError(400, "Invalid Argument", "Times must be ISO 8601.");
  const cursor = decodeCursor<Cursor>(p.get("page_token"));

  const rows = await db
    .select({ booking: bookings, eventType: eventTypes })
    .from(bookings)
    .innerJoin(eventTypes, eq(eventTypes.id, bookings.eventTypeId))
    .where(
      and(
        eq(bookings.hostId, user.id),
        status === "active" ? eq(bookings.status, "confirmed") : status === "canceled" ? eq(bookings.status, "cancelled") : undefined,
        minStart ? gte(bookings.startUtc, minStart) : undefined,
        maxStart ? lte(bookings.startUtc, maxStart) : undefined,
        p.get("invitee_email") ? eq(bookings.inviteeEmail, p.get("invitee_email")!.toLowerCase()) : undefined,
        // Keyset pagination on (start_utc, id).
        cursor
          ? desc_
            ? or(lt(bookings.startUtc, new Date(cursor.t)), and(eq(bookings.startUtc, new Date(cursor.t)), lt(bookings.id, cursor.id)))
            : or(gt(bookings.startUtc, new Date(cursor.t)), and(eq(bookings.startUtc, new Date(cursor.t)), gt(bookings.id, cursor.id)))
          : undefined,
      ),
    )
    .orderBy(desc_ ? desc(bookings.startUtc) : asc(bookings.startUtc), desc_ ? desc(bookings.id) : asc(bookings.id))
    .limit(count + 1);

  const page = rows.slice(0, count);
  const last = page.at(-1);
  return NextResponse.json({
    collection: page.map((r) => serializeScheduledEvent(r.booking, r.eventType)),
    pagination: {
      count: page.length,
      next_page_token: rows.length > count && last ? encodeCursor({ t: last.booking.startUtc.toISOString(), id: last.booking.id }) : null,
    },
  });
});
