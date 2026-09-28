import { and, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventTypes } from "@/db/schema";
import { apiError, withApiAuth } from "@/lib/integrations/api-auth";
import { serializeEventType } from "@/lib/integrations/serialize";

export const GET = withApiAuth(async (_req, user, ctx: RouteContext<"/api/v1/event_types/[id]">) => {
  const { id } = await ctx.params;
  const [row] = await db.select().from(eventTypes).where(and(eq(eventTypes.id, id), eq(eventTypes.userId, user.id))).limit(1);
  if (!row) return apiError(404, "Resource Not Found", "Event type not found.");
  return NextResponse.json({ resource: serializeEventType(row, user) });
});
