import { CalendarDays, Check, Globe, User, Video, X } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EmbedBridge } from "@/components/embed-bridge";
import { BookingShell } from "@/components/event-info";
import { Alert } from "@/components/ui";
import { getBookingByToken } from "@/lib/bookings";
import { describeLocation } from "@/lib/format";
import { brandStyle } from "@/lib/public";

export const metadata = { title: "Booking", robots: { index: false } };

const gcalStamp = (d: Date) => d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
const pill = "inline-flex h-10 items-center rounded-[10px] border border-line-strong bg-card px-4 text-sm font-semibold text-ink hover:border-ink";

export default async function BookingPage(props: PageProps<"/booking/[token]">) {
  const { token } = await props.params;
  const { rescheduled, embed } = await props.searchParams;
  const isEmbed = embed === "1";
  const found = await getBookingByToken(token);
  if (!found) notFound();
  const { booking, eventType, host } = found;
  const cancelled = booking.status === "cancelled";
  const hostName = host.name ?? host.username ?? "Host";
  const where = describeLocation(booking.location, booking.meetLink);

  const zone = booking.inviteeTimezone;
  const s = DateTime.fromJSDate(booking.startUtc, { zone });
  const e = DateTime.fromJSDate(booking.endUtc, { zone });
  const when = `${s.toFormat("h:mma").toLowerCase()} – ${e.toFormat("h:mma").toLowerCase()}, ${s.toFormat("cccc, LLLL d, yyyy")}`;

  const gcal = new URL("https://calendar.google.com/calendar/render");
  gcal.searchParams.set("action", "TEMPLATE");
  gcal.searchParams.set("text", `${eventType.title} with ${hostName}`);
  gcal.searchParams.set("dates", `${gcalStamp(booking.startUtc)}/${gcalStamp(booking.endUtc)}`);
  gcal.searchParams.set("location", booking.meetLink ?? where);

  const row = "flex items-start gap-3 text-[15px] text-ink-soft";
  const icon = "mt-0.5 h-[18px] w-[18px] shrink-0";

  return (
    <BookingShell style={brandStyle(host)} embed={isEmbed} wide={false}>
      {isEmbed && <EmbedBridge />}
      <div className="px-6 py-11 text-center sm:px-12">
        <span
          className={`inline-flex h-14 w-14 items-center justify-center rounded-full ${cancelled ? "bg-chip text-muted" : "bg-brand-soft text-brand"}`}
          aria-hidden
        >
          {cancelled ? <X className="h-[26px] w-[26px]" strokeWidth={2.5} /> : <Check className="h-[26px] w-[26px]" strokeWidth={2.5} />}
        </span>
        <h1 className="blur-in mt-[18px] font-serif text-[48px] leading-none font-normal text-ink" style={{ "--d": "0.1s" } as React.CSSProperties}>
          {cancelled ? "This meeting was cancelled" : rescheduled ? "You're rescheduled" : "You're scheduled"}
        </h1>
        {!cancelled && (
          <p className="mt-3 text-[15px] text-ink-soft">
            A calendar invitation has been sent to <span className="font-medium text-ink">{booking.inviteeEmail}</span>.
          </p>
        )}
        {!cancelled && (
          <div className="mt-6 flex flex-wrap justify-center gap-2.5">
            <a href={gcal.toString()} target="_blank" rel="noreferrer" className={pill}>
              Add to Google Calendar
            </a>
            <a href={`/booking/${token}/ics`} className={pill}>
              Add to Outlook / Apple (.ics)
            </a>
          </div>
        )}

        <div className="mt-8 flex flex-col gap-3.5 rounded-[14px] border border-line p-6 text-left">
          <p className="font-serif text-[28px] leading-none text-ink">{eventType.title}</p>
          <p className={row}>
            <User className={icon} aria-hidden /> {hostName}
          </p>
          <p className={row}>
            <CalendarDays className={icon} aria-hidden /> <span className={cancelled ? "line-through" : ""}>{when}</span>
          </p>
          <p className={row}>
            <Globe className={icon} aria-hidden /> {zone.replace(/_/g, " ")}
          </p>
          <p className={row}>
            <Video className={icon} aria-hidden />
            {booking.meetLink && !cancelled ? (
              <a href={booking.meetLink} target="_blank" rel="noreferrer" className="font-medium text-brand hover:underline">
                Join with Google Meet
              </a>
            ) : (
              <span>{booking.location.type === "google_meet" ? "Google Meet link will be emailed to you" : where}</span>
            )}
          </p>
          {cancelled && booking.cancelReason && <p className="text-sm text-ink-soft">Reason: {booking.cancelReason}</p>}
        </div>

        <div className="mt-7 text-sm text-ink-soft">
          {cancelled ? (
            <Link href={`/${host.username}/${eventType.slug}`} className="font-semibold text-brand hover:underline">
              Book a new time
            </Link>
          ) : (
            booking.startUtc > new Date() && (
              <p>
                Need to make a change?{" "}
                <Link href={`/reschedule/${token}`} className="font-semibold text-brand hover:underline">
                  Reschedule
                </Link>{" "}
                or{" "}
                <Link href={`/cancel/${token}`} className="font-semibold text-brand hover:underline">
                  Cancel
                </Link>
              </p>
            )
          )}
        </div>
        {rescheduled && !cancelled && (
          <div className="mt-6 text-left">
            <Alert tone="green">Both you and {hostName} have been notified of the new time.</Alert>
          </div>
        )}
      </div>
    </BookingShell>
  );
}
