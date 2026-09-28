import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { DateTime } from "luxon";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { EventType, User } from "@/db/schema";

vi.mock("@/db", () => import("@/test/test-db").then((m) => m.createTestDbModule()));
vi.stubEnv("TOKEN_ENCRYPTION_KEY", randomBytes(32).toString("base64"));
vi.stubEnv("GOOGLE_CLIENT_ID", "client-id");
vi.stubEnv("GOOGLE_CLIENT_SECRET", "client-secret");
vi.spyOn(console, "log").mockImplementation(() => {}); // dev-mode emails
vi.spyOn(console, "error").mockImplementation(() => {});

// ---- fake Google ----------------------------------------------------------
type Call = { method: string; url: string; body: unknown };
const google = {
  calls: [] as Call[],
  busy: [] as { start: string; end: string }[],
  tokenError: false,
  freeBusyStatus: 200,
};
vi.stubGlobal(
  "fetch",
  vi.fn(async (input: string | URL, init: RequestInit = {}) => {
    const url = String(input);
    const method = init.method ?? "GET";
    const body = typeof init.body === "string" && init.body.startsWith("{") ? JSON.parse(init.body) : init.body;
    google.calls.push({ method, url, body });
    const json = (status: number, data: unknown) => new Response(JSON.stringify(data), { status });
    if (url.startsWith("https://oauth2.googleapis.com/token")) {
      return google.tokenError
        ? json(400, { error: "invalid_grant", error_description: "Token has been expired or revoked." })
        : json(200, { access_token: "fresh-access-token", expires_in: 3600 });
    }
    if (url.endsWith("/freeBusy")) {
      if (google.freeBusyStatus !== 200) return json(google.freeBusyStatus, { error: { message: "Backend Error" } });
      return json(200, { calendars: { primary: { busy: google.busy } } });
    }
    if (method === "POST" && url.includes("/events?")) {
      return json(200, { id: "evt_123", hangoutLink: "https://meet.google.com/abc-defg-hij" });
    }
    if (method === "PATCH") return json(200, { id: "evt_123" });
    if (method === "DELETE") return new Response(null, { status: 204 });
    return json(404, { error: { message: `unmocked ${method} ${url}` } });
  }),
);

// ---------------------------------------------------------------------------

let host: User;
let eventType: EventType;
let mod: {
  db: typeof import("@/db").db;
  schema: typeof import("@/db/schema");
  cal: typeof import("./calendar");
  slots: typeof import("../slots");
  bookings: typeof import("../bookings");
};

/** A weekday at least 2 days out, at `hour`:`minute` IST. */
const day = (() => {
  let d = DateTime.now().setZone("Asia/Kolkata").plus({ days: 2 }).startOf("day");
  while (d.weekday > 5) d = d.plus({ days: 1 });
  return d;
})();
const at = (hour: number, minute = 0) => day.set({ hour, minute }).toJSDate();

const invitee = (start: Date, i: number) => ({
  eventTypeId: eventType.id,
  start: start.toISOString(),
  name: `Invitee ${i}`,
  email: `invitee${i}@example.com`,
  timezone: "Asia/Kolkata",
});

async function connection() {
  const [c] = await mod.db.select().from(mod.schema.calendarConnections).where(eq(mod.schema.calendarConnections.userId, host.id));
  return c;
}

beforeAll(async () => {
  const { setupHost } = await import("@/test/test-db");
  ({ host, eventType } = await setupHost());
  mod = {
    db: (await import("@/db")).db,
    schema: await import("@/db/schema"),
    cal: await import("./calendar"),
    slots: await import("../slots"),
    bookings: await import("../bookings"),
  };
  await mod.cal.saveGoogleConnection({
    userId: host.id,
    providerAccountId: "google-sub-1",
    email: "host@gmail.com",
    accessToken: "initial-access-token",
    refreshToken: "initial-refresh-token",
    expiresAt: Math.floor(Date.now() / 1000) + 3600,
    scope: "openid email",
  });
}, 60_000);

beforeEach(() => {
  google.calls = [];
  google.busy = [];
  google.tokenError = false;
  google.freeBusyStatus = 200;
  mod?.cal.invalidateBusyCache(host.id);
});

describe("Google Calendar sync", () => {
  it("stores tokens encrypted, never in plaintext", async () => {
    const c = await connection();
    expect(c.refreshTokenEnc).toBeTruthy();
    expect(c.refreshTokenEnc).not.toContain("initial-refresh-token");
    expect(c.accessTokenEnc).not.toContain("initial-access-token");
    const { decrypt } = await import("../crypto");
    expect(decrypt(c.refreshTokenEnc!)).toBe("initial-refresh-token");
  });

  it("calendar busy times remove slots", async () => {
    google.busy = [{ start: at(11).toISOString(), end: at(12).toISOString() }];
    const slots = (await mod.slots.getAvailableSlots(eventType, at(10), at(13))).map((d) => d.getTime());
    expect(slots).toContain(at(10).getTime());
    expect(slots).toContain(at(10, 30).getTime());
    expect(slots).not.toContain(at(11).getTime());
    expect(slots).not.toContain(at(11, 30).getTime());
    expect(slots).toContain(at(12).getTime());
    const fb = google.calls.find((c) => c.url.endsWith("/freeBusy"))!;
    expect(fb.body).toMatchObject({ items: [{ id: "primary" }] });
  });

  it("re-checks the calendar live on submit, bypassing the cache", async () => {
    await mod.slots.getAvailableSlots(eventType, at(10), at(18)); // warms the cache: free
    google.busy = [{ start: at(15).toISOString(), end: at(15, 30).toISOString() }]; // host adds an event
    const res = await mod.bookings.createBooking(invitee(at(15), 1));
    expect(res).toMatchObject({ ok: false, error: "slot_taken" });
  });

  it("creates the event with a Meet link and the booking id", async () => {
    const res = await mod.bookings.createBooking(invitee(at(14), 2));
    if (!res.ok) throw new Error(JSON.stringify(res));
    const ctx = await mod.cal.syncBookingCreated(res.ctx);
    expect(ctx.booking.meetLink).toBe("https://meet.google.com/abc-defg-hij");
    expect(ctx.booking.externalEventId).toBe("evt_123");

    const insert = google.calls.find((c) => c.method === "POST" && c.url.includes("/events?"))!;
    expect(insert.url).toContain("/calendars/primary/events");
    expect(insert.url).toContain("sendUpdates=none");
    expect(insert.url).toContain("conferenceDataVersion=1");
    expect(insert.body).toMatchObject({
      attendees: [{ email: "invitee2@example.com" }],
      extendedProperties: { private: { bookingId: res.ctx.booking.id } },
      conferenceData: { createRequest: { conferenceSolutionKey: { type: "hangoutsMeet" } } },
    });
  });

  it("rescheduling into an overlap with its own calendar event works, and patches the event", async () => {
    await mod.db.update(mod.schema.eventTypes).set({ slotIntervalMin: 15 }).where(eq(mod.schema.eventTypes.id, eventType.id));
    eventType = { ...eventType, slotIntervalMin: 15 };
    const created = await mod.bookings.createBooking(invitee(at(16), 3));
    if (!created.ok) throw new Error(JSON.stringify(created));
    const synced = await mod.cal.syncBookingCreated(created.ctx);
    // Google now reports the booking's own event as busy.
    google.busy = [{ start: at(16).toISOString(), end: at(16, 30).toISOString() }];

    const res = await mod.bookings.rescheduleBooking(synced.booking.cancelToken, at(16, 15).toISOString());
    if (!res.ok) throw new Error(JSON.stringify(res));
    await mod.cal.syncBookingRescheduled(res.ctx);
    const patch = google.calls.find((c) => c.method === "PATCH")!;
    expect(patch.url).toContain("/events/evt_123");
    expect(patch.body).toMatchObject({ start: { dateTime: at(16, 15).toISOString() } });
  });

  it("deletes the event when a booking is cancelled", async () => {
    const created = await mod.bookings.createBooking(invitee(at(17), 4));
    if (!created.ok) throw new Error(JSON.stringify(created));
    await mod.cal.syncBookingCreated(created.ctx);
    const res = await mod.bookings.cancelBooking({ token: created.ctx.booking.cancelToken }, "");
    if (!res.ok) throw new Error(res.message);
    await mod.cal.syncBookingCancelled(res.ctx);
    expect(google.calls.some((c) => c.method === "DELETE" && c.url.includes("/events/evt_123"))).toBe(true);
  });

  it("fails closed when Google errors, instead of showing the host as free", async () => {
    google.freeBusyStatus = 503;
    await expect(mod.slots.getAvailableSlots(eventType, at(10), at(18))).rejects.toBeInstanceOf(mod.cal.CalendarUnavailableError);
    const res = await mod.bookings.createBooking(invitee(at(10), 5));
    expect(res).toMatchObject({ ok: false, error: "invalid" });
  });

  it("a revoked grant pauses the booking page and marks the connection", async () => {
    await mod.db
      .update(mod.schema.calendarConnections)
      .set({ accessTokenExpiresAt: new Date(Date.now() - 1000) })
      .where(eq(mod.schema.calendarConnections.userId, host.id));
    google.tokenError = true;

    expect(await mod.slots.getAvailableSlots(eventType, at(10), at(18))).toEqual([]);
    const c = await connection();
    expect(c.status).toBe("revoked");
    // Reconnecting restores it.
    await mod.cal.saveGoogleConnection({ userId: host.id, providerAccountId: "google-sub-1", accessToken: "a", expiresAt: Math.floor(Date.now() / 1000) + 3600 });
    google.tokenError = false;
    expect((await connection()).status).toBe("active");
    expect((await mod.slots.getAvailableSlots(eventType, at(10), at(18))).length).toBeGreaterThan(0);
  });
});

describe("subtractInterval", () => {
  it("cuts a range out of busy blocks, keeping merged neighbours", async () => {
    const { subtractInterval } = await import("./calendar");
    const d = (h: number) => new Date(Date.UTC(2026, 0, 1, h));
    const res = subtractInterval([{ start: d(9), end: d(12) }, { start: d(14), end: d(15) }], { start: d(10), end: d(11) });
    expect(res).toEqual([
      { start: d(9), end: d(10) },
      { start: d(11), end: d(12) },
      { start: d(14), end: d(15) },
    ]);
  });
});

describe("crypto", () => {
  it("round-trips and rejects tampering", async () => {
    const { encrypt, decrypt } = await import("../crypto");
    const enc = encrypt("secret-token");
    expect(enc).not.toContain("secret-token");
    expect(decrypt(enc)).toBe("secret-token");
    expect(encrypt("secret-token")).not.toBe(enc); // random IV
    const parts = enc.split(".");
    parts[3] = Buffer.from("tampered").toString("base64url");
    expect(() => decrypt(parts.join("."))).toThrow();
  });
});
