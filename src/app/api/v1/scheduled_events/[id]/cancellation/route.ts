import { after, NextResponse } from "next/server";
import { cancelBooking } from "@/lib/bookings";
import { syncBookingCancelled } from "@/lib/google/calendar";
import { apiError, withApiAuth } from "@/lib/integrations/api-auth";
import { dispatchEvent } from "@/lib/integrations/webhooks";
import { notifyBookingCancelled } from "@/lib/notifications";

/** POST /api/v1/scheduled_events/{id}/cancellation  { "reason": "..." } — cancels as the host. */
export const POST = withApiAuth(async (req, user, ctx: RouteContext<"/api/v1/scheduled_events/[id]/cancellation">) => {
  const { id } = await ctx.params;
  const body = (await req.json().catch(() => ({}))) as { reason?: unknown };
  const reason = typeof body.reason === "string" ? body.reason.slice(0, 500) : undefined;

  const res = await cancelBooking({ id, hostId: user.id }, reason);
  if (!res.ok) {
    return res.message === "Booking not found." ? apiError(404, "Resource Not Found", res.message) : apiError(403, "Permission Denied", res.message);
  }
  after(async () => {
    await syncBookingCancelled(res.ctx);
    await Promise.all([
      notifyBookingCancelled(res.ctx).catch((e) => console.error("[api] cancel email failed", e)),
      dispatchEvent("invitee.canceled", res.ctx),
    ]);
  });
  return NextResponse.json(
    { resource: { canceled_by: user.name ?? user.username, reason: res.ctx.booking.cancelReason, canceler_type: "host", created_at: new Date().toISOString() } },
    { status: 201 },
  );
});
