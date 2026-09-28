"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Alert, Button, Textarea } from "@/components/ui";
import { hostCancelBooking } from "../actions";

export function HostCancel({ bookingId }: { bookingId: string }) {
  const [open, setOpen] = useState(false);
  const [state, action, pending] = useActionState(hostCancelBooking, undefined);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onDown);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onDown);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      <Button type="button" variant="danger" size="sm" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
        Cancel
      </Button>
      {open && (
        <form
          action={action}
          className="absolute top-10 right-0 z-20 w-72 space-y-2.5 rounded-xl border border-line bg-card p-3 shadow-[0_16px_40px_-12px_rgba(29,33,31,.3)]"
        >
          <input type="hidden" name="id" value={bookingId} />
          <p className="text-[13px] font-semibold text-ink">Cancel this meeting?</p>
          {state?.error && <Alert>{state.error}</Alert>}
          <Textarea
            name="reason"
            placeholder="Reason (sent to the invitee)"
            className="min-h-16 text-sm"
            maxLength={500}
            aria-label="Cancellation reason"
            autoFocus
          />
          <div className="flex justify-end gap-2">
            <Button type="button" variant="ghost" size="sm" onClick={() => setOpen(false)}>
              Keep it
            </Button>
            <Button type="submit" variant="danger" size="sm" disabled={pending}>
              {pending ? "Cancelling…" : "Cancel meeting"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}
