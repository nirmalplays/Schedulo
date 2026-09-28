"use client";

import { useSyncExternalStore } from "react";

/** Browsers' ICU still reports some pre-rename IANA names; show the current ones. */
const LEGACY: Record<string, string> = {
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Europe/Kiev": "Europe/Kyiv",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "Pacific/Truk": "Pacific/Chuuk",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Atlantic/Faeroe": "Atlantic/Faroe",
};
export const canonicalZone = (z: string) => LEGACY[z] ?? z;

let zonesCache: string[] | null = null;
function getZones() {
  if (!zonesCache) {
    const raw = typeof Intl.supportedValuesOf === "function" ? Intl.supportedValuesOf("timeZone") : [];
    zonesCache = [...new Set(raw.map(canonicalZone))].sort();
  }
  return zonesCache;
}

const noopSubscribe = () => () => {};
const NO_ZONES: string[] = [];

/** Browser timezone; null during SSR so server and client markup match. */
export const useDetectedZone = () =>
  useSyncExternalStore(noopSubscribe, () => canonicalZone(Intl.DateTimeFormat().resolvedOptions().timeZone), () => null);

/**
 * All zones known to the browser; empty during SSR (Node's ICU list differs
 * from the browser's, which would otherwise cause a hydration mismatch).
 */
export const useTimeZones = () => useSyncExternalStore(noopSubscribe, getZones, () => NO_ZONES);
