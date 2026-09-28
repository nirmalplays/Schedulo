"use client";

import { useActionState, useTransition } from "react";
import { Alert, Button, Card, Field, Input } from "@/components/ui";
import { createTokenAction, revokeTokenAction } from "../actions";
import { SecretReveal } from "../secret-reveal";

export function NewTokenForm() {
  const [state, action, pending] = useActionState(createTokenAction, undefined);
  return (
    <Card className="space-y-4 self-start p-6">
      <p className="font-bold text-ink">Generate new token</p>
      {state?.secret && <SecretReveal title={`Token “${state.label}” created:`} secret={state.secret} />}
      {state?.error && <Alert>{state.error}</Alert>}
      <form action={action} className="space-y-4">
        <Field label="Token name" htmlFor="token-name">
          <Input id="token-name" name="name" required maxLength={80} placeholder="e.g. Zapier" />
        </Field>
        <Button type="submit" disabled={pending}>
          {pending ? "Generating…" : "Generate token"}
        </Button>
      </form>
    </Card>
  );
}

export function RevokeToken({ id }: { id: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <Button
      size="sm"
      variant="danger"
      disabled={pending}
      onClick={() => {
        if (confirm("Revoke this token? Apps using it will stop working.")) startTransition(() => revokeTokenAction(id));
      }}
    >
      Revoke
    </Button>
  );
}
