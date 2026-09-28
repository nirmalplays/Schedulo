"use client";

import { ChevronDown, ChevronUp } from "lucide-react";
import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { cx } from "@/components/ui";

/** Tab cards with counts that ease up from zero on first view. */
export function StatCards({ items }: { items: { id: string; label: string; value: number; href: string; active: boolean }[] }) {
  const [p, setP] = useState(0);
  useEffect(() => {
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let raf = 0;
    const t0 = performance.now();
    const step = (now: number) => {
      const t = reduced ? 1 : Math.min(1, (now - t0) / 700);
      setP(1 - Math.pow(1 - t, 3));
      if (t < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <nav aria-label="Meeting status" className="grid grid-cols-[repeat(auto-fit,minmax(160px,1fr))] gap-3">
      {items.map((s) => (
        <Link
          key={s.id}
          href={s.href}
          aria-current={s.active ? "page" : undefined}
          className={cx(
            "rounded-[14px] border bg-card px-5 py-[18px] transition-colors hover:border-ink",
            s.active ? "border-ink" : "border-line",
          )}
        >
          <span className="block text-[13px] text-muted">{s.label}</span>
          <span className="mt-1.5 block font-serif text-[44px] leading-none text-ink tabular-nums">
            <span aria-hidden>{Math.round(s.value * p)}</span>
            <span className="sr-only">{s.value}</span>
          </span>
        </Link>
      ))}
    </nav>
  );
}

/** A meeting row: summary + actions, with an expandable details panel. */
export function MeetingItem({
  time,
  summary,
  details,
  actions,
  first,
  id,
}: {
  time: ReactNode;
  summary: ReactNode;
  details: ReactNode;
  actions?: ReactNode;
  first: boolean;
  id: string;
}) {
  const [open, setOpen] = useState(false);
  const panelId = `details-${id}`;
  return (
    <div className={cx("px-5 py-4", !first && "border-t border-line-soft")}>
      <div className="grid items-start gap-4 sm:grid-cols-[minmax(150px,190px)_minmax(0,1fr)_auto]">
        {time}
        <div className="min-w-0">
          {summary}
          {open && (
            <div id={panelId} className="mt-3.5 grid grid-cols-[repeat(auto-fit,minmax(180px,1fr))] gap-3.5 rounded-[10px] bg-[#f6f4ef] p-4">
              {details}
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-controls={panelId}
            className="flex items-center gap-1 rounded text-[13px] font-semibold text-primary hover:text-primary-hover"
          >
            {open ? "Hide" : "Details"}
            {open ? <ChevronUp className="h-3.5 w-3.5" aria-hidden /> : <ChevronDown className="h-3.5 w-3.5" aria-hidden />}
          </button>
          {actions}
        </div>
      </div>
    </div>
  );
}

export function Detail({ k, children }: { k: string; children: ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.06em] text-muted uppercase">{k}</p>
      <div className="mt-[3px] text-sm [overflow-wrap:anywhere] text-ink">{children}</div>
    </div>
  );
}
