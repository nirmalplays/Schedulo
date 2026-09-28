import { DateTime } from "luxon";
import { NextResponse, type NextRequest } from "next/server";
import { describeLocation } from "@/lib/format";
import { listHostBookings, parseTab } from "@/lib/host-bookings";
import { getCurrentUser } from "@/lib/session";

/** Quote a CSV cell and neutralise spreadsheet formula injection. */
function cell(v: string | number | null | undefined): string {
  let s = v == null ? "" : String(v);
  if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
  return `"${s.replace(/"/g, '""')}"`;
}

export async function GET(req: NextRequest) {
  const host = await getCurrentUser();
  if (!host?.username) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const tab = parseTab(req.nextUrl.searchParams.get("tab"));
  const rows = await listHostBookings(host.id, tab, req.nextUrl.searchParams.get("q") ?? undefined, 10_000);

  const questionLabels = [...new Set(rows.flatMap((r) => r.booking.answers.map((a) => a.label)))];
  const header = [
    "Event", "Start (host time)", "End (host time)", "Timezone", "Status", "Invitee name", "Invitee email",
    "Invitee phone", "Invitee timezone", "Location", "Cancel reason", "Booked at (UTC)", ...questionLabels,
  ];
  const fmt = (d: Date) => DateTime.fromJSDate(d, { zone: host.timezone }).toFormat("yyyy-LL-dd HH:mm");

  const lines = rows.map(({ booking: b, eventTitle }) =>
    [
      eventTitle, fmt(b.startUtc), fmt(b.endUtc), host.timezone, b.status, b.inviteeName, b.inviteeEmail,
      b.inviteePhone, b.inviteeTimezone, describeLocation(b.location, b.meetLink), b.cancelReason, b.createdAt.toISOString(),
      ...questionLabels.map((label) => b.answers.find((a) => a.label === label)?.value),
    ]
      .map(cell)
      .join(","),
  );

  const csv = "﻿" + [header.map(cell).join(","), ...lines].join("\r\n");
  return new Response(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="bookings-${tab}-${DateTime.now().toISODate()}.csv"`,
    },
  });
}
