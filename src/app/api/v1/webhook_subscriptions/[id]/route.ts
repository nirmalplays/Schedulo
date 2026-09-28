import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { webhookSubscriptions } from "@/db/schema";
import { apiError, withApiAuth } from "@/lib/integrations/api-auth";
import { serializeSubscription } from "@/lib/integrations/serialize";

type Ctx = RouteContext<"/api/v1/webhook_subscriptions/[id]">;

export const GET = withApiAuth(async (_req, user, ctx: Ctx) => {
  const { id } = await ctx.params;
  const [row] = await db
    .select()
    .from(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, user.id)))
    .limit(1);
  if (!row) return apiError(404, "Resource Not Found", "Webhook subscription not found.");
  return NextResponse.json({ resource: serializeSubscription(row) });
});

export const DELETE = withApiAuth(async (_req, user, ctx: Ctx) => {
  const { id } = await ctx.params;
  const [row] = await db
    .delete(webhookSubscriptions)
    .where(and(eq(webhookSubscriptions.id, id), eq(webhookSubscriptions.userId, user.id)))
    .returning({ id: webhookSubscriptions.id });
  if (!row) return apiError(404, "Resource Not Found", "Webhook subscription not found.");
  return new Response(null, { status: 204 });
});
