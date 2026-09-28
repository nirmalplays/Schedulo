"use client";

import { useActionState, useTransition } from "react";
import { Alert, Button, Select } from "@/components/ui";
import { disconnectCalendar, saveCalendarSettings } from "./actions";

type Cal = { id: string; summary: string; primary: boolean; writable: boolean };

/** Google calls the primary calendar by the account email; we store it as "primary". */
const idOf = (c: Cal) => (c.primary ? "primary" : c.id);

export function CalendarSettingsForm({ connectionId, calendars, check, write }: {
  connectionId: string;
  calendars: Cal[];
  check: string[];
  write: string;
}) {
  const [state, action, pending] = useActionState(saveCalendarSettings, undefined);
  const [, startTransition] = useTransition();

  return (
    <form
      className="mt-6 space-y-6"
      onSubmit={(e) => {
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      <input type="hidden" name="connectionId" value={connectionId} />
      {state?.error && <Alert>{state.error}</Alert>}
      {state?.ok && !pending && <Alert tone="green">Calendar settings saved.</Alert>}

      <fieldset>
        <legend className="text-sm font-medium">Check these calendars for conflicts</legend>
        <p className="text-xs text-muted">Busy times on these calendars won&apos;t be offered to invitees.</p>
        <div className="mt-3 space-y-2">
          {calendars.map((c) => (
            <label key={c.id} className="flex items-center gap-2 text-sm">
              <input type="checkbox" name="check" value={idOf(c)} defaultChecked={check.includes(idOf(c))} className="h-4 w-4" />
              {c.summary}
              {c.primary && <span className="text-xs text-muted">(primary)</span>}
            </label>
          ))}
        </div>
      </fieldset>

      <div className="max-w-sm">
        <label htmlFor={`write-${connectionId}`} className="text-sm font-medium">
          Add new bookings to
        </label>
        <Select id={`write-${connectionId}`} name="write" defaultValue={write} className="mt-1.5">
          {calendars
            .filter((c) => c.writable)
            .map((c) => (
              <option key={c.id} value={idOf(c)}>
                {c.summary}
                {c.primary ? " (primary)" : ""}
              </option>
            ))}
        </Select>
      </div>

      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save"}
      </Button>
    </form>
  );
}

export function DisconnectButton({ connectionId }: { connectionId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      type="button"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (confirm("Disconnect this calendar? Its busy times will stop blocking your availability.")) {
          startTransition(() => disconnectCalendar(connectionId));
        }
      }}
    >
      {pending ? "Disconnecting…" : "Disconnect"}
    </Button>
  );
}
