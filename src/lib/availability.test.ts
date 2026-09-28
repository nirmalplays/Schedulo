import { describe, expect, it } from "vitest";
import type { WeeklyRules } from "@/db/schema";
import { computeSlots, type AvailabilityInput } from "./availability";

const nineToFive = [{ start: "09:00", end: "17:00" }];
const everyDay = (intervals = nineToFive): WeeklyRules => ({
  mon: intervals, tue: intervals, wed: intervals, thu: intervals,
  fri: intervals, sat: intervals, sun: intervals,
});

const baseEvent: AvailabilityInput["eventType"] = {
  durationMin: 30,
  bufferBeforeMin: 0,
  bufferAfterMin: 0,
  minNoticeMin: 0,
  windowDays: 365,
};

function slots(overrides: Partial<AvailabilityInput> & { timezone?: string; weeklyRules?: WeeklyRules }) {
  const { timezone = "UTC", weeklyRules = everyDay(), ...rest } = overrides;
  return computeSlots({
    schedule: { timezone, weeklyRules, overrides: {} },
    eventType: baseEvent,
    busy: [],
    now: new Date("2026-01-01T00:00:00Z"),
    rangeStart: new Date("2026-01-01T00:00:00Z"),
    rangeEnd: new Date("2027-01-01T00:00:00Z"),
    ...rest,
  }).map((d) => d.toISOString());
}

const iso = (s: string) => new Date(s).toISOString();

describe("timezones and DST", () => {
  it("IST (no DST, +05:30): Mon 10:00-18:00", () => {
    const res = slots({
      timezone: "Asia/Kolkata",
      weeklyRules: { ...everyDay([]), mon: [{ start: "10:00", end: "18:00" }] },
      rangeStart: new Date("2026-10-05T00:00:00+05:30"),
      rangeEnd: new Date("2026-10-06T00:00:00+05:30"),
    });
    expect(res).toHaveLength(16);
    expect(res[0]).toBe(iso("2026-10-05T04:30:00Z"));
    expect(res.at(-1)).toBe(iso("2026-10-05T12:00:00Z"));
  });

  it("US spring forward (America/New_York, 2026-03-08)", () => {
    const res = slots({
      timezone: "America/New_York",
      rangeStart: new Date("2026-03-07T00:00:00Z"),
      rangeEnd: new Date("2026-03-09T12:00:00Z"),
    });
    expect(res).toContain(iso("2026-03-07T14:00:00Z")); // 09:00 EST
    expect(res).toContain(iso("2026-03-08T13:00:00Z")); // 09:00 EDT
    const sunday = res.filter((s) => s.startsWith("2026-03-08"));
    expect(sunday).toHaveLength(16);
    expect(sunday.at(-1)).toBe(iso("2026-03-08T20:30:00Z")); // 16:30 EDT
  });

  it("US spring forward inside working hours skips the missing hour", () => {
    const res = slots({
      timezone: "America/New_York",
      weeklyRules: everyDay([{ start: "00:00", end: "04:00" }]),
      eventType: { ...baseEvent, durationMin: 60 },
      rangeStart: new Date("2026-03-08T05:00:00Z"),
      rangeEnd: new Date("2026-03-08T09:00:00Z"),
    });
    // 00:00 EST, 01:00 EST, 03:00 EDT — 02:00 local does not exist.
    expect(res).toEqual([
      iso("2026-03-08T05:00:00Z"),
      iso("2026-03-08T06:00:00Z"),
      iso("2026-03-08T07:00:00Z"),
    ]);
  });

  it("US fall back (2026-11-01)", () => {
    const res = slots({
      timezone: "America/New_York",
      rangeStart: new Date("2026-10-31T00:00:00Z"),
      rangeEnd: new Date("2026-11-02T00:00:00Z"),
    });
    expect(res[0]).toBe(iso("2026-10-31T13:00:00Z")); // 09:00 EDT
    expect(res).toContain(iso("2026-11-01T14:00:00Z")); // 09:00 EST
    expect(res.filter((s) => s >= "2026-11-01T14:00" && s < "2026-11-01T22:00")).toHaveLength(16);
  });

  it("UK autumn change (Europe/London, 2026-10-25)", () => {
    const res = slots({
      timezone: "Europe/London",
      rangeStart: new Date("2026-10-24T00:00:00Z"),
      rangeEnd: new Date("2026-10-26T00:00:00Z"),
    });
    expect(res[0]).toBe(iso("2026-10-24T08:00:00Z")); // 09:00 BST
    expect(res).toContain(iso("2026-10-25T09:00:00Z")); // 09:00 GMT
    expect(res).toHaveLength(32);
  });

  it("UK spring change (2026-03-29)", () => {
    const res = slots({
      timezone: "Europe/London",
      rangeStart: new Date("2026-03-28T00:00:00Z"),
      rangeEnd: new Date("2026-03-30T00:00:00Z"),
    });
    expect(res[0]).toBe(iso("2026-03-28T09:00:00Z"));
    expect(res).toContain(iso("2026-03-29T08:00:00Z"));
    expect(res).toHaveLength(32);
  });

  it("AU spring forward (Australia/Sydney, 2026-10-04)", () => {
    const res = slots({
      timezone: "Australia/Sydney",
      rangeStart: new Date("2026-10-02T12:00:00Z"),
      rangeEnd: new Date("2026-10-04T12:00:00Z"),
    });
    expect(res).toContain(iso("2026-10-02T23:00:00Z")); // Sat 3 Oct 09:00 AEST (+10)
    expect(res).toContain(iso("2026-10-03T22:00:00Z")); // Sun 4 Oct 09:00 AEDT (+11)
    expect(res).toHaveLength(32);
  });

  it("AU autumn fall back (2026-04-05)", () => {
    const res = slots({
      timezone: "Australia/Sydney",
      rangeStart: new Date("2026-04-03T12:00:00Z"),
      rangeEnd: new Date("2026-04-05T12:00:00Z"),
    });
    expect(res).toContain(iso("2026-04-03T22:00:00Z")); // Sat 09:00 AEDT
    expect(res).toContain(iso("2026-04-04T23:00:00Z")); // Sun 09:00 AEST
  });
});

describe("rules", () => {
  const day = {
    rangeStart: new Date("2026-06-01T00:00:00Z"),
    rangeEnd: new Date("2026-06-02T00:00:00Z"),
  };

  it("respects minimum notice", () => {
    const res = slots({ ...day, now: new Date("2026-06-01T09:10:00Z"), eventType: { ...baseEvent, minNoticeMin: 240 } });
    expect(res[0]).toBe(iso("2026-06-01T13:30:00Z"));
  });

  it("respects booking window", () => {
    const res = slots({
      now: new Date("2026-06-01T00:00:00Z"),
      rangeStart: new Date("2026-06-01T00:00:00Z"),
      rangeEnd: new Date("2026-07-01T00:00:00Z"),
      eventType: { ...baseEvent, windowDays: 2 },
    });
    expect(res.every((s) => s < "2026-06-03T00:00")).toBe(true);
    expect(res).toHaveLength(32);
  });

  it("excludes busy times including buffers", () => {
    const res = slots({
      ...day,
      busy: [{ start: new Date("2026-06-01T12:00:00Z"), end: new Date("2026-06-01T13:00:00Z") }],
      eventType: { ...baseEvent, bufferBeforeMin: 15, bufferAfterMin: 15 },
    });
    expect(res).not.toContain(iso("2026-06-01T11:30:00Z")); // after-buffer runs into 12:00
    expect(res).not.toContain(iso("2026-06-01T12:00:00Z"));
    expect(res).not.toContain(iso("2026-06-01T13:00:00Z")); // before-buffer runs into 12:45
    expect(res).toContain(iso("2026-06-01T11:00:00Z"));
    expect(res).toContain(iso("2026-06-01T13:30:00Z"));
  });

  it("date override: day off and custom hours", () => {
    const res = computeSlots({
      schedule: {
        timezone: "UTC",
        weeklyRules: everyDay(),
        overrides: { "2026-06-01": [], "2026-06-02": [{ start: "20:00", end: "21:00" }] },
      },
      eventType: baseEvent,
      busy: [],
      now: new Date("2026-01-01T00:00:00Z"),
      rangeStart: new Date("2026-06-01T00:00:00Z"),
      rangeEnd: new Date("2026-06-03T00:00:00Z"),
    }).map((d) => d.toISOString());
    expect(res).toEqual([iso("2026-06-02T20:00:00Z"), iso("2026-06-02T20:30:00Z")]);
  });

  it("daily cap removes a full day", () => {
    const res = slots({
      rangeStart: new Date("2026-06-01T00:00:00Z"),
      rangeEnd: new Date("2026-06-03T00:00:00Z"),
      eventType: { ...baseEvent, dailyCap: 2 },
      bookingsPerDay: { "2026-06-01": 2, "2026-06-02": 1 },
    });
    expect(res.every((s) => s.startsWith("2026-06-02"))).toBe(true);
    expect(res).toHaveLength(16);
  });

  it("slot interval shorter than duration", () => {
    const res = slots({ ...day, eventType: { ...baseEvent, durationMin: 60, slotIntervalMin: 15 } });
    expect(res[0]).toBe(iso("2026-06-01T09:00:00Z"));
    expect(res[1]).toBe(iso("2026-06-01T09:15:00Z"));
    expect(res.at(-1)).toBe(iso("2026-06-01T16:00:00Z"));
    expect(res).toHaveLength(29);
  });

  it("supports intervals ending at 24:00", () => {
    const res = slots({ ...day, weeklyRules: everyDay([{ start: "23:00", end: "24:00" }]) });
    expect(res).toEqual([iso("2026-06-01T23:00:00Z"), iso("2026-06-01T23:30:00Z")]);
  });

  it("only returns slots within the requested range", () => {
    const res = slots({
      rangeStart: new Date("2026-06-01T10:00:00Z"),
      rangeEnd: new Date("2026-06-01T11:00:00Z"),
    });
    expect(res).toEqual([iso("2026-06-01T10:00:00Z"), iso("2026-06-01T10:30:00Z")]);
  });
});
