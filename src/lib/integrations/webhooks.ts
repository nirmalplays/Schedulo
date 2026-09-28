import { createHmac, randomBytes } from "node:crypto";
import { and, asc, eq, inArray, lte, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  webhookDeliveries,
  webhookSubscriptions,
  type WebhookDelivery,
  type WebhookEvent,
  type WebhookSubscription,
} from "@/db/schema";
import type { BookingContext } from "../bookings";
import { decrypt, encrypt } from "../crypto";
import { serializeEventType, serializeInvitee, serializeScheduledEvent } from "./serialize";
import { checkWebhookUrl } from "./url-safety";

/**
 * Outgoing webhooks.
 * - Signed like Calendly: header `Schedulo-Webhook-Signature: t=<unix>,v1=<hex>`,
 *   v1 = HMAC-SHA256(signing_key, `${t}.${rawBody}`).
 * - Retries with backoff for ~24 h; due deliveries are processed right after an
 *   event and by the cron route (/api/cron/webhooks).
 */

export const SIGNATURE_HEADER = "Schedulo-Webhook-Signature";
/** Delay before attempt n+1 (after n failures). Total ≈ 24 h. */
const BACKOFF_MS = [60_000, 5 * 60_000, 30 * 60_000, 2 * 3600_000, 6 * 3600_000, 15 * 3600_000];
const MAX_ATTEMPTS = BACKOFF_MS.length + 1;

export function newSigningKey() {
  return randomBytes(32).toString("base64url");
}

export function sign(signingKey: string, body: string, timestamp = Math.floor(Date.now() / 1000)) {
  const v1 = createHmac("sha256", signingKey).update(`${timestamp}.${body}`).digest("hex");
  return `t=${timestamp},v1=${v1}`;
}

export async function createSubscription(userId: string, url: string, events: WebhookEvent[]) {
  const signingKey = newSigningKey();
  const [sub] = await db
    .insert(webhookSubscriptions)
    .values({ userId, url, events, signingKeyEnc: encrypt(signingKey) })
    .returning();
  return { sub, signingKey };
}

export function buildPayload(event: WebhookEvent, ctx: BookingContext, extra: Record<string, unknown> = {}) {
  const { booking, eventType, host } = ctx;
  return {
    event,
    created_at: new Date().toISOString(),
    payload: {
      ...serializeInvitee(booking),
      scheduled_event: serializeScheduledEvent(booking, eventType),
      event_type: serializeEventType(eventType, host),
      ...extra,
    },
  };
}

/** Queues a delivery for every active subscription of the host that wants this event. */
export async function enqueueEvent(event: WebhookEvent, ctx: BookingContext, extra?: Record<string, unknown>) {
  const subs = await db
    .select()
    .from(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.userId, ctx.host.id), eq(webhookSubscriptions.active, true)));
  const targets = subs.filter((s) => s.events.includes(event));
  if (!targets.length) return [];
  const payload = buildPayload(event, ctx, extra);
  return db
    .insert(webhookDeliveries)
    .values(targets.map((s) => ({ subscriptionId: s.id, event, payload })))
    .returning({ id: webhookDeliveries.id });
}

async function attempt(delivery: WebhookDelivery, sub: WebhookSubscription) {
  const body = JSON.stringify(delivery.payload);
  let status: number | null = null;
  let error: string | null = await checkWebhookUrl(sub.url);
  try {
    if (error) throw new Error(error);
    const res = await fetch(sub.url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "User-Agent": "Schedulo-Webhooks/1.0",
        [SIGNATURE_HEADER]: sign(decrypt(sub.signingKeyEnc), body),
      },
      body,
      redirect: "manual",
      signal: AbortSignal.timeout(10_000),
    });
    status = res.status;
    if (!res.ok) error = `HTTP ${res.status}`;
  } catch (err) {
    error = err instanceof Error ? err.message : "Request failed";
  }

  const attempts = delivery.attempts + 1;
  const ok = status !== null && status >= 200 && status < 300;
  await db
    .update(webhookDeliveries)
    .set(
      ok
        ? { status: "delivered", attempts, lastStatusCode: status, lastError: null, deliveredAt: new Date() }
        : {
            status: attempts >= MAX_ATTEMPTS ? "failed" : "pending",
            attempts,
            lastStatusCode: status,
            lastError: error,
            nextAttemptAt: new Date(Date.now() + (BACKOFF_MS[attempts - 1] ?? 0)),
          },
    )
    .where(eq(webhookDeliveries.id, delivery.id));
  return ok;
}

/**
 * Sends due deliveries. Rows are claimed with an atomic bump of next_attempt_at,
 * so concurrent runners (cron + post-event) don't double-send.
 */
export async function processDueDeliveries(limit = 25, onlyIds?: string[]) {
  const claimed = await db
    .update(webhookDeliveries)
    .set({ nextAttemptAt: sql`now() + interval '2 minutes'` })
    .where(
      inArray(
        webhookDeliveries.id,
        db
          .select({ id: webhookDeliveries.id })
          .from(webhookDeliveries)
          .where(
            and(
              eq(webhookDeliveries.status, "pending"),
              lte(webhookDeliveries.nextAttemptAt, sql`now()`),
              onlyIds?.length ? inArray(webhookDeliveries.id, onlyIds) : undefined,
            ),
          )
          .orderBy(asc(webhookDeliveries.nextAttemptAt))
          .limit(limit),
      ),
    )
    .returning();
  if (!claimed.length) return { sent: 0, failed: 0 };

  const subs = await db
    .select()
    .from(webhookSubscriptions)
    .where(inArray(webhookSubscriptions.id, [...new Set(claimed.map((d) => d.subscriptionId))]));
  const byId = new Map(subs.map((s) => [s.id, s]));

  let sent = 0;
  let failed = 0;
  await Promise.all(
    claimed.map(async (d) => {
      const sub = byId.get(d.subscriptionId);
      if (!sub) return;
      if (await attempt(d, sub)) sent++;
      else failed++;
    }),
  );
  return { sent, failed };
}

/** Queue + immediately try to send. Never throws (webhooks must not break bookings). */
export async function dispatchEvent(event: WebhookEvent, ctx: BookingContext, extra?: Record<string, unknown>) {
  try {
    const queued = await enqueueEvent(event, ctx, extra);
    if (queued.length) await processDueDeliveries(queued.length, queued.map((q) => q.id));
  } catch (err) {
    console.error("[webhooks] dispatch failed", err);
  }
}

/** Test ping from the dashboard. */
export async function sendPing(sub: WebhookSubscription) {
  const [d] = await db
    .insert(webhookDeliveries)
    .values({
      subscriptionId: sub.id,
      event: "ping",
      payload: { event: "ping", created_at: new Date().toISOString(), payload: { message: "Webhook test from Schedulo" } },
    })
    .returning();
  await processDueDeliveries(1, [d.id]);
  const [after] = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, d.id));
  return after;
}
