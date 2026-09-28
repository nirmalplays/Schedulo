"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import {
  bookingQuestions,
  bookings,
  dateOverrides,
  eventTypes,
  schedules,
  users,
  EVENT_COLORS,
  WEEKDAYS,
  type LocationType,
  type TimeInterval,
} from "@/db/schema";
import { cancelBooking, isValidZone } from "@/lib/bookings";
import { syncBookingCancelled } from "@/lib/google/calendar";
import { dispatchEvent } from "@/lib/integrations/webhooks";
import { notifyBookingCancelled } from "@/lib/notifications";
import { usernameSchema } from "@/lib/public";
import { requireHost } from "@/lib/session";

export type FormState = { error?: string; ok?: boolean } | undefined;

const firstError = (e: z.ZodError) => {
  const issue = e.issues[0];
  return issue.path.length ? `${issue.path.join(".")}: ${issue.message}` : issue.message;
};

// ---------------------------------------------------------------------------
// Time intervals
// ---------------------------------------------------------------------------

const hm = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$|^24:00$/, "Use HH:mm");
const intervalsSchema = z
  .array(z.object({ start: hm, end: hm }))
  .max(12)
  .superRefine((list, ctx) => {
    const sorted = [...list].sort((a, b) => a.start.localeCompare(b.start));
    sorted.forEach((iv, i) => {
      if (iv.start >= iv.end) ctx.addIssue({ code: "custom", message: `${iv.start}–${iv.end} ends before it starts` });
      if (i > 0 && sorted[i - 1].end > iv.start) ctx.addIssue({ code: "custom", message: "Time ranges overlap" });
    });
  });

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

const optionalInt = (min: number, max: number) =>
  z.preprocess((v) => (v === "" || v == null ? null : Number(v)), z.number().int().min(min).max(max).nullable());

const eventTypeSchema = z.object({
  id: z.string().optional(),
  title: z.string().trim().min(1, "Title is required").max(100),
  slug: z
    .string()
    .trim()
    .toLowerCase()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "URL slug may contain letters, numbers and dashes")
    .max(60),
  description: z.string().trim().max(2000).optional(),
  color: z.enum(EVENT_COLORS).default(EVENT_COLORS[0]),
  durationMin: z.coerce.number().int().min(5).max(720),
  locationType: z.enum(["google_meet", "zoom", "phone", "in_person", "custom"] satisfies LocationType[]),
  locationValue: z.string().trim().max(300).optional(),
  bufferBeforeMin: z.coerce.number().int().min(0).max(240),
  bufferAfterMin: z.coerce.number().int().min(0).max(240),
  minNoticeHours: z.coerce.number().min(0).max(24 * 60),
  windowDays: z.coerce.number().int().min(1).max(365),
  dailyCap: optionalInt(1, 100),
  slotIntervalMin: optionalInt(5, 720),
  isSecret: z.preprocess((v) => v === "on", z.boolean()),
  questions: z.preprocess(
    (v) => JSON.parse(String(v || "[]")),
    z
      .array(
        z.object({
          label: z.string().trim().min(1, "Question label is required").max(200),
          type: z.enum(["text", "textarea", "select", "phone"]),
          required: z.boolean(),
          options: z.array(z.string().trim().min(1).max(100)).max(30).nullable(),
        }),
      )
      .max(20),
  ),
});

export async function saveEventType(_prev: FormState, form: FormData): Promise<FormState> {
  const host = await requireHost();
  const parsed = eventTypeSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;

  for (const q of d.questions) {
    if (q.type === "select" && !q.options?.length) return { error: `Add at least one option to "${q.label}"` };
  }

  const [slugTaken] = await db
    .select({ id: eventTypes.id })
    .from(eventTypes)
    .where(and(eq(eventTypes.userId, host.id), eq(eventTypes.slug, d.slug), d.id ? ne(eventTypes.id, d.id) : undefined))
    .limit(1);
  if (slugTaken) return { error: "You already have an event type with that URL slug" };

  const values = {
    title: d.title,
    slug: d.slug,
    description: d.description || null,
    color: d.color,
    durationMin: d.durationMin,
    location: { type: d.locationType, value: d.locationValue || undefined },
    bufferBeforeMin: d.bufferBeforeMin,
    bufferAfterMin: d.bufferAfterMin,
    minNoticeMin: Math.round(d.minNoticeHours * 60),
    windowDays: d.windowDays,
    dailyCap: d.dailyCap,
    slotIntervalMin: d.slotIntervalMin,
    isSecret: d.isSecret,
  };

  await db.transaction(async (tx) => {
    let id = d.id;
    if (id) {
      const [updated] = await tx
        .update(eventTypes)
        .set(values)
        .where(and(eq(eventTypes.id, id), eq(eventTypes.userId, host.id)))
        .returning({ id: eventTypes.id });
      if (!updated) throw new Error("Event type not found");
      await tx.delete(bookingQuestions).where(eq(bookingQuestions.eventTypeId, id));
    } else {
      const [created] = await tx.insert(eventTypes).values({ ...values, userId: host.id }).returning({ id: eventTypes.id });
      id = created.id;
    }
    if (d.questions.length) {
      await tx.insert(bookingQuestions).values(
        d.questions.map((q, position) => ({
          eventTypeId: id!,
          label: q.label,
          type: q.type,
          required: q.required,
          options: q.type === "select" ? q.options : null,
          position,
        })),
      );
    }
  });

  revalidatePath("/dashboard");
  redirect("/dashboard");
}

export async function toggleEventTypeActive(id: string, isActive: boolean) {
  const host = await requireHost();
  await db.update(eventTypes).set({ isActive }).where(and(eq(eventTypes.id, id), eq(eventTypes.userId, host.id)));
  revalidatePath("/dashboard");
}

/** Copies an event type (and its questions) as a new, active "(copy)". */
export async function duplicateEventType(id: string) {
  const host = await requireHost();
  const [src] = await db.select().from(eventTypes).where(and(eq(eventTypes.id, id), eq(eventTypes.userId, host.id))).limit(1);
  if (!src) return;
  const taken = new Set(
    (await db.select({ slug: eventTypes.slug }).from(eventTypes).where(eq(eventTypes.userId, host.id))).map((r) => r.slug),
  );
  let slug = `${src.slug}-copy`;
  for (let n = 2; taken.has(slug); n++) slug = `${src.slug}-copy-${n}`;

  await db.transaction(async (tx) => {
    const { id: _id, createdAt: _c, ...rest } = src;
    const [copy] = await tx.insert(eventTypes).values({ ...rest, slug, title: `${src.title} (copy)` }).returning({ id: eventTypes.id });
    const questions = await tx.select().from(bookingQuestions).where(eq(bookingQuestions.eventTypeId, src.id));
    if (questions.length) {
      await tx.insert(bookingQuestions).values(questions.map(({ id: _q, ...q }) => ({ ...q, eventTypeId: copy.id })));
    }
  });
  revalidatePath("/dashboard");
}

export async function deleteEventType(id: string): Promise<FormState> {
  const host = await requireHost();
  const [hasBookings] = await db.select({ id: bookings.id }).from(bookings).where(eq(bookings.eventTypeId, id)).limit(1);
  if (hasBookings) return { error: "This event type has bookings. Turn it off instead so past bookings keep their history." };
  await db.delete(eventTypes).where(and(eq(eventTypes.id, id), eq(eventTypes.userId, host.id)));
  revalidatePath("/dashboard");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

const availabilitySchema = z.object({
  timezone: z.string().refine(isValidZone, "Unknown timezone"),
  weeklyRules: z.preprocess(
    (v) => JSON.parse(String(v)),
    z.object(Object.fromEntries(WEEKDAYS.map((d) => [d, intervalsSchema])) as Record<(typeof WEEKDAYS)[number], typeof intervalsSchema>),
  ),
});

export async function saveAvailability(_prev: FormState, form: FormData): Promise<FormState> {
  const host = await requireHost();
  const parsed = availabilitySchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  await db
    .update(schedules)
    .set({ timezone: parsed.data.timezone, weeklyRules: parsed.data.weeklyRules })
    .where(and(eq(schedules.userId, host.id), eq(schedules.isDefault, true)));
  revalidatePath("/dashboard/availability");
  return { ok: true };
}

const overrideSchema = z.object({
  date: z.iso.date(),
  intervals: z.preprocess((v) => JSON.parse(String(v || "[]")), intervalsSchema),
  label: z.string().trim().max(60).optional(),
});

export async function saveOverride(_prev: FormState, form: FormData): Promise<FormState> {
  const host = await requireHost();
  const parsed = overrideSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const [schedule] = await db
    .select({ id: schedules.id })
    .from(schedules)
    .where(and(eq(schedules.userId, host.id), eq(schedules.isDefault, true)))
    .limit(1);
  if (!schedule) return { error: "No schedule found" };

  await db
    .insert(dateOverrides)
    .values({
      scheduleId: schedule.id,
      date: parsed.data.date,
      intervals: parsed.data.intervals as TimeInterval[],
      label: parsed.data.label || null,
    })
    .onConflictDoUpdate({
      target: [dateOverrides.scheduleId, dateOverrides.date],
      set: { intervals: parsed.data.intervals, label: parsed.data.label || null },
    });
  revalidatePath("/dashboard/availability");
  return { ok: true };
}

export async function deleteOverride(id: string) {
  const host = await requireHost();
  const [owned] = await db
    .select({ id: dateOverrides.id })
    .from(dateOverrides)
    .innerJoin(schedules, eq(schedules.id, dateOverrides.scheduleId))
    .where(and(eq(dateOverrides.id, id), eq(schedules.userId, host.id)))
    .limit(1);
  if (owned) await db.delete(dateOverrides).where(eq(dateOverrides.id, id));
  revalidatePath("/dashboard/availability");
}

// ---------------------------------------------------------------------------
// Profile settings
// ---------------------------------------------------------------------------

const settingsSchema = z.object({
  name: z.string().trim().min(1).max(80),
  username: usernameSchema,
  bio: z.string().trim().max(500).optional(),
  timezone: z.string().refine(isValidZone, "Unknown timezone"),
  brandColor: z.string().regex(/^#[0-9a-fA-F]{6}$/, "Brand color must be a hex color like #2563eb"),
});

export async function saveSettings(_prev: FormState, form: FormData): Promise<FormState> {
  const host = await requireHost();
  const parsed = settingsSchema.safeParse(Object.fromEntries(form));
  if (!parsed.success) return { error: firstError(parsed.error) };
  const d = parsed.data;
  if (d.username !== host.username) {
    const [taken] = await db.select({ id: users.id }).from(users).where(eq(users.username, d.username)).limit(1);
    if (taken) return { error: "That username is taken" };
  }
  await db
    .update(users)
    .set({ name: d.name, username: d.username, bio: d.bio || null, timezone: d.timezone, brandColor: d.brandColor.toLowerCase() })
    .where(eq(users.id, host.id));
  revalidatePath("/dashboard", "layout");
  return { ok: true };
}

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export async function hostCancelBooking(_prev: FormState, form: FormData): Promise<FormState> {
  const host = await requireHost();
  const res = await cancelBooking({ id: String(form.get("id")), hostId: host.id }, String(form.get("reason") ?? ""));
  if (!res.ok) return { error: res.message };
  after(async () => {
    await syncBookingCancelled(res.ctx);
    await Promise.all([
      notifyBookingCancelled(res.ctx).catch((e) => console.error("[notify] cancel failed", e)),
      dispatchEvent("invitee.canceled", res.ctx),
    ]);
  });
  revalidatePath("/dashboard/meetings");
  return { ok: true };
}
