import { CalendarDays, Download, Search } from "lucide-react";
import { DateTime } from "luxon";
import { Alert, Badge, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { describeLocation } from "@/lib/format";
import { countHostBookings, listHostBookings, parseTab } from "@/lib/host-bookings";
import { requireHost } from "@/lib/session";
import { HostCancel } from "./host-cancel";
import { Detail, MeetingItem, StatCards } from "./meeting-ui";

export const metadata = { title: "Meetings" };

const TABS = [
  { id: "upcoming", label: "Upcoming" },
  { id: "past", label: "Past" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export default async function MeetingsPage(props: PageProps<"/dashboard/meetings">) {
  const host = await requireHost();
  const sp = await props.searchParams;
  const tab = parseTab(sp.tab);
  const q = typeof sp.q === "string" ? sp.q : "";
  const [rows, counts] = await Promise.all([listHostBookings(host.id, tab, q), countHostBookings(host.id)]);

  const groups = new Map<string, typeof rows>();
  for (const r of rows) {
    const day = DateTime.fromJSDate(r.booking.startUtc, { zone: host.timezone }).toFormat("cccc, d LLLL yyyy");
    groups.set(day, [...(groups.get(day) ?? []), r]);
  }
  const href = (t: string) => `/dashboard/meetings?${new URLSearchParams({ tab: t, ...(q ? { q } : {}) })}`;
  const exportQs = new URLSearchParams({ tab, ...(q ? { q } : {}) });

  return (
    <>
      <PageHeader
        title="Meetings"
        actions={
          <LinkButton variant="secondary" href={`/dashboard/export?${exportQs}`} prefetch={false}>
            <Download className="h-4 w-4" aria-hidden />
            Export CSV
          </LinkButton>
        }
      />

      <StatCards items={TABS.map((t) => ({ id: t.id, label: t.label, value: counts[t.id], href: href(t.id), active: tab === t.id }))} />

      <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-muted">
          {rows.length} {rows.length === 1 ? "event" : "events"} · times in {host.timezone.replace(/_/g, " ")}
        </p>
        <form className="relative w-full sm:w-[300px]">
          <input type="hidden" name="tab" value={tab} />
          <Search className="pointer-events-none absolute top-[11px] left-3 h-4 w-4 text-muted" aria-hidden />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search invitee name or email"
            aria-label="Search meetings"
            className="block h-[38px] w-full rounded-[10px] border border-line-strong bg-card pr-3 pl-9 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-primary-soft focus:outline-none"
          />
        </form>
      </div>

      <div className="mt-4">
        {rows.length === 0 ? (
          <EmptyState icon={<CalendarDays className="h-10 w-10" />} title={q ? "No matching events" : `No ${tab} events`}>
            {!q && tab === "upcoming" && "Share your booking link and your upcoming meetings will show up here."}
          </EmptyState>
        ) : (
          <div className="flex flex-col gap-5">
            {[...groups].map(([day, items]) => (
              <section key={day}>
                <h2 className="mb-2 font-mono text-xs font-medium tracking-[0.06em] text-muted uppercase">{day}</h2>
                <div className="overflow-hidden rounded-[14px] border border-line bg-card">
                  {items.map(({ booking: b, eventTitle, eventColor }, i) => {
                    const start = DateTime.fromJSDate(b.startUtc, { zone: host.timezone });
                    const end = DateTime.fromJSDate(b.endUtc, { zone: host.timezone });
                    const cancelled = b.status === "cancelled";
                    return (
                      <MeetingItem
                        key={b.id}
                        id={b.id}
                        first={i === 0}
                        time={
                          <div className="flex items-center gap-2.5">
                            <span className="h-2.5 w-2.5 shrink-0 rounded-[3px]" style={{ background: eventColor }} aria-hidden />
                            <span className={`font-mono text-[13px] whitespace-nowrap ${cancelled ? "text-muted line-through" : "text-ink"}`}>
                              {start.toFormat("h:mm")} – {end.toFormat("h:mm a")}
                            </span>
                          </div>
                        }
                        summary={
                          <>
                            <p className="text-[15px] font-semibold text-ink">{b.inviteeName}</p>
                            <p className="mt-0.5 text-[13px] text-muted">{eventTitle}</p>
                            {(b.rescheduleCount > 0 || cancelled) && (
                              <div className="mt-2 flex flex-wrap gap-1.5">
                                {b.rescheduleCount > 0 && <Badge tone="amber">Rescheduled</Badge>}
                                {cancelled && <Badge tone="red">Cancelled by {b.cancelledBy}</Badge>}
                              </div>
                            )}
                          </>
                        }
                        details={
                          <>
                            <Detail k="Email">{b.inviteeEmail}</Detail>
                            <Detail k="Location">
                              {b.meetLink ? (
                                <a href={b.meetLink} target="_blank" rel="noreferrer" className="font-medium text-primary hover:underline">
                                  {b.meetLink.replace(/^https?:\/\//, "")}
                                </a>
                              ) : (
                                describeLocation(b.location)
                              )}
                            </Detail>
                            <Detail k="Invitee time zone">{b.inviteeTimezone.replace(/_/g, " ")}</Detail>
                            <Detail k="Booked">{DateTime.fromJSDate(b.createdAt, { zone: host.timezone }).toFormat("d LLL yyyy, h:mm a")}</Detail>
                            {b.inviteePhone && <Detail k="Phone">{b.inviteePhone}</Detail>}
                            {b.answers
                              .filter((a) => a.value)
                              .map((a) => (
                                <Detail key={a.questionId} k={a.label}>
                                  <span className="whitespace-pre-line">{a.value}</span>
                                </Detail>
                              ))}
                            {b.cancelReason && <Detail k="Cancellation reason">{b.cancelReason}</Detail>}
                          </>
                        }
                        actions={tab === "upcoming" ? <HostCancel bookingId={b.id} /> : undefined}
                      />
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>
      {rows.length >= 200 && (
        <div className="mt-4">
          <Alert tone="amber">Showing the first 200 events. Use search or export to see more.</Alert>
        </div>
      )}
    </>
  );
}
