import { and, asc, eq, gte } from "drizzle-orm";
import { DateTime } from "luxon";
import Link from "next/link";
import { Card, CardHeader, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { dateOverrides, eventTypes, schedules } from "@/db/schema";
import { requireHost } from "@/lib/session";
import { OverridesCard, type OverrideRow } from "./overrides";
import { WeeklyHoursForm } from "./weekly-hours";

export const metadata = { title: "Availability" };


function notice(min: number) {
  if (min === 0) return "No minimum";
  if (min % (24 * 60) === 0) return `${min / (24 * 60)} day${min === 1440 ? "" : "s"}`;
  if (min % 60 === 0) return `${min / 60} hour${min === 60 ? "" : "s"}`;
  return `${min} min`;
}

export default async function AvailabilityPage() {
  const host = await requireHost();
  const [schedule] = await db
    .select()
    .from(schedules)
    .where(and(eq(schedules.userId, host.id), eq(schedules.isDefault, true)))
    .limit(1);
  if (!schedule) return <p>No schedule found.</p>;

  const today = DateTime.now().setZone(schedule.timezone).toISODate()!;
  const [overrides, types] = await Promise.all([
    db
      .select()
      .from(dateOverrides)
      .where(and(eq(dateOverrides.scheduleId, schedule.id), gte(dateOverrides.date, today)))
      .orderBy(asc(dateOverrides.date)),
    db
      .select()
      .from(eventTypes)
      .where(and(eq(eventTypes.userId, host.id), eq(eventTypes.isActive, true)))
      .orderBy(asc(eventTypes.createdAt)),
  ]);

  const rows: OverrideRow[] = overrides.map((o) => {
    const d = DateTime.fromISO(o.date);
    return {
      id: o.id,
      mon: d.toFormat("LLL").toUpperCase(),
      day: d.toFormat("d"),
      title: o.label || d.toFormat("cccc"),
      hours: o.intervals.length ? o.intervals.map((i) => `${i.start} – ${i.end}`).join(", ") : "Unavailable all day",
    };
  });

  return (
    <>
      <PageHeader title="Availability" description="When people can book you. Connected calendars also block busy times." />
      <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,380px),1fr))] items-start gap-4">
        <WeeklyHoursForm timezone={schedule.timezone} weeklyRules={schedule.weeklyRules} />
        <div className="flex flex-col gap-4">
          <OverridesCard minDate={today} overrides={rows} />
          <Card>
            <CardHeader title="Scheduling rules" description="Set per event type. Edit an event type to change them." />
            <ul>
              {types.map((t) => (
                <li key={t.id} className="border-b border-[#f0ede6] px-[22px] py-3.5 last:border-b-0">
                  <div className="flex items-center justify-between gap-3">
                    <p className="flex items-center gap-2 text-sm font-semibold text-ink">
                      <span className="h-2.5 w-2.5 rounded-[3px]" style={{ background: t.color }} aria-hidden />
                      {t.title}
                    </p>
                    <Link href={`/dashboard/event-types/${t.id}`} className="text-[13px] font-semibold text-primary hover:text-primary-hover">
                      Edit
                    </Link>
                  </div>
                  <div className="mt-2.5 grid grid-cols-2 gap-2">
                    {[
                      ["Minimum notice", notice(t.minNoticeMin)],
                      ["Booking window", `${t.windowDays} days ahead`],
                      ["Buffers", t.bufferBeforeMin || t.bufferAfterMin ? `${t.bufferBeforeMin} / ${t.bufferAfterMin} min` : "None"],
                      ["Daily cap", t.dailyCap ? `${t.dailyCap} meetings` : "No limit"],
                    ].map(([k, v]) => (
                      <div key={k} className="rounded-[10px] bg-[#f6f4ef] px-3 py-2.5">
                        <p className="font-mono text-[10px] tracking-[0.06em] text-muted uppercase">{k}</p>
                        <p className="mt-1 text-sm font-semibold text-ink">{v}</p>
                      </div>
                    ))}
                  </div>
                </li>
              ))}
              {types.length === 0 && <li className="px-[22px] py-5 text-sm text-muted">No active event types.</li>}
            </ul>
          </Card>
        </div>
      </div>
    </>
  );
}
