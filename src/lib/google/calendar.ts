import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { bookings, calendarConnections, users, type CalendarConnection } from "@/db/schema";
import type { Busy } from "../availability";
import type { BookingContext } from "../bookings";
import { decrypt, encrypt } from "../crypto";
import { appUrl, sendEmail } from "../email";
import { describeLocation } from "../format";
import {
  GoogleAuthRevokedError,
  deleteEvent,
  freeBusy,
  insertEvent,
  meetLinkOf,
  patchEvent,
  refreshAccessToken,
} from "./api";

/** Busy times couldn't be read: don't offer slots rather than risk a double-booking. */
export class CalendarUnavailableError extends Error {}

// ---------------------------------------------------------------------------
// Connections
// ---------------------------------------------------------------------------

export async function saveGoogleConnection(input: {
  userId: string;
  providerAccountId: string;
  email?: string | null;
  accessToken?: string | null;
  refreshToken?: string | null;
  expiresAt?: number | null; // epoch seconds
  scope?: string | null;
}) {
  const values = {
    accessTokenEnc: input.accessToken ? encrypt(input.accessToken) : null,
    accessTokenExpiresAt: input.expiresAt ? new Date(input.expiresAt * 1000) : null,
    scope: input.scope ?? null,
    email: input.email ?? null,
    status: "active" as const,
    lastError: null,
    updatedAt: new Date(),
  };
  await db
    .insert(calendarConnections)
    .values({
      userId: input.userId,
      provider: "google",
      providerAccountId: input.providerAccountId,
      refreshTokenEnc: input.refreshToken ? encrypt(input.refreshToken) : null,
      ...values,
    })
    .onConflictDoUpdate({
      target: [calendarConnections.userId, calendarConnections.provider, calendarConnections.providerAccountId],
      // Google only returns a refresh token on first consent; keep the stored one otherwise.
      set: input.refreshToken ? { ...values, refreshTokenEnc: encrypt(input.refreshToken) } : values,
    });
  invalidateBusyCache(input.userId);
}

export async function getConnections(userId: string) {
  return db.select().from(calendarConnections).where(eq(calendarConnections.userId, userId));
}

async function markRevoked(conn: CalendarConnection, reason: string) {
  const [changed] = await db
    .update(calendarConnections)
    .set({ status: "revoked", lastError: reason, updatedAt: new Date() })
    .where(and(eq(calendarConnections.id, conn.id), eq(calendarConnections.status, "active")))
    .returning({ id: calendarConnections.id });
  invalidateBusyCache(conn.userId);
  // Email only on the transition, not on every failed request.
  if (changed) {
    const [host] = await db.select().from(users).where(eq(users.id, conn.userId)).limit(1);
    if (host?.email) {
      await sendEmail({
        to: host.email,
        subject: "Action needed: reconnect your Google Calendar",
        text: `We lost access to your Google Calendar (${conn.email ?? "Google account"}), so your booking page is paused to avoid double-bookings.\n\nReconnect: ${appUrl()}/dashboard/calendars`,
        html: `<p>We lost access to your Google Calendar (${conn.email ?? "Google account"}), so your booking page is paused to avoid double-bookings.</p><p><a href="${appUrl()}/dashboard/calendars">Reconnect Google Calendar</a></p>`,
      }).catch((e) => console.error("[calendar] reconnect email failed", e));
    }
  }
}

/** A valid access token, refreshing if it expires within a minute. */
export async function accessTokenFor(conn: CalendarConnection): Promise<string> {
  const fresh = conn.accessTokenExpiresAt && conn.accessTokenExpiresAt.getTime() > Date.now() + 60_000;
  if (conn.accessTokenEnc && fresh) return decrypt(conn.accessTokenEnc);
  if (!conn.refreshTokenEnc) {
    await markRevoked(conn, "No refresh token; reconnect required");
    throw new GoogleAuthRevokedError("No refresh token");
  }
  try {
    const t = await refreshAccessToken(decrypt(conn.refreshTokenEnc));
    await db
      .update(calendarConnections)
      .set({
        accessTokenEnc: encrypt(t.access_token),
        accessTokenExpiresAt: new Date(Date.now() + t.expires_in * 1000),
        updatedAt: new Date(),
      })
      .where(eq(calendarConnections.id, conn.id));
    return t.access_token;
  } catch (err) {
    if (err instanceof GoogleAuthRevokedError) await markRevoked(conn, err.message);
    throw err;
  }
}

// ---------------------------------------------------------------------------
// Busy times
// ---------------------------------------------------------------------------

const CACHE_TTL_MS = 60_000;
const busyCache = new Map<string, { at: number; busy: Busy[] }>();

export function invalidateBusyCache(userId: string) {
  for (const k of busyCache.keys()) if (k.startsWith(`${userId}|`)) busyCache.delete(k);
}

export type CalendarBusy = { busy: Busy[]; paused: boolean };

/**
 * Busy intervals from the host's connected calendars.
 * `paused` = a connection needs reconnecting, so the booking page must not offer slots.
 * Listing uses a short cache; booking submits pass live=true.
 */
export async function getCalendarBusy(
  hostId: string,
  from: Date,
  to: Date,
  opts: { live?: boolean } = {},
): Promise<CalendarBusy> {
  const conns = await getConnections(hostId);
  if (!conns.length) return { busy: [], paused: false };
  if (conns.some((c) => c.status !== "active")) return { busy: [], paused: true };

  const busy: Busy[] = [];
  for (const conn of conns) {
    if (!conn.checkCalendarIds.length) continue;
    const key = `${hostId}|${conn.id}|${from.toISOString()}|${to.toISOString()}|${conn.checkCalendarIds.join(",")}`;
    const hit = busyCache.get(key);
    if (!opts.live && hit && Date.now() - hit.at < CACHE_TTL_MS) {
      busy.push(...hit.busy);
      continue;
    }
    try {
      const token = await accessTokenFor(conn);
      const result = await freeBusy(token, conn.checkCalendarIds, from, to);
      if (busyCache.size > 1000) {
        for (const [k, v] of busyCache) if (Date.now() - v.at >= CACHE_TTL_MS) busyCache.delete(k);
      }
      busyCache.set(key, { at: Date.now(), busy: result });
      busy.push(...result);
    } catch (err) {
      if (err instanceof GoogleAuthRevokedError) return { busy: [], paused: true };
      console.error("[calendar] free/busy failed", err);
      throw new CalendarUnavailableError("Couldn't read the host's calendar");
    }
  }
  return { busy, paused: false };
}

/** Removes `cut` from each busy interval (used to ignore a booking's own event when rescheduling). */
export function subtractInterval(busy: Busy[], cut: Busy): Busy[] {
  const out: Busy[] = [];
  for (const b of busy) {
    if (b.end <= cut.start || b.start >= cut.end) {
      out.push(b);
      continue;
    }
    if (b.start < cut.start) out.push({ start: b.start, end: cut.start });
    if (b.end > cut.end) out.push({ start: cut.end, end: b.end });
  }
  return out;
}

// ---------------------------------------------------------------------------
// Writing bookings to the host's calendar
// ---------------------------------------------------------------------------

async function writableConnection(hostId: string) {
  const conns = await getConnections(hostId);
  return conns.find((c) => c.status === "active") ?? null;
}

/** Creates the Google event (with a Meet link when requested). Never throws. */
export async function syncBookingCreated(ctx: BookingContext): Promise<BookingContext> {
  const { booking, eventType, host } = ctx;
  try {
    const conn = await writableConnection(host.id);
    if (!conn) return ctx;
    const token = await accessTokenFor(conn);
    const event = await insertEvent(token, conn.writeCalendarId, {
      summary: `${eventType.title}: ${booking.inviteeName}`,
      description: [
        `Booked via ${appUrl()}/${host.username}/${eventType.slug}`,
        `Invitee: ${booking.inviteeName} <${booking.inviteeEmail}>`,
        ...booking.answers.filter((a) => a.value).map((a) => `${a.label}: ${a.value}`),
      ].join("\n"),
      location: booking.location.type === "google_meet" ? undefined : describeLocation(booking.location),
      start: booking.startUtc,
      end: booking.endUtc,
      attendees: [{ email: booking.inviteeEmail, displayName: booking.inviteeName }],
      bookingId: booking.id,
      createMeet: booking.location.type === "google_meet",
    });
    const [updated] = await db
      .update(bookings)
      .set({
        externalEventId: event.id,
        externalCalendarId: conn.writeCalendarId,
        calendarConnectionId: conn.id,
        meetLink: meetLinkOf(event),
        updatedAt: new Date(),
      })
      .where(eq(bookings.id, booking.id))
      .returning();
    invalidateBusyCache(host.id);
    return { ...ctx, booking: updated ?? booking };
  } catch (err) {
    console.error("[calendar] create event failed", err);
    return ctx;
  }
}

async function withBookingEvent(ctx: BookingContext, fn: (token: string, calendarId: string, eventId: string) => Promise<unknown>) {
  const { booking } = ctx;
  if (!booking.externalEventId || !booking.calendarConnectionId || !booking.externalCalendarId) return;
  try {
    const [conn] = await db
      .select()
      .from(calendarConnections)
      .where(eq(calendarConnections.id, booking.calendarConnectionId))
      .limit(1);
    if (!conn) return;
    await fn(await accessTokenFor(conn), booking.externalCalendarId, booking.externalEventId);
    invalidateBusyCache(ctx.host.id);
  } catch (err) {
    console.error("[calendar] event sync failed", err);
  }
}

export const syncBookingRescheduled = (ctx: BookingContext) =>
  withBookingEvent(ctx, (token, cal, id) => patchEvent(token, cal, id, { start: ctx.booking.startUtc, end: ctx.booking.endUtc }));

export const syncBookingCancelled = (ctx: BookingContext) => withBookingEvent(ctx, (token, cal, id) => deleteEvent(token, cal, id));
