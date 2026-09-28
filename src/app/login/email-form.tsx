"use client";

import { useActionState } from "react";
import { Alert, Button, Field, Input } from "@/components/ui";
import { signInWithEmail } from "./actions";

export function EmailForm() {
  const [state, action, pending] = useActionState(signInWithEmail, undefined);
  return (
    <form action={action} className="space-y-3">
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="Work email" htmlFor="email">
        <Input id="email" name="email" type="email" required autoComplete="email" placeholder="you@company.com" className="h-[46px]" />
      </Field>
      <Button type="submit" size="lg" className="h-12 w-full" disabled={pending}>
        {pending ? "Sending…" : "Email me a sign-in link"}
      </Button>
    </form>
  );
}
