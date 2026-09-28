import { desc, eq, inArray } from "drizzle-orm";
import { ArrowLeft, Webhook } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { Badge, Card, EmptyState, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { webhookDeliveries, webhookSubscriptions } from "@/db/schema";
import { requireHost } from "@/lib/session";
import { NewWebhookForm, WebhookRowActions } from "./webhook-forms";

export const metadata = { title: "Webhooks" };

export default async function WebhooksPage() {
  const host = await requireHost();
  const subs = await db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.userId, host.id)).orderBy(desc(webhookSubscriptions.createdAt));
  const deliveries = subs.length
    ? await db
        .select()
        .from(webhookDeliveries)
        .where(inArray(webhookDeliveries.subscriptionId, subs.map((s) => s.id)))
        .orderBy(desc(webhookDeliveries.createdAt))
        .limit(25)
    : [];
  const urlOf = new Map(subs.map((s) => [s.id, s.url]));
  const fmt = (d: Date) => DateTime.fromJSDate(d, { zone: host.timezone }).toFormat("d LLL, h:mm:ss a");

  return (
    <>
      <Link href="/dashboard/integrations" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Integrations & apps
      </Link>
      <PageHeader
        title="Webhooks"
        description="We POST a JSON payload to your URL when a meeting is booked, rescheduled or canceled. Use it with Zapier (“Webhooks by Zapier → Catch Hook”), Make, n8n or your own server."
      />

      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          {subs.length === 0 ? (
            <EmptyState icon={<Webhook className="h-12 w-12" />} title="No webhooks yet">
              Add an endpoint on the right to start receiving events.
            </EmptyState>
          ) : (
            <Card className="divide-y divide-line">
              {subs.map((s) => (
                <div key={s.id} className="flex flex-wrap items-start justify-between gap-3 p-5">
                  <div className="min-w-0">
                    <p className="truncate font-mono text-sm text-ink">{s.url}</p>
                    <div className="mt-2 flex flex-wrap gap-1.5">
                      {s.active ? <Badge tone="green">Active</Badge> : <Badge>Paused</Badge>}
                      {s.events.map((e) => (
                        <Badge key={e} tone="blue">
                          {e}
                        </Badge>
                      ))}
                    </div>
                  </div>
                  <WebhookRowActions id={s.id} active={s.active} />
                </div>
              ))}
            </Card>
          )}

          {deliveries.length > 0 && (
            <Card>
              <p className="border-b border-line px-5 py-3 text-sm font-bold text-ink">Recent deliveries</p>
              <ul className="divide-y divide-line text-sm">
                {deliveries.map((d) => (
                  <li key={d.id} className="grid gap-1 px-5 py-3 sm:grid-cols-[7rem_10rem_1fr_auto] sm:items-center sm:gap-3">
                    <span>
                      {d.status === "delivered" ? (
                        <Badge tone="green">Delivered</Badge>
                      ) : d.status === "failed" ? (
                        <Badge tone="red">Failed</Badge>
                      ) : (
                        <Badge tone="amber">Retrying</Badge>
                      )}
                    </span>
                    <span className="font-mono text-xs text-ink">{d.event}</span>
                    <span className="truncate text-muted">
                      {urlOf.get(d.subscriptionId)} {d.lastStatusCode ? `· HTTP ${d.lastStatusCode}` : d.lastError ? `· ${d.lastError}` : ""}
                    </span>
                    <span className="text-xs whitespace-nowrap text-muted">
                      {fmt(d.createdAt)} · {d.attempts} {d.attempts === 1 ? "try" : "tries"}
                    </span>
                  </li>
                ))}
              </ul>
            </Card>
          )}

          <Card className="p-5 text-sm text-ink-soft">
            <p className="font-bold text-ink">Verifying signatures</p>
            <p className="mt-1">
              Each request carries <code className="rounded bg-hover px-1">Schedulo-Webhook-Signature: t=&lt;unix time&gt;,v1=&lt;hex&gt;</code>. Compute
              HMAC-SHA256 of <code className="rounded bg-hover px-1">{"`${t}.${rawBody}`"}</code> with your signing key and compare with{" "}
              <code className="rounded bg-hover px-1">v1</code>; reject timestamps older than a few minutes. Failed deliveries are retried with
              backoff for about 24 hours.
            </p>
          </Card>
        </div>

        <NewWebhookForm />
      </div>
    </>
  );
}
