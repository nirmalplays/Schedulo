"use client";

import { Check, X } from "lucide-react";
import { useActionState, useEffect, useState } from "react";
import { TimezoneSelect } from "@/components/timezone-select";
import { Alert, Button, Field, Input } from "@/components/ui";
import { checkUsername, completeOnboarding } from "./actions";

type UsernameCheck = { value: string; ok: boolean; message: string } | null;

export function OnboardingForm({ defaultName, suggestedUsername, linkPrefix }: { defaultName: string; suggestedUsername: string; linkPrefix: string }) {
  const [state, action, pending] = useActionState(completeOnboarding, undefined);
  const [username, setUsername] = useState(suggestedUsername);
  const [check, setCheck] = useState<UsernameCheck>(null);

  // Debounced server check; results for stale input are ignored.
  useEffect(() => {
    if (!username) return;
    let live = true;
    const t = setTimeout(async () => {
      const res = await checkUsername(username);
      if (live) setCheck({ value: username, ...res });
    }, 350);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [username]);

  const status = check && check.value === username ? check : null;

  return (
    <form action={action} className="mt-8 flex flex-col gap-[22px]">
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="Your name" htmlFor="name">
        <Input id="name" name="name" required defaultValue={defaultName} autoComplete="name" className="h-[46px]" />
      </Field>
      <div>
        <label htmlFor="username" className="mb-1.5 block text-[13px] font-semibold text-ink">
          Your link
        </label>
        <div className="flex h-[46px] overflow-hidden rounded-[10px] border border-line-strong bg-card focus-within:border-primary focus-within:ring-[3px] focus-within:ring-primary-soft">
          <span className="flex items-center border-r border-line bg-chip px-3 font-mono text-[13px] whitespace-nowrap text-muted">{linkPrefix}/</span>
          <input
            id="username"
            name="username"
            required
            value={username}
            onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ""))}
            maxLength={30}
            aria-describedby="username-status"
            className="min-w-0 flex-1 bg-transparent px-3 font-mono text-sm text-ink outline-none"
          />
        </div>
        <p id="username-status" aria-live="polite" className="mt-1.5 flex min-h-4 items-center gap-1.5 text-xs">
          {status &&
            (status.ok ? (
              <span className="flex items-center gap-1.5 text-primary">
                <Check className="h-3.5 w-3.5" aria-hidden /> {status.message}
              </span>
            ) : (
              <span className="flex items-center gap-1.5 text-danger">
                <X className="h-3.5 w-3.5" aria-hidden /> {status.message}
              </span>
            ))}
        </p>
      </div>
      <Field label="Time zone" htmlFor="timezone">
        <TimezoneSelect id="timezone" name="timezone" />
      </Field>
      <Button type="submit" size="lg" disabled={pending || status?.ok === false} className="mt-2.5 w-full">
        {pending ? "Setting up…" : "Continue to dashboard"}
      </Button>
    </form>
  );
}
