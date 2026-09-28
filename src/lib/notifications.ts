import type { Booking, EventType, User } from "@/db/schema";
import { appUrl, sendEmail } from "./email";
import { describeLocation, formatWhen } from "./format";
import { buildIcs } from "./ics";

type Ctx = { booking: Booking; eventType: EventType; host: User };

export function manageLinks(booking: Booking) {
  return {
    reschedule: `${appUrl()}/reschedule/${booking.cancelToken}`,
    cancel: `${appUrl()}/cancel/${booking.cancelToken}`,
  };
}

export function bookingIcs({ booking, eventType, host }: Ctx, method: "REQUEST" | "CANCEL" = "REQUEST") {
  const links = manageLinks(booking);
  return buildIcs({
    uid: `${booking.id}@calclone`,
    sequence: booking.rescheduleCount + (method === "CANCEL" ? 1 : 0),
    method,
    start: booking.startUtc,
    end: booking.endUtc,
    title: `${eventType.title} with ${host.name ?? host.username}`,
    description: `Need to make a change?\nReschedule: ${links.reschedule}\nCancel: ${links.cancel}`,
    location: describeLocation(booking.location, booking.meetLink),
    organizer: { name: host.name ?? host.username ?? "Host", email: host.email! },
    attendee: { name: booking.inviteeName, email: booking.inviteeEmail },
  });
}

function layout(title: string, rows: [string, string][], footer = "") {
  const text = `${title}\n\n${rows.map(([k, v]) => `${k}: ${v}`).join("\n")}${footer ? `\n\n${footer}` : ""}`;
  const html = `<div style="font-family:system-ui,sans-serif;max-width:520px;margin:auto;color:#111">
<h2 style="font-size:20px">${esc(title)}</h2>
<table style="border-collapse:collapse">${rows
    .map(([k, v]) => `<tr><td style="padding:4px 12px 4px 0;color:#666;vertical-align:top">${esc(k)}</td><td style="padding:4px 0">${esc(v)}</td></tr>`)
    .join("")}</table>
${footer ? `<p style="margin-top:24px;font-size:14px;color:#444">${esc(footer).replace(/\n/g, "<br>")}</p>` : ""}
</div>`;
  return { text, html };
}

const esc = (s: string) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]!);

function answersRows(booking: Booking): [string, string][] {
  return booking.answers.filter((a) => a.value).map((a) => [a.label, a.value]);
}

export async function notifyBookingCreated(ctx: Ctx) {
  const { booking, eventType, host } = ctx;
  const links = manageLinks(booking);
  const ics = { filename: "invite.ics", content: bookingIcs(ctx), contentType: "text/calendar; method=REQUEST" };
  const where = describeLocation(booking.location, booking.meetLink);

  const invitee = layout(
    `Confirmed: ${eventType.title} with ${host.name}`,
    [
      ["When", formatWhen(booking.startUtc, booking.endUtc, booking.inviteeTimezone)],
      ["Where", where],
    ],
    `Need to make a change?\nReschedule: ${links.reschedule}\nCancel: ${links.cancel}`,
  );
  const hostMail = layout(`New booking: ${eventType.title} with ${booking.inviteeName}`, [
    ["When", formatWhen(booking.startUtc, booking.endUtc, host.timezone)],
    ["Invitee", `${booking.inviteeName} <${booking.inviteeEmail}>`],
    ...(booking.inviteePhone ? [["Phone", booking.inviteePhone] as [string, string]] : []),
    ["Where", where],
    ...answersRows(booking),
  ]);

  await Promise.all([
    sendEmail({ to: booking.inviteeEmail, subject: invitee.text.split("\n")[0], ...invitee, attachments: [ics] }),
    sendEmail({ to: host.email!, subject: hostMail.text.split("\n")[0], ...hostMail, attachments: [ics] }),
  ]);
}

export async function notifyBookingRescheduled(ctx: Ctx, previousStart: Date) {
  const { booking, eventType, host } = ctx;
  const links = manageLinks(booking);
  const ics = { filename: "invite.ics", content: bookingIcs(ctx), contentType: "text/calendar; method=REQUEST" };

  const invitee = layout(
    `Rescheduled: ${eventType.title} with ${host.name}`,
    [
      ["New time", formatWhen(booking.startUtc, booking.endUtc, booking.inviteeTimezone)],
      ["Where", describeLocation(booking.location, booking.meetLink)],
    ],
    `Reschedule again: ${links.reschedule}\nCancel: ${links.cancel}`,
  );
  const prevEnd = new Date(previousStart.getTime() + (booking.endUtc.getTime() - booking.startUtc.getTime()));
  const hostMail = layout(`Rescheduled: ${eventType.title} with ${booking.inviteeName}`, [
    ["New time", formatWhen(booking.startUtc, booking.endUtc, host.timezone)],
    ["Previous time", formatWhen(previousStart, prevEnd, host.timezone)],
    ["Invitee", `${booking.inviteeName} <${booking.inviteeEmail}>`],
  ]);

  await Promise.all([
    sendEmail({ to: booking.inviteeEmail, subject: invitee.text.split("\n")[0], ...invitee, attachments: [ics] }),
    sendEmail({ to: host.email!, subject: hostMail.text.split("\n")[0], ...hostMail, attachments: [ics] }),
  ]);
}

export async function notifyBookingCancelled(ctx: Ctx) {
  const { booking, eventType, host } = ctx;
  const ics = { filename: "cancel.ics", content: bookingIcs(ctx, "CANCEL"), contentType: "text/calendar; method=CANCEL" };
  const reason = booking.cancelReason ? [["Reason", booking.cancelReason] as [string, string]] : [];
  const by = booking.cancelledBy === "host" ? host.name ?? "The host" : booking.inviteeName;

  const invitee = layout(`Cancelled: ${eventType.title} with ${host.name}`, [
    ["When", formatWhen(booking.startUtc, booking.endUtc, booking.inviteeTimezone)],
    ["Cancelled by", by],
    ...reason,
  ], `Book a new time: ${appUrl()}/${host.username}/${eventType.slug}`);
  const hostMail = layout(`Cancelled: ${eventType.title} with ${booking.inviteeName}`, [
    ["When", formatWhen(booking.startUtc, booking.endUtc, host.timezone)],
    ["Cancelled by", by],
    ...reason,
  ]);

  await Promise.all([
    sendEmail({ to: booking.inviteeEmail, subject: invitee.text.split("\n")[0], ...invitee, attachments: [ics] }),
    sendEmail({ to: host.email!, subject: hostMail.text.split("\n")[0], ...hostMail, attachments: [ics] }),
  ]);
}
