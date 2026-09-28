import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventTypes } from "@/db/schema";
import { appUrl } from "@/lib/email";
import { CalendarUnavailableError } from "@/lib/google/calendar";
import { apiError, withApiAuth } from "@/lib/integrations/api-auth";
import { getAvailableSlots } from "@/lib/slots";

const MAX_RANGE_MS = 7 * 24 * 60 * 60 * 1000;

/** GET /api/v1/event_types/{id}/available_times?start_time=ISO&end_time=ISO (max 7 days, like Calendly) */
export const GET = withApiAuth(async (req, user, ctx: RouteContext<"/api/v1/event_types/[id]/available_times">) => {
  const { id } = await ctx.params;
  const p = new URL(req.url).searchParams;
  const start = new Date(p.get("start_time") ?? "");
  const end = new Date(p.get("end_time") ?? "");
  if (isNaN(+start) || isNaN(+end) || end <= start) return apiError(400, "Invalid Argument", "start_time and end_time must be ISO 8601 and end > start.");
  if (+end - +start > MAX_RANGE_MS) return apiError(400, "Invalid Argument", "The range can be at most 7 days.");

  const [eventType] = await db.select().from(eventTypes).where(and(eq(eventTypes.id, id), eq(eventTypes.userId, user.id))).limit(1);
  if (!eventType) return apiError(404, "Resource Not Found", "Event type not found.");

  try {
    const slots = await getAvailableSlots(eventType, start, end);
    return NextResponse.json({
      collection: slots.map((s) => ({
        status: "available",
        start_time: s.toISOString(),
        invitees_remaining: 1,
        scheduling_url: `${appUrl()}/${user.username}/${eventType.slug}?month=${s.toISOString().slice(0, 7)}&date=${s.toISOString().slice(0, 10)}`,
      })),
    });
  } catch (err) {
    if (err instanceof CalendarUnavailableError) return apiError(503, "Service Unavailable", "The host's calendar couldn't be read. Try again shortly.");
    throw err;
  }
});
