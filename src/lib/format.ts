import { DateTime } from "luxon";
import type { EventLocation } from "@/db/schema";

export function formatWhen(start: Date, end: Date, zone: string, locale = "en-IN") {
  const s = DateTime.fromJSDate(start, { zone }).setLocale(locale);
  const e = DateTime.fromJSDate(end, { zone }).setLocale(locale);
  return `${s.toFormat("cccc, d LLLL yyyy")} · ${s.toFormat("h:mm a")} – ${e.toFormat("h:mm a")} (${zoneLabel(zone, start)})`;
}

export function zoneLabel(zone: string, at = new Date()) {
  const offset = DateTime.fromJSDate(at, { zone }).toFormat("ZZ");
  return `${zone.replace(/_/g, " ")}, GMT${offset}`;
}

export const LOCATION_LABELS: Record<EventLocation["type"], string> = {
  google_meet: "Google Meet",
  zoom: "Zoom",
  phone: "Phone call",
  in_person: "In person",
  custom: "Custom",
};

export function describeLocation(location: EventLocation, meetLink?: string | null) {
  if (location.type === "google_meet") return meetLink ? `Google Meet: ${meetLink}` : "Google Meet (link to follow)";
  if (location.type === "zoom") return location.value ? `Zoom: ${location.value}` : "Zoom";
  if (location.type === "phone") return location.value ? `Phone: ${location.value}` : "Phone call (host will call you)";
  if (location.type === "in_person") return location.value ? `In person: ${location.value}` : "In person";
  return location.value ?? "To be confirmed";
}

export function formatPrice(minor: number, currency: string) {
  return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: minor % 100 === 0 ? 0 : 2,
  }).format(minor / 100);
}
