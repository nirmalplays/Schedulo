"use client";

import { useMemo, useState, useSyncExternalStore } from "react";

const noop = () => () => {};
/** Intl output differs between Node and browsers, so times render client-side only. */
const useMounted = () => useSyncExternalStore(noop, () => true, () => false);

/** The moment shown: a host's day in Chennai. Real IANA zones, so DST is handled by Intl. */
const HOST_DAY_UTC = Date.UTC(2026, 9, 14, 18, 30); // 00:00 IST, Thu 15 Oct 2026
const ZONES = [
  { label: "Host · Chennai", zone: "Asia/Kolkata", locale: "en-IN" },
  { label: "London", zone: "Europe/London", locale: "en-GB" },
  { label: "New York", zone: "America/New_York", locale: "en-US" },
  { label: "Sydney", zone: "Australia/Sydney", locale: "en-AU" },
];

function describe(instant: Date, zone: string, locale: string) {
  const parts = new Intl.DateTimeFormat(locale, {
    timeZone: zone,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZoneName: "short",
  }).formatToParts(instant);
  const get = (t: string) => parts.find((p) => p.type === t)?.value ?? "";
  const hour24 = Number(new Intl.DateTimeFormat("en-GB", { timeZone: zone, hour: "2-digit", hour12: false }).format(instant)) % 24;
  const clock = `${get("hour")}:${get("minute")} ${get("dayPeriod").toUpperCase()}`;
  return {
    clock,
    time: `${clock} ${get("timeZoneName")}`,
    day: `${get("weekday")} ${get("day")} ${get("month")}`,
    hour: hour24,
  };
}

export function TimezoneSlider() {
  const [slot, setSlot] = useState(21); // 10:30 IST
  const instant = useMemo(() => new Date(HOST_DAY_UTC + slot * 30 * 60_000), [slot]);
  const mounted = useMounted();
  const host = describe(instant, "Asia/Kolkata", "en-IN");
  const show = (v: string) => (mounted ? v : " ");

  return (
    <div className="liquid-glass max-w-176 rounded-3xl p-6 backdrop-blur-[10px]">
      <div className="flex flex-wrap items-baseline justify-between gap-3">
        <label htmlFor="tz-slider" className="text-sm text-foreground/70">
          Drag to pick a slot · Thu 15 Oct 2026
        </label>
        <span className="font-mono text-[13px] text-amber-300">Host picks {show(host.clock)} IST</span>
      </div>
      <input
        id="tz-slider"
        type="range"
        min={0}
        max={47}
        step={1}
        value={slot}
        onChange={(e) => setSlot(Number(e.target.value))}
        aria-valuetext={mounted ? `${host.time} in Chennai` : undefined}
        className="mt-4 mb-5 w-full accent-purple-500"
      />
      <div className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
        {ZONES.map((z) => {
          const d = describe(instant, z.zone, z.locale);
          const work = d.hour >= 9 && d.hour < 18;
          const late = d.hour >= 22 || d.hour < 7;
          return (
            <div
              key={z.zone}
              className="rounded-2xl bg-white/[0.02] px-4 py-3.5 transition-shadow duration-300"
              style={{ boxShadow: `inset 0 0 0 1px ${work ? "rgba(74,222,128,.35)" : "rgba(255,255,255,.08)"}` }}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs text-foreground/60">{z.label}</p>
                <span
                  title={work ? "Working hours" : "Outside hours"}
                  className="h-[7px] w-[7px] rounded-full transition-colors duration-300"
                  style={{ background: work ? "#4ade80" : late ? "#f87171" : "#fcd34d" }}
                />
              </div>
              <p className="mt-1 text-lg leading-7 whitespace-nowrap text-foreground tabular-nums">{show(d.time)}</p>
              <p className="text-[11px] text-foreground/50">
                {show(`${d.day} · ${work ? "working hours" : late ? "asleep" : "off hours"}`)}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}
