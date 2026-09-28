"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion-pref";

/** Section video that only plays while on screen (and never with reduced motion). */
export function LazyVideo({ src, className }: { src: string; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    const reduced = prefersReducedMotion();
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          if (reduced) return;
          v.muted = true;
          v.play().catch(() => {});
        } else {
          v.pause();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(v);
    return () => io.disconnect();
  }, []);

  return <video ref={ref} src={src} muted loop playsInline preload="metadata" aria-hidden="true" className={className} />;
}
