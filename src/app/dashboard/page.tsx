import { asc, eq } from "drizzle-orm";
import { CalendarDays, ExternalLink, Link2, Plus, Search, Sparkles } from "lucide-react";
import Link from "next/link";
import { CopyButton, WhatsAppShare } from "@/components/share-link";
import { Avatar, EmptyState, LinkButton, PageHeader } from "@/components/ui";
import { db } from "@/db";
import { eventTypes } from "@/db/schema";
import { appUrl } from "@/lib/email";
import { LOCATION_LABELS } from "@/lib/format";
import { getConnections } from "@/lib/google/calendar";
import { requireHost } from "@/lib/session";
import { EventTypeCard } from "./event-type-card";

export const metadata = { title: "Scheduling" };

export default async function SchedulingPage(props: PageProps<"/dashboard">) {
  const host = await requireHost();
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim().toLowerCase() : "";

  const [all, connections] = await Promise.all([
    db.select().from(eventTypes).where(eq(eventTypes.userId, host.id)).orderBy(asc(eventTypes.createdAt)),
    getConnections(host.id),
  ]);
  const types = q ? all.filter((t) => t.title.toLowerCase().includes(q)) : all;
  const profileUrl = `${appUrl()}/${host.username}`;
  const name = host.name ?? host.username;

  return (
    <>
      <PageHeader
        title="Scheduling"
        description="Your event types. Share a link, or embed one on your site."
        actions={
          <LinkButton href="/dashboard/event-types/new">
            <Plus className="h-4 w-4" aria-hidden />
            New event type
          </LinkButton>
        }
      />

      {sp.welcome && (
        <div className="blur-in mb-5 rounded-2xl border border-[#cfe0d6] bg-[#eef5f0] p-5">
          <p className="flex items-center gap-2 font-semibold text-primary-hover">
            <Sparkles className="h-[18px] w-[18px]" aria-hidden /> Your booking page is live
          </p>
          <p className="mt-1 text-sm text-ink-soft">Share your link and people can book you in seconds.</p>
          <div className="mt-4 flex flex-wrap items-center gap-2.5">
            <code className="rounded-[9px] border border-line bg-card px-3 py-2 font-mono text-[13px] text-ink">{profileUrl.replace(/^https?:\/\//, "")}</code>
            <CopyButton text={profileUrl} />
            <WhatsAppShare text={`Book a time with me: ${profileUrl}`} />
          </div>
        </div>
      )}

      {connections.length === 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-4 rounded-2xl border border-line bg-card px-5 py-4">
          <span className="flex h-10 w-10 items-center justify-center rounded-[10px] bg-primary-soft text-primary-hover" aria-hidden>
            <CalendarDays className="h-5 w-5" />
          </span>
          <div className="min-w-[200px] flex-1">
            <p className="text-sm font-semibold text-ink">Connect your calendar</p>
            <p className="text-[13px] text-muted">Avoid double-bookings and add new meetings to your calendar automatically.</p>
          </div>
          <LinkButton href="/dashboard/calendars" variant="secondary" size="sm" className="h-9">
            Connect calendar
          </LinkButton>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-3.5 rounded-[14px] border border-line bg-card px-4 py-3.5">
        <Avatar name={name} image={host.image} size={40} />
        <div className="min-w-[180px] flex-1">
          <p className="text-sm font-semibold text-ink">{name}</p>
          <p className="mt-0.5 font-mono text-xs text-muted">{profileUrl.replace(/^https?:\/\//, "")}</p>
        </div>
        <CopyButton text={profileUrl} />
        <a
          href={profileUrl}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-[9px] border border-line-strong bg-card px-3.5 text-[13px] font-semibold text-ink hover:border-ink"
        >
          <ExternalLink className="h-3.5 w-3.5" aria-hidden />
          View landing page
        </a>
      </div>

      {all.length > 6 && (
        <form className="relative mt-5 w-full sm:w-72">
          <Search className="pointer-events-none absolute top-[11px] left-3 h-4 w-4 text-muted" aria-hidden />
          <input
            name="q"
            type="search"
            defaultValue={q}
            placeholder="Search event types"
            aria-label="Search event types"
            className="block h-[38px] w-full rounded-[10px] border border-line-strong bg-card pr-3 pl-9 text-sm text-ink placeholder:text-muted focus:border-primary focus:ring-[3px] focus:ring-primary-soft focus:outline-none"
          />
        </form>
      )}

      <div className="mt-5">
        {types.length === 0 ? (
          <EmptyState icon={<Link2 className="h-10 w-10" />} title={q ? "No event types match" : "Create your first event type"}>
            {!q && (
              <>
                <p>Event types are the kinds of meetings people can book with you.</p>
                <Link href="/dashboard/event-types/new" className="mt-3 inline-block font-semibold text-primary hover:underline">
                  + New event type
                </Link>
              </>
            )}
          </EmptyState>
        ) : (
          <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,300px),1fr))] gap-4">
            {types.map((t) => (
              <EventTypeCard
                key={t.id}
                id={t.id}
                title={t.title}
                slug={t.slug}
                durationMin={t.durationMin}
                locationLabel={t.location.type === "in_person" && t.location.value ? `In person, ${t.location.value}` : LOCATION_LABELS[t.location.type]}
                color={t.color}
                isActive={t.isActive}
                isSecret={t.isSecret}
                url={`${appUrl()}/${host.username}/${t.slug}`}
              />
            ))}
          </div>
        )}
      </div>
    </>
  );
}
