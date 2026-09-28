import { notFound } from "next/navigation";
import { BookingShell } from "@/components/event-info";
import { Alert } from "@/components/ui";
import { getBookingByToken } from "@/lib/bookings";
import { formatWhen } from "@/lib/format";
import { brandStyle } from "@/lib/public";
import { CancelForm } from "./cancel-form";

export const metadata = { title: "Cancel meeting", robots: { index: false } };

export default async function CancelPage(props: PageProps<"/cancel/[token]">) {
  const { token } = await props.params;
  const found = await getBookingByToken(token);
  if (!found) notFound();
  const { booking, eventType, host } = found;

  return (
    <BookingShell style={brandStyle(host)} wide={false}>
      <div className="px-6 py-10 sm:px-12">
        <h1 className="font-serif text-[44px] leading-none font-normal text-ink">Cancel meeting</h1>
        <div className="mt-6 rounded-[14px] border border-line p-5">
          <p className="font-serif text-2xl leading-none text-ink">{eventType.title}</p>
          <p className="mt-2 text-sm text-ink-soft">with {host.name ?? host.username}</p>
          <p className="mt-1 text-sm text-ink-soft">{formatWhen(booking.startUtc, booking.endUtc, booking.inviteeTimezone)}</p>
        </div>
        <div className="mt-6">
          {booking.status === "cancelled" ? (
            <Alert tone="amber">This meeting is already cancelled.</Alert>
          ) : booking.startUtc <= new Date() ? (
            <Alert tone="amber">This meeting has already started and can&apos;t be cancelled.</Alert>
          ) : (
            <CancelForm token={token} />
          )}
        </div>
      </div>
    </BookingShell>
  );
}
