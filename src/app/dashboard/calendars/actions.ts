"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { calendarConnections } from "@/db/schema";
import { revokeToken } from "@/lib/google/api";
import { invalidateBusyCache } from "@/lib/google/calendar";
import { decrypt } from "@/lib/crypto";
import { requireHost } from "@/lib/session";
import type { FormState } from "../actions";

const settingsSchema = z.object({
  connectionId: z.string().min(1),
  check: z.array(z.string().min(1).max(300)).max(50),
  write: z.string().min(1).max(300),
});

export async function saveCalendarSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const host = await requireHost();
  const parsed = settingsSchema.safeParse({
    connectionId: form.get("connectionId"),
    check: form.getAll("check"),
    write: form.get("write"),
  });
  if (!parsed.success) return { error: "Invalid calendar selection" };
  const { connectionId, check, write } = parsed.data;

  const [updated] = await db
    .update(calendarConnections)
    .set({ checkCalendarIds: check, writeCalendarId: write, updatedAt: new Date() })
    .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.userId, host.id)))
    .returning({ id: calendarConnections.id });
  if (!updated) return { error: "Calendar connection not found" };
  invalidateBusyCache(host.id);
  revalidatePath("/dashboard/calendars");
  return { ok: true };
}

export async function disconnectCalendar(connectionId: string) {
  const host = await requireHost();
  const [conn] = await db
    .delete(calendarConnections)
    .where(and(eq(calendarConnections.id, connectionId), eq(calendarConnections.userId, host.id)))
    .returning();
  if (conn?.refreshTokenEnc) {
    // Best effort: also revoke our access at Google.
    try {
      await revokeToken(decrypt(conn.refreshTokenEnc));
    } catch {}
  }
  invalidateBusyCache(host.id);
  revalidatePath("/dashboard/calendars");
}
