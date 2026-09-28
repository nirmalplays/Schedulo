import { NextResponse } from "next/server";
import { apiError, withApiAuth } from "@/lib/integrations/api-auth";
import { findHostBooking } from "@/lib/integrations/api-bookings";
import { serializeInvitee } from "@/lib/integrations/serialize";

/** One-on-one events have exactly one invitee. */
export const GET = withApiAuth(async (_req, user, ctx: RouteContext<"/api/v1/scheduled_events/[id]/invitees">) => {
  const { id } = await ctx.params;
  const row = await findHostBooking(user.id, id);
  if (!row) return apiError(404, "Resource Not Found", "Scheduled event not found.");
  return NextResponse.json({ collection: [serializeInvitee(row.booking)], pagination: { count: 1, next_page_token: null } });
});
