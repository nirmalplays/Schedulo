/**
 * Mirrors the design's `respectReducedMotion` prop (default false): the landing
 * page's ambient motion (videos, marquee, reveals) is part of the design, so it
 * runs even when the OS asks for reduced motion. Flip to true to honour it.
 */
export const RESPECT_REDUCED_MOTION = false;

export function prefersReducedMotion() {
  return RESPECT_REDUCED_MOTION && typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}
