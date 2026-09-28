"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion-pref";

/**
 * One rAF loop for every scroll-linked effect on the landing page:
 * - top progress bar
 * - hero media/content fade + lift   ([data-hero-media], [data-hero-content])
 * - word-by-word reveal              ([data-scroll-reveal] > span)
 * - velocity marquee rows            ([data-velocity="-1" | "1"])
 * Everything writes styles directly; nothing re-renders React.
 */
export function ScrollEffects() {
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const reduced = prefersReducedMotion();
    const heroMedia = document.querySelector<HTMLElement>("[data-hero-media]");
    const heroContent = document.querySelector<HTMLElement>("[data-hero-content]");
    const reveals = [...document.querySelectorAll<HTMLElement>("[data-scroll-reveal]")];
    const rows = [...document.querySelectorAll<HTMLElement>("[data-velocity]")];
    const offsets = rows.map(() => 0);

    let lastY = window.scrollY;
    let lastT = performance.now();
    let raf = 0;

    const frame = (now: number) => {
      const y = window.scrollY;
      const vh = window.innerHeight;
      const dt = Math.min(64, now - lastT) / 1000;
      const dy = y - lastY;
      lastY = y;
      lastT = now;

      const max = document.documentElement.scrollHeight - vh;
      if (barRef.current) barRef.current.style.width = `${max > 0 ? (y / max) * 100 : 0}%`;

      if (!reduced) {
        const p = Math.min(1, Math.max(0, y / vh));
        if (heroMedia) {
          heroMedia.style.opacity = String(1 - p * 0.9);
          heroMedia.style.transform = `scale(${1 + p * 0.08})`;
        }
        if (heroContent) {
          heroContent.style.opacity = String(Math.max(0, 1 - p * 1.6));
          heroContent.style.transform = `translateY(${p * -80}px)`;
        }
      }

      for (const el of reveals) {
        const r = el.getBoundingClientRect();
        const prog = Math.min(1, Math.max(0, (vh * 0.85 - r.top) / (r.height + vh * 0.35)));
        const words = el.children;
        for (let i = 0; i < words.length; i++) {
          const f = reduced ? 1 : Math.min(1, Math.max(0, prog * words.length * 1.15 - i));
          const w = words[i] as HTMLElement;
          w.style.opacity = String(0.14 + 0.86 * f);
          w.style.filter = `blur(${(1 - f) * 4}px)`;
        }
      }

      if (!reduced) {
        const boost = Math.max(-2000, Math.min(2000, dy / Math.max(dt, 0.001)));
        rows.forEach((el, i) => {
          const dir = Number(el.dataset.velocity) || -1;
          const half = el.scrollWidth / 2 || 1;
          offsets[i] += dir * (40 + Math.abs(boost) * 0.25) * dt;
          let x = offsets[i] % half;
          if (x > 0) x -= half;
          el.style.transform = `translate3d(${x}px,0,0)`;
        });
      }
      raf = requestAnimationFrame(frame);
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <div
      ref={barRef}
      aria-hidden
      className="fixed top-0 left-0 z-[60] h-0.5 w-0"
      style={{ background: "linear-gradient(to right, #6366f1, #a855f7, #fcd34d)" }}
    />
  );
}
