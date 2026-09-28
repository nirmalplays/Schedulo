"use client";

import { useEffect, useRef } from "react";
import { prefersReducedMotion } from "./motion-pref";

const SRC =
  "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4";

/**
 * Hero background: fades in over 0.5s, out over the last 0.5s, goes dark ~100ms,
 * then replays. Opacity is written straight to the element (no React state per frame).
 */
export function HeroVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    if (prefersReducedMotion()) {
      v.style.opacity = "1";
      return;
    }
    let raf = 0;
    let timeout: ReturnType<typeof setTimeout> | undefined;
    const tick = () => {
      const t = v.currentTime;
      const d = v.duration;
      if (d && !Number.isNaN(d)) {
        const o = t < 0.5 ? t / 0.5 : d - t < 0.5 ? (d - t) / 0.5 : 1;
        v.style.opacity = String(Math.max(0, Math.min(1, o)));
      }
      raf = requestAnimationFrame(tick);
    };
    const play = () => {
      if (v.paused) v.play().catch(() => {});
    };
    const onEnded = () => {
      v.style.opacity = "0";
      timeout = setTimeout(() => {
        v.currentTime = 0;
        play();
      }, 100);
    };
    const onVisible = () => document.visibilityState === "visible" && play();

    v.addEventListener("ended", onEnded);
    v.addEventListener("canplay", play);
    document.addEventListener("visibilitychange", onVisible);
    play();
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      clearTimeout(timeout);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("canplay", play);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  return (
    <video
      ref={ref}
      src={SRC}
      muted
      playsInline
      preload="auto"
      aria-hidden="true"
      className="absolute inset-0 h-full w-full object-cover"
      style={{ opacity: 0 }}
    />
  );
}
