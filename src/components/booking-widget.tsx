"use client";

import { ArrowLeft, CalendarDays, ChevronLeft, ChevronRight, Globe } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { useDetectedZone, useTimeZones } from "@/lib/timezones";
import { createBookingAction, rescheduleAction, type ActionResult } from "@/app/actions/booking";
import { Alert, Field, Input, Select, Textarea, cx } from "./ui";

type Question = { id: string; label: string; type: "text" | "textarea" | "select" | "phone"; required: boolean; options: string[] | null };

type Props = {
  eventType: { id: string; title: string; durationMin: number };
  questions: Question[];
  reschedule?: { token: string; inviteeName: string };
  /** Pre-fills the details form (from ?name=&email= on the booking URL). */
  prefill?: { name?: string; email?: string };
  /** Shown in the consent line on the details step. */
  hostName?: string;
  /** Rendered inside an embed iframe: keep embed mode on the confirmation page. */
  embed?: boolean;
  /** Initial month/date (yyyy-mm / yyyy-mm-dd), like Calendly's ?month=&date=. */
  initial?: { month?: string; date?: string };
};

/** When embedded in an iframe, tell the host page what happened (see public/embed.js). */
function notifyParent(event: string, payload: Record<string, unknown>) {
  if (typeof window === "undefined" || window.parent === window) return;
  window.parent.postMessage({ event: `schedulo.${event}`, payload }, "*");
}

const DAY = 86_400_000;
const WEEKDAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

/** "yyyy-mm-dd" of an instant as seen in `zone`. */
const dateKey = (iso: string, zone: string) =>
  new Intl.DateTimeFormat("en-CA", { timeZone: zone, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date(iso));

const pad = (n: number) => String(n).padStart(2, "0");

/** Formats a yyyy-mm-dd key itself (not an instant), so the zone must be UTC. */
const dayLabel = (key: string) =>
  new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(`${key}T12:00:00Z`));

export function BookingWidget({ eventType, questions, reschedule, prefill, embed, initial, hostName }: Props) {
  const router = useRouter();
  const detectedZone = useDetectedZone();
  const [chosenZone, setChosenZone] = useState<string | null>(null);
  const zone = chosenZone ?? detectedZone;

  const today = useMemo(() => new Date(), []);
  const [month, setMonth] = useState(() => {
    const m = initial?.month?.match(/^(\d{4})-(\d{2})$/);
    return m ? { y: Number(m[1]), m: Number(m[2]) - 1 } : { y: today.getFullYear(), m: today.getMonth() };
  });
  const [cache, setCache] = useState<Record<string, string[] | "error">>({});
  const [selectedDate, setSelectedDate] = useState<string | null>(initial?.date?.match(/^\d{4}-\d{2}-\d{2}$/) ? initial.date : null);
  const [selectedSlot, setSelectedSlot] = useState<string | null>(null);
  const [step, setStep] = useState<"pick" | "details">("pick");
  const [result, setResult] = useState<Exclude<ActionResult, { ok: true }> | null>(null);
  const [pending, startTransition] = useTransition();
  const [refreshKey, setRefreshKey] = useState(0);

  const cacheKey = zone ? `${zone}|${month.y}-${month.m}|${refreshKey}` : null;
  const monthSlots = cacheKey ? cache[cacheKey] : undefined;

  useEffect(() => {
    if (!cacheKey || cache[cacheKey] !== undefined) return;
    // Pad by a day each side; slots are regrouped into the invitee's zone below.
    const start = new Date(Date.UTC(month.y, month.m, 1) - DAY).toISOString();
    const end = new Date(Date.UTC(month.y, month.m + 1, 1) + DAY).toISOString();
    const qs = new URLSearchParams({ eventTypeId: eventType.id, start, end });
    if (reschedule) qs.set("reschedule", reschedule.token);
    let cancelled = false;
    fetch(`/api/slots?${qs}`)
      .then((r) => (r.ok ? r.json() : Promise.reject(r)))
      .then((d: { slots: string[] }) => !cancelled && setCache((c) => ({ ...c, [cacheKey]: d.slots })))
      .catch(() => !cancelled && setCache((c) => ({ ...c, [cacheKey]: "error" })));
    return () => {
      cancelled = true;
    };
  }, [cacheKey, cache, month, eventType.id, reschedule]);

  const byDate = useMemo(() => {
    const map = new Map<string, string[]>();
    if (!zone || !Array.isArray(monthSlots)) return map;
    const prefix = `${month.y}-${pad(month.m + 1)}`;
    for (const s of monthSlots) {
      const k = dateKey(s, zone);
      if (!k.startsWith(prefix)) continue;
      map.set(k, [...(map.get(k) ?? []), s]);
    }
    return map;
  }, [monthSlots, zone, month]);

  const timeFmt = useMemo(
    () => (zone ? new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: zone }) : null),
    [zone],
  );
  const longFmt = useMemo(
    () =>
      zone
        ? new Intl.DateTimeFormat(undefined, { weekday: "long", day: "numeric", month: "long", year: "numeric", timeZone: zone })
        : null,
    [zone],
  );

  const zones = useTimeZones();

  const todayKey = zone ? dateKey(today.toISOString(), zone) : null;

  if (!zone) return <div className="p-8 text-sm text-muted">Loading availability…</div>;

  // --- calendar grid (Monday first) ---
  const firstWeekday = (new Date(Date.UTC(month.y, month.m, 1)).getUTCDay() + 6) % 7;
  const daysInMonth = new Date(Date.UTC(month.y, month.m + 1, 0)).getUTCDate();
  const cells: (number | null)[] = [...Array(firstWeekday).fill(null), ...Array.from({ length: daysInMonth }, (_, i) => i + 1)];
  const isCurrentMonth = month.y === today.getFullYear() && month.m === today.getMonth();
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: "long", year: "numeric" }).format(new Date(month.y, month.m, 15));

  const shiftMonth = (delta: number) => {
    const d = new Date(month.y, month.m + delta, 1);
    setMonth({ y: d.getFullYear(), m: d.getMonth() });
    setSelectedDate(null);
    setSelectedSlot(null);
  };

  const slotsForDay = selectedDate ? byDate.get(selectedDate) ?? [] : [];

  function submitDetails(form: FormData) {
    if (!selectedSlot) return;
    setResult(null);
    startTransition(async () => {
      const res = reschedule
        ? await rescheduleAction(reschedule.token, selectedSlot)
        : await createBookingAction({
            eventTypeId: eventType.id,
            start: selectedSlot,
            name: String(form.get("name") ?? ""),
            email: String(form.get("email") ?? ""),
            timezone: zone!,
            answers: Object.fromEntries(questions.map((q) => [q.id, String(form.get(`q_${q.id}`) ?? "")])),
          });
      if (res.ok) {
        notifyParent(reschedule ? "event_rescheduled" : "event_scheduled", { booking: res.token, start_time: selectedSlot });
        const qs = new URLSearchParams({ ...(reschedule ? { rescheduled: "1" } : {}), ...(embed ? { embed: "1" } : {}) });
        router.push(`/booking/${res.token}${qs.size ? `?${qs}` : ""}`);
        return;
      }
      setResult(res);
      if (res.error === "slot_taken") setRefreshKey((k) => k + 1);
    });
  }

  const pickSlot = (slot: string) => {
    setSelectedSlot(slot);
    notifyParent("date_and_time_selected", { start_time: slot });
  };

  if (step === "details" && selectedSlot) {
    const end = new Date(new Date(selectedSlot).getTime() + eventType.durationMin * 60_000).toISOString();
    return (
      <div className="max-w-[520px] p-6 sm:p-8">
        <button
          type="button"
          onClick={() => setStep("pick")}
          aria-label="Back to times"
          className="mb-5 flex h-9 w-9 items-center justify-center rounded-full border border-line text-brand transition-colors hover:bg-brand-soft"
        >
          <ArrowLeft className="h-4 w-4" />
        </button>
        <h2 className="text-lg font-semibold text-ink">{reschedule ? "Confirm new time" : "Enter details"}</h2>
        <p className="mt-2 flex items-start gap-2 text-sm font-semibold text-brand">
          <CalendarDays className="mt-px h-4 w-4 shrink-0" aria-hidden />
          {timeFmt!.format(new Date(selectedSlot))} – {timeFmt!.format(new Date(end))}, {longFmt!.format(new Date(selectedSlot))}
        </p>

        {result?.error === "slot_taken" && (
          <div className="mt-5 space-y-3">
            <Alert>This time was just booked. Please choose another:</Alert>
            <div className="flex flex-wrap gap-2">
              {result.alternatives.map((alt) => (
                <button
                  key={alt}
                  type="button"
                  className="border-brand-soft rounded-[10px] border px-3.5 py-2 text-sm font-semibold text-brand hover:border-brand"
                  onClick={() => {
                    pickSlot(alt);
                    setSelectedDate(dateKey(alt, zone));
                    setResult(null);
                  }}
                >
                  {longFmt!.format(new Date(alt)).split(",")[0]}, {timeFmt!.format(new Date(alt))}
                </button>
              ))}
              {result.alternatives.length === 0 && <p className="text-sm text-ink-soft">No other times in the next two weeks.</p>}
            </div>
          </div>
        )}
        {result?.error === "invalid" && (
          <div className="mt-5">
            <Alert>{result.message}</Alert>
          </div>
        )}

        <form action={submitDetails} className="mt-6 space-y-[18px]">
          {!reschedule && (
            <>
              <Field label="Name *" htmlFor="name">
                <Input id="name" name="name" required autoComplete="name" defaultValue={prefill?.name} className="h-[46px]" />
              </Field>
              <Field label="Email *" htmlFor="email">
                <Input id="email" name="email" type="email" required autoComplete="email" defaultValue={prefill?.email} className="h-[46px]" />
              </Field>
              {questions.map((q) => (
                <Field key={q.id} label={q.label + (q.required ? " *" : "")} htmlFor={`q_${q.id}`}>
                  {q.type === "textarea" ? (
                    <Textarea id={`q_${q.id}`} name={`q_${q.id}`} required={q.required} rows={4} />
                  ) : q.type === "select" ? (
                    <Select id={`q_${q.id}`} name={`q_${q.id}`} required={q.required} defaultValue="" className="h-[46px]">
                      <option value="" disabled>
                        Select…
                      </option>
                      {q.options?.map((o) => (
                        <option key={o}>{o}</option>
                      ))}
                    </Select>
                  ) : (
                    <Input
                      id={`q_${q.id}`}
                      name={`q_${q.id}`}
                      required={q.required}
                      type={q.type === "phone" ? "tel" : "text"}
                      autoComplete={q.type === "phone" ? "tel" : undefined}
                      className="h-[46px]"
                    />
                  )}
                </Field>
              ))}
              {hostName && <p className="text-xs text-muted">By proceeding you agree to share your details with {hostName}.</p>}
            </>
          )}
          <button
            type="submit"
            disabled={pending}
            className="h-[50px] rounded-xl bg-brand px-7 text-[15px] font-semibold text-white transition hover:opacity-90 disabled:opacity-50"
          >
            {pending ? "Scheduling…" : reschedule ? "Reschedule event" : "Schedule event"}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(min(100%,260px),1fr))] gap-7 p-6 sm:p-8">
      <div>
        <h2 className="text-lg font-semibold text-ink">Select a date &amp; time</h2>
        <div className="mt-5 flex items-center justify-between">
          <p className="font-serif text-[26px] leading-none text-ink" aria-live="polite">
            {monthLabel}
          </p>
          <div className="flex gap-1.5">
            <button
              type="button"
              onClick={() => shiftMonth(-1)}
              disabled={isCurrentMonth}
              aria-label="Previous month"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand transition hover:brightness-95 disabled:bg-transparent disabled:text-line-strong"
            >
              <ChevronLeft className="h-[18px] w-[18px]" />
            </button>
            <button
              type="button"
              onClick={() => shiftMonth(1)}
              aria-label="Next month"
              className="flex h-8 w-8 items-center justify-center rounded-full bg-brand-soft text-brand transition hover:brightness-95"
            >
              <ChevronRight className="h-[18px] w-[18px]" />
            </button>
          </div>
        </div>
        <div className="mt-4 grid grid-cols-7 gap-1.5 text-center" aria-hidden>
          {WEEKDAYS.map((d) => (
            <span key={d} className="pb-1 font-mono text-[10px] text-muted uppercase">
              {d}
            </span>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1.5" role="group" aria-label={`Dates in ${monthLabel}`}>
          {cells.map((day, i) => {
            if (!day) return <div key={`e${i}`} />;
            const key = `${month.y}-${pad(month.m + 1)}-${pad(day)}`;
            const count = byDate.get(key)?.length ?? 0;
            const selected = selectedDate === key;
            const isToday = key === todayKey;
            return (
              <button
                key={key}
                type="button"
                disabled={!count}
                aria-pressed={selected}
                aria-label={`${dayLabel(key)}${count ? `, ${count} times available` : ", unavailable"}`}
                onClick={() => {
                  setSelectedDate(key);
                  setSelectedSlot(null);
                }}
                className={cx(
                  "relative mx-auto flex aspect-square w-full max-w-11 items-center justify-center rounded-full text-sm transition-colors",
                  !count && "text-faint",
                  count > 0 && !selected && "bg-brand-soft font-semibold text-brand hover:brightness-95",
                  selected && "bg-brand font-semibold text-white",
                )}
              >
                {day}
                {isToday && <span className={cx("absolute bottom-1.5 h-1 w-1 rounded-full", selected ? "bg-white" : "bg-current")} aria-hidden />}
              </button>
            );
          })}
        </div>
        {monthSlots === undefined && <p className="mt-3 text-xs text-muted">Loading times…</p>}
        {monthSlots === "error" && <p className="mt-3 text-xs text-danger">Couldn&apos;t load times. Please refresh.</p>}
        {Array.isArray(monthSlots) && byDate.size === 0 && (
          <div className="mt-4 rounded-[10px] bg-[#f6f4ef] p-4 text-sm text-ink-soft">
            No availability in {monthLabel.split(" ")[0]}.{" "}
            <button type="button" className="font-semibold text-brand hover:underline" onClick={() => shiftMonth(1)}>
              View next month
            </button>
          </div>
        )}

        <div className="mt-5 flex items-center gap-2 text-[13px] text-ink-soft">
          <Globe className="h-[15px] w-[15px] shrink-0" aria-hidden />
          <label htmlFor="tz" className="sr-only">
            Time zone
          </label>
          <select
            id="tz"
            value={zone}
            onChange={(e) => setChosenZone(e.target.value)}
            className="min-w-0 flex-1 cursor-pointer truncate rounded-md bg-transparent py-1 text-[13px] text-ink-soft hover:text-ink focus:ring-[3px] focus:ring-primary-soft focus:outline-none"
          >
            {!zones.includes(zone) && <option value={zone}>{zone.replace(/_/g, " ")}</option>}
            {zones.map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        {selectedDate ? (
          <>
            <p className="text-sm text-ink-soft">{dayLabel(selectedDate)}</p>
            <ul className="mt-3.5 flex max-h-[420px] flex-col gap-2 overflow-y-auto pr-1" aria-label="Available times">
              {slotsForDay.map((s) => {
                const selected = s === selectedSlot;
                return (
                  <li key={s} className="flex gap-2">
                    <button
                      type="button"
                      aria-pressed={selected}
                      onClick={() => pickSlot(s)}
                      className={cx(
                        "h-12 flex-1 rounded-[10px] border text-[15px] font-semibold transition-colors",
                        selected ? "border-ink bg-ink text-surface" : "border-brand-soft bg-card text-brand hover:border-brand",
                      )}
                    >
                      {timeFmt!.format(new Date(s))}
                    </button>
                    {selected && (
                      <button
                        type="button"
                        onClick={() => setStep("details")}
                        className="blur-in h-12 flex-1 rounded-[10px] bg-brand text-[15px] font-semibold text-white transition hover:opacity-90"
                      >
                        Next
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        ) : (
          Array.isArray(monthSlots) &&
          byDate.size > 0 && <p className="text-sm text-muted lg:pt-12">Pick a highlighted date to see open times.</p>
        )}
      </div>
    </div>
  );
}
