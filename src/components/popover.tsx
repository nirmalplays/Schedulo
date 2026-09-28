"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { cx } from "./ui";

/** Minimal accessible popover: toggles on click, closes on outside click or Escape. */
export function Popover({
  trigger,
  children,
  align = "right",
  className,
}: {
  trigger: (props: { open: boolean; toggle: () => void; id: string }) => ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div ref={ref} className="relative">
      {trigger({ open, toggle: () => setOpen((o) => !o), id })}
      {open && (
        <div
          id={id}
          role="menu"
          className={cx(
            "absolute z-30 mt-2 min-w-48 rounded-xl border border-line bg-card p-1.5 shadow-[0_16px_40px_-12px_rgba(29,33,31,.3)]",
            align === "right" ? "right-0" : "left-0",
            className,
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ icon, children, danger, ...props }: React.ComponentProps<"button"> & { icon?: ReactNode; danger?: boolean }) {
  return (
    <button
      type="button"
      role="menuitem"
      className={cx(
        "flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] disabled:opacity-50 [&_svg]:h-[15px] [&_svg]:w-[15px]",
        danger ? "text-danger hover:bg-danger-soft" : "text-ink hover:bg-chip",
      )}
      {...props}
    >
      {icon}
      {children}
    </button>
  );
}
