"use client";

import { ChevronLeft, ChevronRight, Clock, Globe, Video } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { useDetectedZone } from "@/lib/timezones";

export type PreviewEvent = {
  id: string;
  title: string;
  durationMin: number;
  href: string; // e.g. /demo/discovery
  hostName: string;
  locationLabel: string;
};

const DAY = 86_400_000;
const DOW = ["MON", "TUE", "WED", "THU", "FRI", "SAT", "SUN"];
const pad = (n: number) => String(n).padStart(2, "0");
const keyIn = (iso: string, zone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

/** Static stand-in used when no demo host is seeded (decorative only). */
const SAMPLE = {
  available: new Set([2, 3, 4, 7, 8, 9, 10, 11, 14, 15, 16, 17, 18, 21, 22, 23, 24, 25, 28, 29, 30]),
  times: ["10:00am", "10:30am", "11:00am", "2:00pm", "3:30pm"],
};

/**
 * The booking page, miniature. With a demo event it shows the demo host's real
 * availability (from /api/slots) in the visitor's time zone, and picking a time
 * opens the real booking page on that date.
 */
export function LivePreview({ event }: { event: PreviewEvent | null }) {
  const router = useRouter();
  const zone = useDetectedZone();
  const [month, setMonth] = useState(() => {
    const d = new Date();
    return { y: d.getFullYear(), m: d.getMonth() };
  });
  const [slots, setSlots] = useState<string[] | null>(null);
  const [day, setDay] = useState<string | null>(null);
  const [picked, setPicked] = useState<string | null>(null);

  useEffect(() => {
    if (!event || !zone) return;
    let cancelled = false;
    const start = new Date(Date.UTC(month.y, month.m, 1) - DAY).toISOString();
    const end = new Date(Date.UTC(month.y, month.m + 1, 1) + DAY).toISOString();
    fetch(`/api/slots?${new URLSearchParams({ eventTypeId: event.id, start, end })}`)
      .then((r) => (r.ok ? r.json() : { slots: [] }))
      .then((d: { slots: string[] }) => {
        if (cancelled) return;
        setSlots(d.slots);
        // Pre-select the first open day so the time column is never empty.
        const prefix = `${month.y}-${pad(month.m + 1)}`;
        const first = d.slots.map((s) => keyIn(s, zone)).find((k) => k.startsWith(prefix));
        setDay((cur) => (cur?.startsWith(prefix) ? cur : (first ?? null)));
      })
      .catch(() => !cancelled && setSlots([]));
    return () => {
      cancelled = true;
    };
  }, [event, zone, month]);

  const byDay = useMemo(() => {
    const m = new Map<string, string[]>();
    if (!slots || !zone) return m;
    for (const s of slots) {
      const k = keyIn(s, zone);
      m.set(k, [...(m.get(k) ?? []), s]);
    }
    return m;
  }, [slots, zone]);

  const live = Boolean(event && zone && slots);
  const first = (new Date(Date.UTC(month.y, month.m, 1)).getUTCDay() + 6) % 7;
  const days = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const monthLabel = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" }).format(new Date(month.y, month.m, 15));
  const now = new Date();
  const isThisMonth = month.y === now.getFullYear() && month.m === now.getMonth();
  const timeFmt = zone ? new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit", timeZone: zone }) : null;
  const fmtTime = (iso: string) => timeFmt!.format(new Date(iso)).replace(" ", "").toLowerCase();
  const zoneLabel = zone
    ? (new Intl.DateTimeFormat("en-US", { timeZone: zone, timeZoneName: "long" }).formatToParts(new Date()).find((p) => p.type === "timeZoneName")?.value ?? zone)
    : "India Standard Time";

  const dayTimes = live && day ? (byDay.get(day) ?? []).slice(0, 5) : [];
  const dayHeading = live && day
    ? new Intl.DateTimeFormat("en-US", { weekday: "long", month: "short", day: "numeric", timeZone: "UTC" }).format(new Date(`${day}T12:00:00Z`))
    : "Thursday, Oct 15";

  const openBooking = (slot: string) => {
    if (!event || !zone) return;
    setPicked(slot);
    const d = keyIn(slot, zone);
    router.push(`${event.href}?${new URLSearchParams({ month: d.slice(0, 7), date: d })}`);
  };

  const shift = (delta: number) => {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setDay(null);
  };

  return (
    <div className="w-full max-w-xl overflow-hidden rounded-xl border border-line bg-white font-sans shadow-[0_24px_60px_rgba(11,53,88,0.18)]">
      <div className="flex">
        <div className="hidden w-48 shrink-0 border-r border-line p-5 sm:block">
          <div className="h-10 w-10 rounded-full bg-primary-soft" aria-hidden />
          <p className="mt-3 text-xs font-semibold text-ink-soft">{event?.hostName ?? "Asha Mehta"}</p>
          <p className="mt-1 text-lg leading-tight font-bold text-ink">{event?.title ?? "Discovery Call"}</p>
          <p className="mt-4 flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <Clock className="h-3.5 w-3.5" aria-hidden /> {event?.durationMin ?? 30} min
          </p>
          <p className="mt-2 flex items-center gap-2 text-xs font-semibold text-ink-soft">
            <Video className="h-3.5 w-3.5" aria-hidden /> {event?.locationLabel ?? "Google Meet"}
          </p>
        </div>

        <div className="min-w-0 flex-1 p-5">
          <p className="text-sm font-bold text-ink">Select a Date &amp; Time</p>
          <div className="mt-3 flex items-center justify-center gap-4 text-xs text-ink">
            <button
              type="button"
              onClick={() => shift(-1)}
              disabled={!live || isThisMonth}
              aria-label="Previous month"
              className="text-primary disabled:text-line-strong"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <span aria-live="polite">{live ? monthLabel : "October 2026"}</span>
            <button type="button" onClick={() => shift(1)} disabled={!live} aria-label="Next month" className="text-primary disabled:text-line-strong">
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
          <div className="mt-3 grid grid-cols-7 gap-1 text-center text-[10px] font-semibold text-ink-soft">
            {DOW.map((d) => (
              <span key={d} aria-hidden>
                {d}
              </span>
            ))}
            {Array.from({ length: live ? first : 3 }, (_, i) => (
              <span key={`e${i}`} />
            ))}
            {Array.from({ length: live ? days : 31 }, (_, i) => i + 1).map((d) => {
              const key = `${month.y}-${pad(month.m + 1)}-${pad(d)}`;
              const open = live ? byDay.has(key) : SAMPLE.available.has(d);
              const selected = live ? day === key : d === 15;
              return (
                <button
                  key={d}
                  type="button"
                  disabled={!live || !open}
                  aria-pressed={selected}
                  aria-label={`${monthLabel.split(" ")[0]} ${d}${open ? ", available" : ""}`}
                  onClick={() => setDay(key)}
                  className={`mx-auto flex h-7 w-7 items-center justify-center rounded-full text-[11px] transition-colors ${
                    selected ? "bg-primary font-bold text-white" : open ? "bg-primary-soft font-bold text-primary hover:brightness-95" : "text-muted/50"
                  }`}
                >
                  {d}
                </button>
              );
            })}
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-[11px] text-ink-soft">
            <Globe className="h-3 w-3" aria-hidden /> {zoneLabel}
          </p>
          {/* Narrow screens: the time column moves under the calendar. */}
          {live && dayTimes.length > 0 && (
            <div className="mt-3.5 md:hidden">
              <p className="mb-2 text-[11px] text-ink">{dayHeading}</p>
              <div className="flex flex-wrap gap-1.5">
                {dayTimes.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => openBooking(s)}
                    className="flex-[1_1_72px] rounded border border-primary/50 py-2 text-center text-xs font-bold text-primary hover:border-primary"
                  >
                    {fmtTime(s)}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="hidden w-32 shrink-0 flex-col gap-2 p-5 pl-0 md:flex">
          <p className="text-[11px] text-ink">{dayHeading}</p>
          {live
            ? dayTimes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => openBooking(s)}
                  className={`rounded border py-2 text-center text-xs font-bold transition-colors ${
                    picked === s ? "border-ink-soft bg-ink-soft text-white" : "border-primary/50 text-primary hover:border-primary"
                  }`}
                >
                  {fmtTime(s)}
                </button>
              ))
            : SAMPLE.times.map((t, i) => (
                <span
                  key={t}
                  className={`rounded border py-2 text-center text-xs font-bold ${i === 1 ? "border-ink-soft bg-ink-soft text-white" : "border-primary/50 text-primary"}`}
                >
                  {t}
                </span>
              ))}
          {live && dayTimes.length === 0 && <p className="text-[11px] text-muted">No times this day.</p>}
        </div>
      </div>
    </div>
  );
}
