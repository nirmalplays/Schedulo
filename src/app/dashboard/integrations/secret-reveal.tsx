"use client";

import { Check, Copy, ShieldAlert } from "lucide-react";
import { useState } from "react";

/** Shows a secret exactly once, with a copy button. */
export function SecretReveal({ title, secret }: { title: string; secret: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-[12px] border border-[#e9dcb6] bg-warn-soft p-4" role="status">
      <p className="flex items-center gap-2 text-sm font-bold text-warn-ink">
        <ShieldAlert className="h-4 w-4" aria-hidden /> {title}
      </p>
      <p className="mt-1 text-sm text-warn-ink">Copy it now. For your security it won&apos;t be shown again.</p>
      <div className="mt-3 flex items-center gap-2">
        <code className="min-w-0 flex-1 truncate rounded-lg border border-[#e9dcb6] bg-card px-3 py-2 font-mono text-sm text-ink">{secret}</code>
        <button
          type="button"
          onClick={async () => {
            await navigator.clipboard.writeText(secret);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          }}
          className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-[#d9c58c] bg-card px-3 text-sm font-semibold text-warn-ink hover:bg-[#efe3bf]"
        >
          {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
        </button>
      </div>
    </div>
  );
}
