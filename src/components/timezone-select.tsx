"use client";

import { useState } from "react";
import { useDetectedZone, useTimeZones } from "@/lib/timezones";
import { Select } from "./ui";

/** Timezone picker; with no defaultValue it pre-selects the browser's zone. */
export function TimezoneSelect({ name, id, defaultValue }: { name: string; id?: string; defaultValue?: string }) {
  const detected = useDetectedZone();
  const zones = useTimeZones();
  const [chosen, setChosen] = useState<string | null>(null);
  const value = chosen ?? defaultValue ?? detected ?? "Asia/Kolkata";

  return (
    <Select id={id} name={name} value={value} onChange={(e) => setChosen(e.target.value)}>
      {!zones.includes(value) && <option value={value}>{value.replace(/_/g, " ")}</option>}
      {zones.map((z) => (
        <option key={z} value={z}>
          {z.replace(/_/g, " ")}
        </option>
      ))}
    </Select>
  );
}
