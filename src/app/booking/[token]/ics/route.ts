import { getBookingByToken } from "@/lib/bookings";
import { bookingIcs } from "@/lib/notifications";

export async function GET(_req: Request, ctx: RouteContext<"/booking/[token]/ics">) {
  const { token } = await ctx.params;
  const found = await getBookingByToken(token);
  if (!found) return new Response("Not found", { status: 404 });
  const method = found.booking.status === "cancelled" ? "CANCEL" : "REQUEST";
  return new Response(bookingIcs(found, method), {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="${found.eventType.slug}.ics"`,
    },
  });
}
