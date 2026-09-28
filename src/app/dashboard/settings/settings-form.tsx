"use client";

import { useActionState, useTransition } from "react";
import { TimezoneSelect } from "@/components/timezone-select";
import { Alert, Button, Card, Field, Input, Textarea } from "@/components/ui";
import { saveSettings } from "../actions";

type Props = { user: { name: string; username: string; bio: string; timezone: string; brandColor: string; email: string } };

export function SettingsForm({ user }: Props) {
  const [state, action, pending] = useActionState(saveSettings, undefined);
  const [, startTransition] = useTransition();

  return (
    <Card className="p-6">
      <form
        className="space-y-4"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          startTransition(() => action(data));
        }}
      >
        {state?.error && <Alert>{state.error}</Alert>}
        {state?.ok && !pending && <Alert tone="green">Settings saved.</Alert>}
        <Field label="Email">
          <p className="text-sm text-ink-soft">{user.email}</p>
        </Field>
        <Field label="Name" htmlFor="name">
          <Input id="name" name="name" required defaultValue={user.name} />
        </Field>
        <Field label="Username" htmlFor="username" hint="Changing it breaks links you've already shared.">
          <Input id="username" name="username" required defaultValue={user.username} />
        </Field>
        <Field label="Bio" htmlFor="bio">
          <Textarea id="bio" name="bio" defaultValue={user.bio} maxLength={500} />
        </Field>
        <Field label="Time zone" htmlFor="timezone" hint="Used for your dashboard and emails. Availability has its own time zone.">
          <TimezoneSelect id="timezone" name="timezone" defaultValue={user.timezone} />
        </Field>
        <Field label="Brand color" htmlFor="brandColor">
          <input id="brandColor" name="brandColor" type="color" defaultValue={user.brandColor} className="h-10 w-20 cursor-pointer rounded border border-line-strong" />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save settings"}
        </Button>
      </form>
    </Card>
  );
}
