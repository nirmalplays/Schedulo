import {
  boolean,
  date,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  unique,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());

const createdAt = () =>
  timestamp("created_at", { withTimezone: true }).notNull().defaultNow();

// ---------------------------------------------------------------------------
// Users: the app profile for a host. Sign-in is Supabase Auth; for real hosts
// users.id is the Supabase auth user id (auth.users.id).
// ---------------------------------------------------------------------------

export const users = pgTable("users", {
  id: id(),
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  username: text("username").unique(),
  timezone: text("timezone").notNull().default("Asia/Kolkata"),
  bio: text("bio"),
  brandColor: text("brand_color").notNull().default("#2f6b55"),
  plan: text("plan", { enum: ["free", "pro"] }).notNull().default("free"),
  createdAt: createdAt(),
});

// ---------------------------------------------------------------------------
// Calendar connections
// ---------------------------------------------------------------------------

export type CalendarConnectionStatus = "active" | "revoked" | "error";

export const calendarConnections = pgTable(
  "calendar_connections",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    provider: text("provider").$type<"google">().notNull(),
    providerAccountId: text("provider_account_id").notNull(),
    email: text("email"),
    /** AES-256-GCM encrypted (see src/lib/crypto.ts). */
    accessTokenEnc: text("access_token_enc"),
    refreshTokenEnc: text("refresh_token_enc"),
    accessTokenExpiresAt: timestamp("access_token_expires_at", { withTimezone: true }),
    scope: text("scope"),
    /** Calendars whose busy times block availability. */
    checkCalendarIds: jsonb("check_calendar_ids").$type<string[]>().notNull().default(["primary"]),
    /** Calendar that receives new bookings. */
    writeCalendarId: text("write_calendar_id").notNull().default("primary"),
    status: text("status").$type<CalendarConnectionStatus>().notNull().default("active"),
    lastError: text("last_error"),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [unique().on(t.userId, t.provider, t.providerAccountId)],
);

// ---------------------------------------------------------------------------
// Availability
// ---------------------------------------------------------------------------

/** "HH:mm" in the schedule's timezone; end may be "24:00". */
export type TimeInterval = { start: string; end: string };
export const WEEKDAYS = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type Weekday = (typeof WEEKDAYS)[number];
export type WeeklyRules = Record<Weekday, TimeInterval[]>;

export const schedules = pgTable("schedules", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  timezone: text("timezone").notNull(),
  weeklyRules: jsonb("weekly_rules").$type<WeeklyRules>().notNull(),
  isDefault: boolean("is_default").notNull().default(false),
  createdAt: createdAt(),
});

export const dateOverrides = pgTable(
  "date_overrides",
  {
    id: id(),
    scheduleId: text("schedule_id")
      .notNull()
      .references(() => schedules.id, { onDelete: "cascade" }),
    date: date("date", { mode: "string" }).notNull(),
    /** Empty array = unavailable all day. */
    intervals: jsonb("intervals").$type<TimeInterval[]>().notNull(),
    /** Optional note, e.g. "Diwali" or "Half day". */
    label: text("label"),
  },
  (t) => [unique().on(t.scheduleId, t.date)],
);

// ---------------------------------------------------------------------------
// Event types
// ---------------------------------------------------------------------------

export { EVENT_COLORS } from "../lib/colors";

export type LocationType = "google_meet" | "zoom" | "phone" | "in_person" | "custom";
export type EventLocation = { type: LocationType; value?: string };

export const eventTypes = pgTable(
  "event_types",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    /** null = host's default schedule */
    scheduleId: text("schedule_id").references(() => schedules.id, { onDelete: "set null" }),
    slug: text("slug").notNull(),
    title: text("title").notNull(),
    description: text("description"),
    /** Card / calendar colour, from EVENT_COLORS. */
    color: text("color").notNull().default("#8247f5"),
    durationMin: integer("duration_min").notNull(),
    location: jsonb("location").$type<EventLocation>().notNull(),
    bufferBeforeMin: integer("buffer_before_min").notNull().default(0),
    bufferAfterMin: integer("buffer_after_min").notNull().default(0),
    minNoticeMin: integer("min_notice_min").notNull().default(240),
    windowDays: integer("window_days").notNull().default(60),
    dailyCap: integer("daily_cap"),
    /** null = same as duration */
    slotIntervalMin: integer("slot_interval_min"),
    /** Smallest currency unit (paise / cents); null = free. */
    priceMinor: integer("price_minor"),
    currency: text("currency").notNull().default("INR"),
    isSecret: boolean("is_secret").notNull().default(false),
    isActive: boolean("is_active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [unique().on(t.userId, t.slug)],
);

export type QuestionType = "text" | "textarea" | "select" | "phone";

export const bookingQuestions = pgTable("booking_questions", {
  id: id(),
  eventTypeId: text("event_type_id")
    .notNull()
    .references(() => eventTypes.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  type: text("type").$type<QuestionType>().notNull(),
  required: boolean("required").notNull().default(false),
  options: jsonb("options").$type<string[]>(),
  position: integer("position").notNull().default(0),
});

// ---------------------------------------------------------------------------
// Bookings
// ---------------------------------------------------------------------------

export type BookingStatus = "confirmed" | "held" | "cancelled";

export const bookings = pgTable(
  "bookings",
  {
    id: id(),
    eventTypeId: text("event_type_id")
      .notNull()
      .references(() => eventTypes.id, { onDelete: "restrict" }),
    hostId: text("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    startUtc: timestamp("start_utc", { mode: "date", withTimezone: true }).notNull(),
    endUtc: timestamp("end_utc", { mode: "date", withTimezone: true }).notNull(),
    status: text("status").$type<BookingStatus>().notNull(),
    /** For "held" bookings awaiting payment; expired holds don't block slots. */
    holdExpiresAt: timestamp("hold_expires_at", { mode: "date", withTimezone: true }),
    inviteeName: text("invitee_name").notNull(),
    inviteeEmail: text("invitee_email").notNull(),
    inviteePhone: text("invitee_phone"),
    inviteeTimezone: text("invitee_timezone").notNull(),
    /** Keyed by booking_questions.id, with the label snapshotted. */
    answers: jsonb("answers").$type<{ questionId: string; label: string; value: string }[]>().notNull().default([]),
    location: jsonb("location").$type<EventLocation>().notNull(),
    meetLink: text("meet_link"),
    /** The host calendar event created for this booking. */
    externalEventId: text("external_event_id"),
    externalCalendarId: text("external_calendar_id"),
    calendarConnectionId: text("calendar_connection_id").references(() => calendarConnections.id, { onDelete: "set null" }),
    /** Secret for the invitee's reschedule and cancel links. */
    cancelToken: text("cancel_token")
      .notNull()
      .unique()
      .$defaultFn(() => crypto.randomUUID().replaceAll("-", "") + crypto.randomUUID().replaceAll("-", "")),
    cancelReason: text("cancel_reason"),
    cancelledBy: text("cancelled_by", { enum: ["host", "invitee"] }),
    rescheduleCount: integer("reschedule_count").notNull().default(0),
    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (t) => [
    index("bookings_host_start_idx").on(t.hostId, t.startUtc),
    index("bookings_event_type_start_idx").on(t.eventTypeId, t.startUtc),
    // The exclusion constraint that forbids overlapping active bookings per host
    // lives in a hand-written migration (drizzle-kit can't express EXCLUDE).
  ],
);

export type User = typeof users.$inferSelect;
export type CalendarConnection = typeof calendarConnections.$inferSelect;
export type Schedule = typeof schedules.$inferSelect;
export type EventType = typeof eventTypes.$inferSelect;
export type BookingQuestion = typeof bookingQuestions.$inferSelect;
export type Booking = typeof bookings.$inferSelect;

// ---------------------------------------------------------------------------
// Integrations: personal access tokens, webhooks
// ---------------------------------------------------------------------------

export const apiTokens = pgTable(
  "api_tokens",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    /** sha256 of the token; the token itself is shown once and never stored. */
    tokenHash: text("token_hash").notNull().unique(),
    /** First characters, to help hosts recognise a token. */
    prefix: text("prefix").notNull(),
    lastUsedAt: timestamp("last_used_at", { withTimezone: true }),
    revokedAt: timestamp("revoked_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [index("api_tokens_user_idx").on(t.userId)],
);

export const WEBHOOK_EVENTS = ["invitee.created", "invitee.canceled", "invitee.rescheduled"] as const;
export type WebhookEvent = (typeof WEBHOOK_EVENTS)[number];

export const webhookSubscriptions = pgTable(
  "webhook_subscriptions",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    url: text("url").notNull(),
    events: jsonb("events").$type<WebhookEvent[]>().notNull(),
    /** HMAC signing key, encrypted at rest (needed in plaintext to sign). */
    signingKeyEnc: text("signing_key_enc").notNull(),
    active: boolean("active").notNull().default(true),
    createdAt: createdAt(),
  },
  (t) => [index("webhook_subscriptions_user_idx").on(t.userId)],
);

export type WebhookDeliveryStatus = "pending" | "delivered" | "failed";

export const webhookDeliveries = pgTable(
  "webhook_deliveries",
  {
    id: id(),
    subscriptionId: text("subscription_id")
      .notNull()
      .references(() => webhookSubscriptions.id, { onDelete: "cascade" }),
    event: text("event").$type<WebhookEvent | "ping">().notNull(),
    payload: jsonb("payload").$type<Record<string, unknown>>().notNull(),
    status: text("status").$type<WebhookDeliveryStatus>().notNull().default("pending"),
    attempts: integer("attempts").notNull().default(0),
    nextAttemptAt: timestamp("next_attempt_at", { withTimezone: true }).notNull().defaultNow(),
    lastStatusCode: integer("last_status_code"),
    lastError: text("last_error"),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("webhook_deliveries_due_idx").on(t.status, t.nextAttemptAt),
    index("webhook_deliveries_sub_idx").on(t.subscriptionId, t.createdAt),
  ],
);

export type ApiToken = typeof apiTokens.$inferSelect;
export type WebhookSubscription = typeof webhookSubscriptions.$inferSelect;
export type WebhookDelivery = typeof webhookDeliveries.$inferSelect;
