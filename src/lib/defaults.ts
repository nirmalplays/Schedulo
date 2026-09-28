import type { DB, Tx } from "@/db";
import { eventTypes, schedules, type WeeklyRules } from "@/db/schema";
import { EVENT_COLORS } from "./colors";

const workday = [{ start: "10:00", end: "18:00" }];

export const DEFAULT_WEEKLY_RULES: WeeklyRules = {
  mon: workday, tue: workday, wed: workday, thu: workday, fri: workday, sat: [], sun: [],
};

/** Onboarding defaults: a Mon–Fri 10:00–18:00 schedule and a 30-min Google Meet event. */
export async function createHostDefaults(ex: DB | Tx, userId: string, timezone: string) {
  await ex.insert(schedules).values({
    userId,
    name: "Working hours",
    timezone,
    weeklyRules: DEFAULT_WEEKLY_RULES,
    isDefault: true,
  });
  await ex.insert(eventTypes).values({
    userId,
    slug: "30min",
    title: "30-min Meeting",
    durationMin: 30,
    color: EVENT_COLORS[0],
    location: { type: "google_meet" },
  });
}
