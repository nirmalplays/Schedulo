import { and, asc, eq } from "drizzle-orm";
import type { CSSProperties } from "react";
import { z } from "zod";
import { db } from "@/db";
import { bookingQuestions, eventTypes, users, type User } from "@/db/schema";

export const RESERVED_USERNAMES = new Set([
  "api", "app", "admin", "booking", "bookings", "cancel", "reschedule", "dashboard", "login", "logout",
  "onboarding", "settings", "signup", "help", "support", "pricing", "about", "terms", "privacy", "embed",
  "team", "teams", "static", "_next", "public", "www", "mail",
]);

export const usernameSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9](?:[a-z0-9-]{1,28}[a-z0-9])$/, "3–30 characters: letters, numbers and dashes")
  .refine((u) => !RESERVED_USERNAMES.has(u), "That username is reserved");

export const brandStyle = (user: Pick<User, "brandColor">) => ({ "--brand": user.brandColor }) as CSSProperties;

export async function getPublicHost(username: string) {
  const [host] = await db.select().from(users).where(eq(users.username, username.toLowerCase())).limit(1);
  return host ?? null;
}

export async function getPublicEventType(username: string, slug: string) {
  const [row] = await db
    .select({ eventType: eventTypes, host: users })
    .from(eventTypes)
    .innerJoin(users, eq(users.id, eventTypes.userId))
    .where(and(eq(users.username, username.toLowerCase()), eq(eventTypes.slug, slug), eq(eventTypes.isActive, true)))
    .limit(1);
  if (!row) return null;
  const questions = await db
    .select()
    .from(bookingQuestions)
    .where(eq(bookingQuestions.eventTypeId, row.eventType.id))
    .orderBy(asc(bookingQuestions.position));
  return { ...row, questions };
}
