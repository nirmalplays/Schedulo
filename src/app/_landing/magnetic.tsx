"use client";

import { useRef, type ReactNode } from "react";
import { prefersReducedMotion } from "./motion-pref";

/** Nudges its child toward the pointer (off with reduced motion or touch). */
export function Magnetic({ children, strength = 5, className }: { children: ReactNode; strength?: number; className?: string }) {
  const ref = useRef<HTMLSpanElement>(null);
  return (
    <span
      ref={ref}
      className={`inline-block transition-transform duration-300 ease-[cubic-bezier(.2,.8,.2,1)] ${className ?? ""}`}
      onPointerMove={(e) => {
        if (e.pointerType !== "mouse" || prefersReducedMotion()) return;
        const el = ref.current!;
        const r = el.getBoundingClientRect();
        el.style.transform = `translate(${(e.clientX - r.left - r.width / 2) / strength}px, ${(e.clientY - r.top - r.height / 2) / strength}px)`;
      }}
      onPointerLeave={() => {
        if (ref.current) ref.current.style.transform = "translate(0,0)";
      }}
    >
      {children}
    </span>
  );
}
