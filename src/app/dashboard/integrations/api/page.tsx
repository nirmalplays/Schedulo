import { and, desc, eq, isNull } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { DateTime } from "luxon";
import Link from "next/link";
import { Card, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { apiTokens } from "@/db/schema";
import { appUrl } from "@/lib/email";
import { requireHost } from "@/lib/session";
import { NewTokenForm, RevokeToken } from "./token-forms";

export const metadata = { title: "API & tokens" };

const ENDPOINTS = [
  "GET  /users/me",
  "GET  /event_types",
  "GET  /event_types/{id}/available_times?start_time=&end_time=",
  "GET  /scheduled_events?status=&min_start_time=&max_start_time=&count=&page_token=",
  "GET  /scheduled_events/{id}",
  "GET  /scheduled_events/{id}/invitees",
  "POST /scheduled_events/{id}/cancellation",
  "GET  /webhook_subscriptions",
  "POST /webhook_subscriptions",
  "DELETE /webhook_subscriptions/{id}",
];

export default async function ApiPage() {
  const host = await requireHost();
  const tokens = await db
    .select()
    .from(apiTokens)
    .where(and(eq(apiTokens.userId, host.id), isNull(apiTokens.revokedAt)))
    .orderBy(desc(apiTokens.createdAt));
  const fmt = (d: Date | null) => (d ? DateTime.fromJSDate(d, { zone: host.timezone }).toFormat("d LLL yyyy") : "Never");

  return (
    <>
      <Link href="/dashboard/integrations" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Integrations & apps
      </Link>
      <PageHeader title="API & personal access tokens" description="Use a token to call the REST API from your own code or automation tools." />
      <div className="grid gap-6 lg:grid-cols-[1fr_24rem]">
        <div className="min-w-0 space-y-6">
          <Card>
            <p className="border-b border-line px-5 py-3 text-sm font-bold text-ink">Active tokens</p>
            {tokens.length === 0 ? (
              <p className="px-5 py-6 text-sm text-muted">No tokens yet.</p>
            ) : (
              <ul className="divide-y divide-line">
                {tokens.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3 text-sm">
                    <div className="min-w-0">
                      <p className="font-semibold text-ink">{t.name}</p>
                      <p className="text-xs text-muted">
                        <code>{t.prefix}…</code> · created {fmt(t.createdAt)} · last used {fmt(t.lastUsedAt)}
                      </p>
                    </div>
                    <RevokeToken id={t.id} />
                  </li>
                ))}
              </ul>
            )}
          </Card>
          <Card className="p-5 text-sm">
            <p className="font-bold text-ink">Quick start</p>
            <pre className="mt-3 overflow-x-auto rounded-md bg-[#0b1f33] p-4 font-mono text-xs text-[#d6e4f5]">
              <code>{`curl ${appUrl()}/api/v1/users/me \\\n  -H "Authorization: Bearer cc_pat_…"`}</code>
            </pre>
            <p className="mt-4 font-bold text-ink">Endpoints (base {appUrl()}/api/v1)</p>
            <ul className="mt-2 space-y-1 font-mono text-xs text-ink-soft">
              {ENDPOINTS.map((e) => (
                <li key={e}>{e}</li>
              ))}
            </ul>
            <p className="mt-3 text-xs text-muted">Rate limit: 120 requests/minute per token. Responses follow Calendly API v2 shapes.</p>
          </Card>
        </div>
        <NewTokenForm />
      </div>
    </>
  );
}
