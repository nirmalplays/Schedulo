"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useState, useTransition } from "react";
import { TimezoneSelect } from "@/components/timezone-select";
import { Alert, Button, Card, CardHeader, Switch, cx } from "@/components/ui";
import { WEEKDAYS, type TimeInterval, type WeeklyRules } from "@/db/schema";
import { saveAvailability } from "../actions";

const SHORT: Record<(typeof WEEKDAYS)[number], string> = { mon: "Mon", tue: "Tue", wed: "Wed", thu: "Thu", fri: "Fri", sat: "Sat", sun: "Sun" };
const LONG: Record<(typeof WEEKDAYS)[number], string> = {
  mon: "Monday", tue: "Tuesday", wed: "Wednesday", thu: "Thursday", fri: "Friday", sat: "Saturday", sun: "Sunday",
};

const toMin = (hm: string) => {
  const [h, m] = hm.split(":").map(Number);
  return h * 60 + m;
};
/** "HH:mm" plus one hour, capped at "24:00". */
const addHour = (hm: string) => {
  const t = Math.min(toMin(hm) + 60, 24 * 60);
  return `${String(Math.floor(t / 60)).padStart(2, "0")}:${String(t % 60).padStart(2, "0")}`;
};

const timeInput =
  "h-[34px] min-w-0 flex-1 rounded-lg sm:w-[124px] sm:flex-none border border-line-strong bg-card px-2.5 font-mono text-[13px] text-ink focus:border-primary focus:ring-[3px] focus:ring-primary-soft focus:outline-none";

export function IntervalRow({ interval, onChange, onRemove, label }: {
  interval: TimeInterval;
  onChange: (i: TimeInterval) => void;
  onRemove?: () => void;
  label: string;
}) {
  return (
    <div className="flex min-w-0 flex-1 items-center gap-2 sm:flex-none">
      <input type="time" step={900} aria-label={`${label} start`} value={interval.start} onChange={(e) => onChange({ ...interval, start: e.target.value })} className={timeInput} />
      <span className="text-muted">–</span>
      <input
        type="time"
        step={900}
        aria-label={`${label} end`}
        value={interval.end === "24:00" ? "23:59" : interval.end}
        onChange={(e) => onChange({ ...interval, end: e.target.value === "23:59" ? "24:00" : e.target.value })}
        className={timeInput}
      />
      {onRemove && (
        <button type="button" onClick={onRemove} aria-label={`Remove ${label}`} className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink">
          <X className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

export function WeeklyHoursForm({ timezone, weeklyRules }: { timezone: string; weeklyRules: WeeklyRules }) {
  const [rules, setRules] = useState<WeeklyRules>(weeklyRules);
  const [state, action, pending] = useActionState(saveAvailability, undefined);
  const [, startTransition] = useTransition();

  const setDay = (day: (typeof WEEKDAYS)[number], intervals: TimeInterval[]) => setRules((r) => ({ ...r, [day]: intervals }));
  const minutes = WEEKDAYS.reduce((sum, d) => sum + (rules[d] ?? []).reduce((s, iv) => s + Math.max(0, toMin(iv.end) - toMin(iv.start)), 0), 0);
  const hours = Math.round((minutes / 60) * 10) / 10;

  return (
    <Card>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
      >
        <input type="hidden" name="weeklyRules" value={JSON.stringify(rules)} />
        <CardHeader
          title="Weekly hours"
          description={timezone.replace(/_/g, " ")}
          actions={<span className="font-mono text-xs text-primary">{hours} hrs / week</span>}
        />
        <ul className="px-[22px] pt-2 pb-3.5">
          {WEEKDAYS.map((day) => {
            const intervals = rules[day] ?? [];
            const on = intervals.length > 0;
            return (
              <li key={day} className="flex min-h-10 flex-wrap items-start gap-3.5 border-b border-[#f0ede6] py-2.5 last:border-b-0">
                <div className="flex items-center gap-3.5 pt-[7px]">
                  <Switch checked={on} onChange={(next) => setDay(day, next ? [{ start: "09:00", end: "17:00" }] : [])} label={`${LONG[day]} available`} />
                  <span className="w-11 text-sm font-semibold text-ink">{SHORT[day]}</span>
                </div>
                <div className="flex min-w-0 basis-full flex-col gap-2 sm:basis-0 sm:flex-1">
                  {!on && <p className="pt-[7px] text-sm text-muted">Unavailable</p>}
                  {intervals.map((iv, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <IntervalRow
                        label={`${LONG[day]} range ${i + 1}`}
                        interval={iv}
                        onChange={(next) => setDay(day, intervals.map((x, j) => (j === i ? next : x)))}
                        onRemove={intervals.length > 1 ? () => setDay(day, intervals.filter((_, j) => j !== i)) : undefined}
                      />
                      {i === intervals.length - 1 && iv.end !== "24:00" && (
                        <button
                          type="button"
                          aria-label={`Add another range on ${LONG[day]}`}
                          title="Add range"
                          onClick={() => setDay(day, [...intervals, { start: iv.end, end: addHour(iv.end) }])}
                          className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </li>
            );
          })}
        </ul>
        <div className="flex flex-wrap items-end gap-3 border-t border-line-soft px-[22px] py-4">
          <div className="min-w-[220px] flex-1">
            <label htmlFor="timezone" className="mb-1.5 block text-[13px] font-semibold text-ink">
              Time zone
            </label>
            <TimezoneSelect id="timezone" name="timezone" defaultValue={timezone} />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save availability"}
          </Button>
        </div>
        {(state?.error || (state?.ok && !pending)) && (
          <div className={cx("px-[22px] pb-4")}>
            {state?.error ? <Alert>{state.error}</Alert> : <Alert tone="green">Availability saved.</Alert>}
          </div>
        )}
      </form>
    </Card>
  );
}
