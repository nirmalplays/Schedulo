"use client";

import { Plus, X } from "lucide-react";
import { useActionState, useEffect, useState, useTransition } from "react";
import { Alert, Button, Card, CardHeader, Field, Input } from "@/components/ui";
import type { TimeInterval } from "@/db/schema";
import { deleteOverride, saveOverride } from "../actions";
import { IntervalRow } from "./weekly-hours";

export type OverrideRow = { id: string; mon: string; day: string; title: string; hours: string };

/** "Date overrides" card: list + collapsible add form. */
export function OverridesCard({ minDate, overrides }: { minDate: string; overrides: OverrideRow[] }) {
  const [adding, setAdding] = useState(false);

  return (
    <Card>
      <CardHeader
        title="Date overrides"
        description="Holidays and one-off changes."
        actions={
          <Button variant="secondary" size="sm" className="h-[34px]" aria-expanded={adding} onClick={() => setAdding((a) => !a)}>
            {adding ? <X className="h-3.5 w-3.5" aria-hidden /> : <Plus className="h-3.5 w-3.5" aria-hidden />}
            {adding ? "Close" : "Add"}
          </Button>
        }
      />
      {adding && <OverrideForm minDate={minDate} onDone={() => setAdding(false)} />}
      <ul>
        {overrides.map((o) => (
          <li key={o.id} className="flex items-center gap-3.5 border-b border-[#f0ede6] px-[22px] py-3.5 last:border-b-0">
            <div className="w-11 shrink-0 text-center">
              <p className="font-mono text-[10px] text-accent-ink">{o.mon}</p>
              <p className="font-serif text-[26px] leading-none text-ink">{o.day}</p>
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-ink">{o.title}</p>
              <p className="mt-0.5 text-[13px] text-muted">{o.hours}</p>
            </div>
            <RemoveOverride id={o.id} label={o.title} />
          </li>
        ))}
        {overrides.length === 0 && !adding && <li className="px-[22px] py-5 text-sm text-muted">No upcoming overrides.</li>}
      </ul>
    </Card>
  );
}

function OverrideForm({ minDate, onDone }: { minDate: string; onDone: () => void }) {
  const [state, action, pending] = useActionState(saveOverride, undefined);
  const [, startTransition] = useTransition();
  const [dayOff, setDayOff] = useState(true);
  const [interval, setOverrideInterval] = useState<TimeInterval>({ start: "09:00", end: "17:00" });

  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form
      className="space-y-3 border-b border-line-soft bg-paper px-[22px] py-4"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {state?.error && <Alert>{state.error}</Alert>}
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Date" htmlFor="override-date">
          <Input id="override-date" name="date" type="date" min={minDate} required />
        </Field>
        <Field label="Label (optional)" htmlFor="override-label">
          <Input id="override-label" name="label" maxLength={60} placeholder="e.g. Diwali" />
        </Field>
      </div>
      <label className="flex items-center gap-2 text-sm text-ink">
        <input type="checkbox" checked={dayOff} onChange={(e) => setDayOff(e.target.checked)} className="h-4 w-4 accent-primary" />
        Unavailable all day
      </label>
      {!dayOff && <IntervalRow label="Override hours" interval={interval} onChange={setOverrideInterval} />}
      <input type="hidden" name="intervals" value={JSON.stringify(dayOff ? [] : [interval])} />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? "Saving…" : "Save override"}
      </Button>
    </form>
  );
}

export function RemoveOverride({ id, label }: { id: string; label: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      disabled={pending}
      aria-label={`Remove override: ${label}`}
      onClick={() => startTransition(() => deleteOverride(id))}
      className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink disabled:opacity-50"
    >
      <X className="h-4 w-4" />
    </button>
  );
}
