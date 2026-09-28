"use server";

import { after } from "next/server";
import { cancelBooking, createBooking, rescheduleBooking, type BookingInput } from "@/lib/bookings";
import { syncBookingCancelled, syncBookingCreated, syncBookingRescheduled } from "@/lib/google/calendar";
import { dispatchEvent } from "@/lib/integrations/webhooks";
import { notifyBookingCancelled, notifyBookingCreated, notifyBookingRescheduled } from "@/lib/notifications";

export type ActionResult =
  | { ok: true; token: string }
  | { ok: false; error: "slot_taken"; alternatives: string[] }
  | { ok: false; error: "invalid"; message: string };

const logFailure = (what: string) => (err: unknown) => console.error(`[notify] ${what} failed`, err);

export async function createBookingAction(input: BookingInput): Promise<ActionResult> {
  const res = await createBooking(input);
  if (!res.ok) return res;
  // Create the calendar event first so the confirmation page and emails carry the Meet link.
  // Failures are logged, never fail the booking.
  const ctx = await syncBookingCreated(res.ctx);
  after(async () => {
    await Promise.all([notifyBookingCreated(ctx).catch(logFailure("booking created")), dispatchEvent("invitee.created", ctx)]);
  });
  return { ok: true, token: ctx.booking.cancelToken };
}

export async function rescheduleAction(token: string, start: string): Promise<ActionResult> {
  const res = await rescheduleBooking(token, start);
  if (!res.ok) return res;
  const { ctx, previousStart } = res;
  after(async () => {
    await syncBookingRescheduled(ctx);
    await Promise.all([
      notifyBookingRescheduled(ctx, previousStart!).catch(logFailure("booking rescheduled")),
      dispatchEvent("invitee.rescheduled", ctx, { old_start_time: previousStart!.toISOString() }),
    ]);
  });
  return { ok: true, token: ctx.booking.cancelToken };
}

export async function cancelByTokenAction(token: string, reason: string) {
  const res = await cancelBooking({ token }, reason);
  if (!res.ok) return res;
  after(async () => {
    await syncBookingCancelled(res.ctx);
    await Promise.all([notifyBookingCancelled(res.ctx).catch(logFailure("booking cancelled")), dispatchEvent("invitee.canceled", res.ctx)]);
  });
  return { ok: true as const };
}
