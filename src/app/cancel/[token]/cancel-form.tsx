"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { cancelByTokenAction } from "@/app/actions/booking";
import { Alert, Button, Field, Textarea } from "@/components/ui";

export function CancelForm({ token }: { token: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  return (
    <form
      action={(form) =>
        startTransition(async () => {
          const res = await cancelByTokenAction(token, String(form.get("reason") ?? ""));
          if (res.ok) router.push(`/booking/${token}`);
          else setError(res.message);
        })
      }
      className="space-y-4"
    >
      {error && <Alert>{error}</Alert>}
      <Field label="Reason for cancelling" htmlFor="reason" hint="Optional. Shared with the host.">
        <Textarea id="reason" name="reason" maxLength={500} />
      </Field>
      <Button type="submit" variant="danger" disabled={pending}>
        {pending ? "Cancelling…" : "Cancel meeting"}
      </Button>
    </form>
  );
}
