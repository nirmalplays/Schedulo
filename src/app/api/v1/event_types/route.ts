import { and, asc, eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { db } from "@/db";
import { eventTypes } from "@/db/schema";
import { withApiAuth } from "@/lib/integrations/api-auth";
import { serializeEventType } from "@/lib/integrations/serialize";

/** GET /api/v1/event_types[?active=true|false] */
export const GET = withApiAuth(async (req, user) => {
  const active = new URL(req.url).searchParams.get("active");
  const rows = await db
    .select()
    .from(eventTypes)
    .where(and(eq(eventTypes.userId, user.id), active === null ? undefined : eq(eventTypes.isActive, active === "true")))
    .orderBy(asc(eventTypes.createdAt));
  return NextResponse.json({ collection: rows.map((t) => serializeEventType(t, user)), pagination: { count: rows.length, next_page_token: null } });
});
