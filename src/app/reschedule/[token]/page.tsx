import { notFound } from "next/navigation";
import { BookingWidget } from "@/components/booking-widget";
import { BookingShell, EventInfo } from "@/components/event-info";
import { Alert } from "@/components/ui";
import { getBookingByToken } from "@/lib/bookings";
import { formatWhen } from "@/lib/format";
import { brandStyle } from "@/lib/public";

export const metadata = { title: "Reschedule", robots: { index: false } };

export default async function ReschedulePage(props: PageProps<"/reschedule/[token]">) {
  const { token } = await props.params;
  const found = await getBookingByToken(token);
  if (!found) notFound();
  const { booking, eventType, host } = found;
  const canChange = booking.status === "confirmed" && booking.startUtc > new Date();

  return (
    <BookingShell style={brandStyle(host)}>
      <div className="grid min-h-[560px] md:grid-cols-[minmax(0,300px)_minmax(0,1fr)]">
        <EventInfo host={host} eventType={eventType}>
          <div className="mt-6 rounded-[10px] bg-chip p-3 text-sm">
            <p className="font-mono text-[10px] tracking-[0.06em] text-muted uppercase">Former time</p>
            <p className="mt-1 text-ink-soft line-through">{formatWhen(booking.startUtc, booking.endUtc, booking.inviteeTimezone)}</p>
          </div>
        </EventInfo>
        <div className="min-w-0">
          {canChange ? (
            <BookingWidget
              eventType={{ id: eventType.id, title: eventType.title, durationMin: eventType.durationMin }}
              questions={[]}
              reschedule={{ token, inviteeName: booking.inviteeName }}
            />
          ) : (
            <div className="p-8">
              <Alert tone="amber">{booking.status === "cancelled" ? "This meeting was cancelled." : "This meeting can no longer be rescheduled."}</Alert>
            </div>
          )}
        </div>
      </div>
    </BookingShell>
  );
}
