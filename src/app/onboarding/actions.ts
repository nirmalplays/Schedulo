"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { isValidZone } from "@/lib/bookings";
import { createHostDefaults } from "@/lib/defaults";
import { usernameSchema } from "@/lib/public";
import { getCurrentUser } from "@/lib/session";

const schema = z.object({
  name: z.string().trim().min(1, "Please enter your name").max(80),
  username: usernameSchema,
  timezone: z.string().refine(isValidZone, "Unknown timezone"),
});

/** Live availability check for the username field (signed-in users only). */
export async function checkUsername(raw: string): Promise<{ ok: boolean; message: string }> {
  const user = await getCurrentUser();
  if (!user) return { ok: false, message: "Sign in again to continue." };
  const parsed = usernameSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: parsed.error.issues[0].message };
  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, parsed.data)).limit(1);
  if (taken && taken.id !== user.id) return { ok: false, message: "That link is taken" };
  return { ok: true, message: "Available" };
}

export async function completeOnboarding(_prev: { error?: string } | undefined, form: FormData) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.username) redirect("/dashboard");

  const parsed = schema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const { name, username, timezone } = parsed.data;

  const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, username)).limit(1);
  if (taken) return { error: "That username is taken" };

  try {
    await db.transaction(async (tx) => {
      await tx.update(users).set({ name, username, timezone }).where(eq(users.id, user.id));
      await createHostDefaults(tx, user.id, timezone);
    });
  } catch {
    return { error: "That username is taken" };
  }
  redirect("/dashboard?welcome=1");
}
