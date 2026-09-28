import { NextResponse } from "next/server";
import { apiError, withApiAuth } from "@/lib/integrations/api-auth";
import { findHostBooking } from "@/lib/integrations/api-bookings";
import { serializeScheduledEvent } from "@/lib/integrations/serialize";

export const GET = withApiAuth(async (_req, user, ctx: RouteContext<"/api/v1/scheduled_events/[id]">) => {
  const { id } = await ctx.params;
  const row = await findHostBooking(user.id, id);
  if (!row) return apiError(404, "Resource Not Found", "Scheduled event not found.");
  return NextResponse.json({ resource: serializeScheduledEvent(row.booking, row.eventType) });
});
