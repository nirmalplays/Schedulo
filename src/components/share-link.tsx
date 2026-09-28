"use client";

import { Check, Link2, MessageCircle } from "lucide-react";
import { useState } from "react";
import { cx } from "./ui";

export function useCopy() {
  const [copied, setCopied] = useState(false);
  return {
    copied,
    copy: async (text: string) => {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    },
  };
}

/** "Copy link": a bordered button, or a bare green text link (card footers). */
export function CopyButton({
  text,
  label = "Copy link",
  variant = "button",
  className,
}: {
  text: string;
  label?: string;
  variant?: "button" | "link";
  className?: string;
}) {
  const { copied, copy } = useCopy();
  const Icon = copied ? Check : Link2;
  return (
    <button
      type="button"
      onClick={() => copy(text)}
      className={cx(
        "inline-flex items-center gap-1.5 text-[13px] font-semibold transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary",
        variant === "button"
          ? "h-9 rounded-[9px] border border-line-strong bg-card px-3.5 text-ink hover:border-ink"
          : "rounded text-primary hover:text-primary-hover",
        className,
      )}
    >
      <Icon className="h-3.5 w-3.5" aria-hidden />
      <span aria-live="polite">{copied ? "Copied" : label}</span>
    </button>
  );
}

export function WhatsAppShare({ text }: { text: string }) {
  return (
    <a
      href={`https://wa.me/?text=${encodeURIComponent(text)}`}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line-strong bg-card px-3.5 text-[13px] font-semibold text-ink hover:border-ink"
    >
      <MessageCircle className="h-3.5 w-3.5" aria-hidden />
      Share on WhatsApp
    </a>
  );
}
