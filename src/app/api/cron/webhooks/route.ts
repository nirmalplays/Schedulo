import { timingSafeEqual } from "node:crypto";
import { NextResponse } from "next/server";
import { processDueDeliveries } from "@/lib/integrations/webhooks";

/**
 * Retries due webhook deliveries. Call every minute from a scheduler
 * (e.g. Vercel Cron) with `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request) {
  const secret = process.env.CRON_SECRET;
  const given = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "") ?? "";
  if (!secret || given.length !== secret.length || !timingSafeEqual(Buffer.from(given), Buffer.from(secret))) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  let total = { sent: 0, failed: 0 };
  // Drain in batches, bounded so one run stays short.
  for (let i = 0; i < 8; i++) {
    const r = await processDueDeliveries(25);
    total = { sent: total.sent + r.sent, failed: total.failed + r.failed };
    if (r.sent + r.failed < 25) break;
  }
  return NextResponse.json(total);
}
