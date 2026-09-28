import { asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { z } from "zod";
import { db } from "@/db";
import { WEBHOOK_EVENTS, webhookSubscriptions } from "@/db/schema";
import { apiError, withApiAuth } from "@/lib/integrations/api-auth";
import { serializeSubscription } from "@/lib/integrations/serialize";
import { checkWebhookUrl } from "@/lib/integrations/url-safety";
import { createSubscription } from "@/lib/integrations/webhooks";

export const GET = withApiAuth(async (_req, user) => {
  const rows = await db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.userId, user.id)).orderBy(asc(webhookSubscriptions.createdAt));
  return NextResponse.json({ collection: rows.map(serializeSubscription), pagination: { count: rows.length, next_page_token: null } });
});

const createSchema = z.object({
  url: z.string().max(2000),
  events: z.array(z.enum(WEBHOOK_EVENTS)).min(1),
});

/** POST { url, events[] } → 201 with the subscription and its signing_key (returned only here). */
export const POST = withApiAuth(async (req, user) => {
  const parsed = createSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return apiError(400, "Invalid Argument", `Body must be { url, events: [${WEBHOOK_EVENTS.join(", ")}] }.`);
  const urlError = await checkWebhookUrl(parsed.data.url);
  if (urlError) return apiError(400, "Invalid Argument", urlError);

  const existing = await db.select({ id: webhookSubscriptions.id }).from(webhookSubscriptions).where(eq(webhookSubscriptions.userId, user.id));
  if (existing.length >= 20) return apiError(400, "Invalid Argument", "You can have at most 20 webhook subscriptions.");

  const { sub, signingKey } = await createSubscription(user.id, parsed.data.url, [...new Set(parsed.data.events)]);
  return NextResponse.json({ resource: { ...serializeSubscription(sub), signing_key: signingKey } }, { status: 201 });
});
