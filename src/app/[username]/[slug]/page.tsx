import type { CSSProperties } from "react";
import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking-widget";
import { EmbedBridge } from "@/components/embed-bridge";
import { BookingShell, EventInfo } from "@/components/event-info";
import { Alert, cx } from "@/components/ui";
import { getConnections } from "@/lib/google/calendar";
import { brandStyle, getPublicEventType } from "@/lib/public";

export async function generateMetadata(props: PageProps<"/[username]/[slug]">) {
  const { username, slug } = await props.params;
  const data = await getPublicEventType(username, slug);
  if (!data) return { title: "Not found" };
  return {
    title: `${data.eventType.title} | ${data.host.name ?? data.host.username}`,
    robots: data.eventType.isSecret ? { index: false } : undefined,
  };
}

const param = (v: string | string[] | undefined) => (typeof v === "string" ? v : undefined);
const hex = (v: string | undefined) => (v && /^[0-9a-fA-F]{6}$/.test(v) ? `#${v}` : undefined);

/**
 * Booking page. Query params (same names as Calendly's embed options):
 *   embed=1                    frameless, for iframes / embed.js
 *   hide_event_type_details=1  hide the left details panel
 *   primary_color=00a2ff       override the host's brand colour
 *   name=, email=              pre-fill the invitee form
 *   month=2026-10, date=2026-10-15  open on a month / date
 */
export default async function EventBookingPage(props: PageProps<"/[username]/[slug]">) {
  const { username, slug } = await props.params;
  const sp = await props.searchParams;
  const data = await getPublicEventType(username, slug);
  if (!data) notFound();
  const { host, eventType, questions } = data;
  const paused = (await getConnections(host.id)).some((c) => c.status !== "active");

  const embed = param(sp.embed) === "1";
  const hideDetails = param(sp.hide_event_type_details) === "1";
  const primary = hex(param(sp.primary_color));
  const style = { ...brandStyle(host), ...(primary ? { "--brand": primary } : {}) } as CSSProperties;

  return (
    <BookingShell style={style} embed={embed}>
      {embed && <EmbedBridge viewedEvent="event_type_viewed" />}
      <div className={cx("grid", !hideDetails && "md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]", !embed && "min-h-[560px]")}>
        {!hideDetails && <EventInfo host={host} eventType={eventType} />}
        <div className="min-w-0">
          {paused ? (
            <div className="p-8">
              <Alert tone="amber">{host.name ?? host.username} isn&apos;t taking bookings right now. Please check back later.</Alert>
            </div>
          ) : (
            <BookingWidget
              eventType={{ id: eventType.id, title: eventType.title, durationMin: eventType.durationMin }}
              questions={questions.map((q) => ({ id: q.id, label: q.label, type: q.type, required: q.required, options: q.options }))}
              prefill={{ name: param(sp.name), email: param(sp.email) }}
              embed={embed}
              initial={{ month: param(sp.month), date: param(sp.date) }}
              hostName={host.name ?? host.username ?? undefined}
            />
          )}
        </div>
      </div>
    </BookingShell>
  );
}
