import { DateTime } from "luxon";
import { beforeAll, describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => import("@/test/test-db").then((m) => m.createTestDbModule()));

let mod: {
  db: typeof import("@/db").db;
  schema: typeof import("@/db/schema");
  bookings: typeof import("./bookings");
  slots: typeof import("./slots");
};
let eventType: import("@/db/schema").EventType;
let longEventType: import("@/db/schema").EventType;

/** Next weekday at 11:00 IST, at least 2 days out (clear of min notice). */
function nextWeekdayAt(hour: number) {
  let d = DateTime.now().setZone("Asia/Kolkata").plus({ days: 2 }).startOf("day");
  while (d.weekday > 5) d = d.plus({ days: 1 });
  return d.set({ hour }).toUTC();
}

const invitee = (start: string, i = 0) => ({
  eventTypeId: eventType.id,
  start,
  name: `Invitee ${i}`,
  email: `invitee${i}@example.com`,
  timezone: "Europe/London",
});

beforeAll(async () => {
  const { setupHost } = await import("@/test/test-db");
  const { db, host, eventType: et } = await setupHost();
  const schema = await import("@/db/schema");
  eventType = et;
  [longEventType] = await db
    .insert(schema.eventTypes)
    .values({ userId: host.id, slug: "long", title: "Long", durationMin: 60, location: { type: "phone" } })
    .returning();

  mod = { db, schema, bookings: await import("./bookings"), slots: await import("./slots") };
}, 60_000);

describe("booking integrity", () => {
  it("books an available slot and removes it from availability", async () => {
    const start = nextWeekdayAt(11);
    const res = await mod.bookings.createBooking(invitee(start.toISO()!));
    expect(res.ok).toBe(true);
    expect(await mod.slots.isSlotAvailable(eventType, start.toJSDate())).toBe(false);
  });

  it("lets exactly one of many concurrent requests win the same slot", async () => {
    const start = nextWeekdayAt(12).toISO()!;
    const results = await Promise.all(Array.from({ length: 8 }, (_, i) => mod.bookings.createBooking(invitee(start, i))));
    const winners = results.filter((r) => r.ok);
    const losers = results.filter((r) => !r.ok && r.error === "slot_taken");
    expect(winners).toHaveLength(1);
    expect(losers).toHaveLength(7);
    // Losers are offered the next free slots.
    const alt = losers[0] as { alternatives: string[] };
    expect(alt.alternatives.length).toBe(3);
    expect(alt.alternatives).not.toContain(new Date(start).toISOString());
  });

  it("rejects an overlapping booking with a different start and duration", async () => {
    // 30-min booking at 14:30; a 60-min booking at 14:00 would overlap it.
    const a = await mod.bookings.createBooking(invitee(nextWeekdayAt(14).plus({ minutes: 30 }).toISO()!, 20));
    expect(a.ok).toBe(true);
    const b = await mod.bookings.createBooking({ ...invitee(nextWeekdayAt(14).toISO()!, 21), eventTypeId: longEventType.id });
    expect(b.ok).toBe(false);
  });

  it("database constraint blocks overlaps even if app checks are bypassed", async () => {
    const { db, schema } = mod;
    const [host] = await db.select().from(schema.users);
    const s = nextWeekdayAt(16).toJSDate();
    const row = {
      eventTypeId: eventType.id,
      hostId: host.id,
      startUtc: s,
      endUtc: new Date(s.getTime() + 30 * 60_000),
      status: "confirmed" as const,
      inviteeName: "X",
      inviteeEmail: "x@example.com",
      inviteeTimezone: "UTC",
      location: eventType.location,
    };
    await db.insert(schema.bookings).values(row);
    await expect(
      db.insert(schema.bookings).values({ ...row, startUtc: new Date(s.getTime() + 15 * 60_000), endUtc: new Date(s.getTime() + 45 * 60_000) }),
    ).rejects.toThrow();
    // Cancelled bookings don't count.
    await db.insert(schema.bookings).values({ ...row, status: "cancelled" });
  });

  it("rejects slots outside availability", async () => {
    const res = await mod.bookings.createBooking(invitee(nextWeekdayAt(3).toISO()!, 30));
    expect(res.ok).toBe(false);
  });

  it("reschedules keeping the booking id and frees the old slot", async () => {
    const oldStart = nextWeekdayAt(17);
    const created = await mod.bookings.createBooking(invitee(oldStart.toISO()!, 40));
    if (!created.ok) throw new Error("setup failed");
    const newStart = oldStart.plus({ days: 7 });
    const res = await mod.bookings.rescheduleBooking(created.ctx.booking.cancelToken, newStart.toISO()!);
    if (!res.ok) throw new Error(JSON.stringify(res));
    expect(res.ctx.booking.id).toBe(created.ctx.booking.id);
    expect(res.ctx.booking.rescheduleCount).toBe(1);
    expect(await mod.slots.isSlotAvailable(eventType, oldStart.toJSDate())).toBe(true);
  });

  it("cancel via token frees the slot and can't be repeated", async () => {
    const start = nextWeekdayAt(13);
    const created = await mod.bookings.createBooking(invitee(start.toISO()!, 50));
    if (!created.ok) throw new Error("setup failed");
    const res = await mod.bookings.cancelBooking({ token: created.ctx.booking.cancelToken }, "Conflict");
    expect(res.ok).toBe(true);
    expect(await mod.slots.isSlotAvailable(eventType, start.toJSDate())).toBe(true);
    const again = await mod.bookings.cancelBooking({ token: created.ctx.booking.cancelToken }, "");
    expect(again.ok).toBe(false);
  });

  it("validates required questions", async () => {
    const { db, schema } = mod;
    await db.insert(schema.bookingQuestions).values({ eventTypeId: longEventType.id, label: "Company", type: "text", required: true });
    const res = await mod.bookings.createBooking({ ...invitee(nextWeekdayAt(10).toISO()!, 60), eventTypeId: longEventType.id });
    expect(res).toMatchObject({ ok: false, error: "invalid" });
  });

  it("every public table has row-level security enabled (Supabase Data API)", async () => {
    const { sql } = await import("drizzle-orm");
    const res = await mod.db.execute(
      sql`select relname from pg_class where relnamespace = 'public'::regnamespace and relkind = 'r' and not relrowsecurity`,
    );
    const rows = (Array.isArray(res) ? res : (res as unknown as { rows: unknown[] }).rows) as { relname: string }[];
    expect(rows.map((r) => r.relname)).toEqual([]);
  });
});
