"use client";

import { useEffect, useState } from "react";
import { prefersReducedMotion } from "./motion-pref";

const STEPS = [
  { n: "01", title: "Sign in with Google", body: "Your calendar connects in the same step, so busy times block your page from day one." },
  { n: "02", title: "Set your hours", body: "Weekly hours, date overrides, buffers, minimum notice and a daily cap." },
  { n: "03", title: "Share your link", body: "Invitees pick a time, get a confirmation with an .ics invite, and can reschedule or cancel themselves." },
];

/** Illustrative rows showing what the Meetings list looks like. Clearly labelled as an example. */
const POOL = [
  ["Priya Nair", "Discovery Call", "Thu 15 Oct · 10:30 AM", "Asia/Kolkata"],
  ["Tom Becker", "Portfolio Review", "Thu 15 Oct · 2:00 PM", "Europe/Berlin"],
  ["Lena Ortiz", "Quick Intro", "Fri 16 Oct · 6:30 PM", "America/New_York"],
  ["Daniel Kim", "Discovery Call", "Mon 19 Oct · 11:00 AM", "Asia/Seoul"],
  ["Ines Duarte", "Portfolio Review", "Tue 20 Oct · 3:30 PM", "Europe/Lisbon"],
  ["Marcus Lee", "Discovery Call", "Wed 21 Oct · 9:30 AM", "Asia/Singapore"],
  ["Sofia Rossi", "Quick Intro", "Thu 22 Oct · 1:00 PM", "Europe/Rome"],
  ["Kwame Mensah", "Discovery Call", "Fri 23 Oct · 4:00 PM", "Africa/Accra"],
] as const;

type Row = { id: number; name: string; event: string; when: string; tz: string; fresh: boolean };

function rowFor(id: number, fresh: boolean): Row {
  const p = POOL[(id - 1) % POOL.length];
  return { id, name: p[0], event: p[1], when: p[2], tz: p[3], fresh };
}

export function HowItWorks({ title }: { title: React.ReactNode }) {
  const [step, setStep] = useState(0);
  // Newest first; each row is derived from its id, so no mutable state is read during render.
  const [feed, setFeed] = useState<Row[]>(() => [4, 3, 2, 1].map((id) => rowFor(id, false)));

  useEffect(() => {
    if (prefersReducedMotion()) return;
    const t = setInterval(() => setFeed((f) => [rowFor(f[0].id + 1, true), ...f].slice(0, 6)), 3200);
    return () => clearInterval(t);
  }, []);

  return (
    <div className="mt-4 grid items-start gap-12 lg:grid-cols-2">
      <div>
        {title}
        <ol className="mt-10">
          {STEPS.map((s, i) => (
            <li
              key={s.n}
              onMouseEnter={() => setStep(i)}
              onFocus={() => setStep(i)}
              tabIndex={0}
              className="grid grid-cols-[48px_minmax(0,1fr)] gap-4 border-t border-white/[0.08] py-[22px] outline-none focus-visible:bg-white/[0.03]"
            >
              <span className="pt-1 font-mono text-[13px] transition-colors duration-300" style={{ color: step === i ? "#fcd34d" : "hsla(40,6%,95%,.4)" }}>
                {s.n}
              </span>
              <div>
                <p className="text-[19px] leading-7 transition-colors duration-300" style={{ color: step === i ? "hsl(40 6% 95%)" : "hsla(40,6%,95%,.7)" }}>
                  {s.title}
                </p>
                <p className="mt-1.5 text-sm leading-relaxed text-foreground/60">{s.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </div>

      <div className="relative overflow-hidden rounded-3xl bg-white/[0.02] p-5 shadow-[inset_0_1px_1px_rgba(255,255,255,0.1),inset_0_0_0_1px_rgba(255,255,255,0.08)]">
        <div className="flex items-center justify-between gap-3 px-1 pt-1 pb-4">
          <div className="flex items-center gap-2.5">
            <span data-motion className="h-2 w-2 rounded-full bg-green-400" style={{ animation: "soft-pulse 1.8s ease-in-out infinite" }} />
            <span className="text-sm font-semibold">Upcoming meetings</span>
            <span className="rounded-full bg-white/[0.06] px-2 py-0.5 text-[11px] text-foreground/60">Example</span>
          </div>
          <span className="font-mono text-[11px] text-foreground/50">Asia/Kolkata</span>
        </div>
        <div className="h-[392px] overflow-hidden [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]" aria-hidden>
          <div className="flex flex-col gap-2.5">
            {feed.map((f, i) => (
              <div
                key={f.id}
                data-motion
                className="flex items-center gap-3 rounded-[14px] bg-white/[0.03] px-3.5 py-3 shadow-[inset_0_0_0_1px_rgba(255,255,255,.07)]"
                style={{ animation: f.fresh ? "feed-in .5s cubic-bezier(.2,.9,.3,1.1) both" : undefined }}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/35 to-purple-500/35 text-xs font-semibold">
                  {f.name
                    .split(" ")
                    .map((x) => x[0])
                    .join("")}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-semibold">
                    {f.name}
                    <span className="font-normal text-foreground/55"> · {f.event}</span>
                  </p>
                  <p className="mt-0.5 font-mono text-xs text-foreground/50">
                    {f.when} · {f.tz}
                  </p>
                </div>
                {i === 0 && f.fresh && <span className="shrink-0 rounded-full bg-green-400/15 px-2 py-0.5 text-[11px] font-semibold text-green-300">Booked</span>}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
