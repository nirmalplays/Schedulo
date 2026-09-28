"use client";

import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { createWebhookAction, deleteWebhookAction, testWebhookAction, toggleWebhookAction } from "../actions";
import { SecretReveal } from "../secret-reveal";

const EVENTS = [
  { id: "invitee.created", label: "Invitee created", hint: "A meeting is booked" },
  { id: "invitee.rescheduled", label: "Invitee rescheduled", hint: "A meeting moves to a new time" },
  { id: "invitee.canceled", label: "Invitee canceled", hint: "A meeting is canceled" },
];

export function NewWebhookForm() {
  const [state, action, pending] = useActionState(createWebhookAction, undefined);
  return (
    <Card className="space-y-4 self-start p-6">
      <p className="font-bold text-ink">Add webhook</p>
      {state?.secret && <SecretReveal title="Webhook created. Signing key:" secret={state.secret} />}
      {state?.error && <Alert>{state.error}</Alert>}
      <form action={action} className="space-y-4">
        <Field label="Endpoint URL" htmlFor="wh-url">
          <Input id="wh-url" name="url" type="url" required placeholder="https://hooks.zapier.com/hooks/catch/…" />
        </Field>
        <fieldset className="space-y-2">
          <legend className="mb-1 text-sm font-semibold text-ink">Events</legend>
          {EVENTS.map((e) => (
            <label key={e.id} className="flex items-start gap-2 text-sm">
              <input type="checkbox" name="events" value={e.id} defaultChecked className="mt-0.5 h-4 w-4" />
              <span>
                <span className="font-mono text-ink">{e.id}</span>
                <span className="block text-xs text-muted">{e.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={pending}>
          {pending ? "Adding…" : "Add webhook"}
        </Button>
      </form>
    </Card>
  );
}

export function WebhookRowActions({ id, active }: { id: string; active: boolean }) {
  const [pending, startTransition] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);
  return (
    <div className="flex flex-col items-end gap-2">
      <div className="flex gap-2">
        <Button size="sm" variant="outline" disabled={pending} onClick={() => startTransition(async () => setResult(await testWebhookAction(id)))}>
          Send test
        </Button>
        <Button size="sm" variant="secondary" disabled={pending} onClick={() => startTransition(() => toggleWebhookAction(id, !active))}>
          {active ? "Pause" : "Resume"}
        </Button>
        <Button
          size="sm"
          variant="danger"
          disabled={pending}
          onClick={() => {
            if (confirm("Delete this webhook? Deliveries stop immediately.")) startTransition(() => deleteWebhookAction(id));
          }}
        >
          Delete
        </Button>
      </div>
      {result && (
        <p role="status" className={`text-xs ${result.ok ? "text-primary" : "text-danger"}`}>
          {result.message}
        </p>
      )}
    </div>
  );
}
