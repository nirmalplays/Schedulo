"use server";

import { and, eq, isNull } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { apiTokens, WEBHOOK_EVENTS, webhookSubscriptions } from "@/db/schema";
import { createApiToken } from "@/lib/integrations/api-auth";
import { checkWebhookUrl } from "@/lib/integrations/url-safety";
import { createSubscription, sendPing } from "@/lib/integrations/webhooks";
import { requireHost } from "@/lib/session";

export type SecretState = { error?: string; secret?: string; label?: string } | undefined;

// ---- Personal access tokens ------------------------------------------------

export async function createTokenAction(_prev: SecretState, form: FormData): Promise<SecretState> {
  const host = await requireHost();
  const name = String(form.get("name") ?? "").trim().slice(0, 80);
  if (!name) return { error: "Give the token a name, e.g. “Zapier” or “CRM sync”." };
  const active = await db.select({ id: apiTokens.id }).from(apiTokens).where(and(eq(apiTokens.userId, host.id), isNull(apiTokens.revokedAt)));
  if (active.length >= 20) return { error: "You can have at most 20 active tokens. Revoke one first." };
  const { token } = await createApiToken(host.id, name);
  revalidatePath("/dashboard/integrations/api");
  return { secret: token, label: name };
}

export async function revokeTokenAction(id: string) {
  const host = await requireHost();
  await db
    .update(apiTokens)
    .set({ revokedAt: new Date() })
    .where(and(eq(apiTokens.id, id), eq(apiTokens.userId, host.id)));
  revalidatePath("/dashboard/integrations/api");
}

// ---- Webhooks --------------------------------------------------------------

const webhookSchema = z.object({
  url: z.string().trim().max(2000),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1, "Pick at least one event."),
});

export async function createWebhookAction(_prev: SecretState, form: FormData): Promise<SecretState> {
  const host = await requireHost();
  const parsed = webhookSchema.safeParse({ url: form.get("url"), events: form.getAll("events") });
  if (!parsed.success) return { error: parsed.error.issues[0].message };
  const urlError = await checkWebhookUrl(parsed.data.url);
  if (urlError) return { error: urlError };
  const existing = await db.select({ id: webhookSubscriptions.id }).from(webhookSubscriptions).where(eq(webhookSubscriptions.userId, host.id));
  if (existing.length >= 20) return { error: "You can have at most 20 webhook subscriptions." };

  const { signingKey } = await createSubscription(host.id, parsed.data.url, parsed.data.events);
  revalidatePath("/dashboard/integrations/webhooks");
  return { secret: signingKey, label: parsed.data.url };
}

export async function deleteWebhookAction(id: string) {
  const host = await requireHost();
  await db.delete(webhookSubscriptions).where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, host.id)));
  revalidatePath("/dashboard/integrations/webhooks");
}

export async function toggleWebhookAction(id: string, active: boolean) {
  const host = await requireHost();
  await db
    .update(webhookSubscriptions)
    .set({ active })
    .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, host.id)));
  revalidatePath("/dashboard/integrations/webhooks");
}

export async function testWebhookAction(id: string) {
  const host = await requireHost();
  const [sub] = await db
    .select()
    .from(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, host.id)))
    .limit(1);
  if (!sub) return { ok: false, message: "Webhook not found." };
  const d = await sendPing(sub);
  revalidatePath("/dashboard/integrations/webhooks");
  return d?.status === "delivered"
    ? { ok: true, message: `Delivered (HTTP ${d.lastStatusCode}).` }
    : { ok: false, message: `Failed: ${d?.lastError ?? "no response"}. It will be retried automatically.` };
}
