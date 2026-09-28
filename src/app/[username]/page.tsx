import { and, asc, eq } from "drizzle-orm";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BookingShell } from "@/components/event-info";
import { Avatar } from "@/components/ui";
import { db } from "@/db";
import { eventTypes } from "@/db/schema";
import { brandStyle, getPublicHost } from "@/lib/public";

export async function generateMetadata(props: PageProps<"/[username]">) {
  const host = await getPublicHost((await props.params).username);
  return { title: host ? (host.name ?? host.username ?? "Book a time") : "Not found" };
}

export default async function ProfilePage(props: PageProps<"/[username]">) {
  const { username } = await props.params;
  const host = await getPublicHost(username);
  if (!host?.username) notFound();

  const types = await db
    .select()
    .from(eventTypes)
    .where(and(eq(eventTypes.userId, host.id), eq(eventTypes.isActive, true), eq(eventTypes.isSecret, false)))
    .orderBy(asc(eventTypes.createdAt));

  const name = host.name ?? host.username;
  return (
    <BookingShell style={brandStyle(host)}>
      <div className="px-6 py-12 sm:px-12">
        <div className="flex flex-col items-center border-b border-line-soft pb-10 text-center">
          <Avatar name={name} image={host.image} size={72} />
          <h1 className="mt-4 font-serif text-[44px] leading-none font-normal text-ink">{name}</h1>
          <p className="mt-3 max-w-lg text-[15px] whitespace-pre-line text-ink-soft">
            {host.bio || "Pick a meeting type below to see open times in your time zone."}
          </p>
        </div>
        <div className="mt-8 grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
          {types.map((t) => (
            <Link
              key={t.id}
              href={`/${host.username}/${t.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-line bg-card p-5 transition-[transform,box-shadow,border-color] duration-300 hover:-translate-y-[3px] hover:border-line-strong hover:shadow-[0_16px_36px_-18px_rgba(29,33,31,.28)]"
            >
              <span className="h-3 w-3 shrink-0 rounded-[4px]" style={{ backgroundColor: t.color }} aria-hidden />
              <span className="min-w-0 flex-1">
                <span className="block text-[17px] font-semibold text-ink">{t.title}</span>
                <span className="mt-0.5 block text-[13px] text-muted">{t.durationMin} min</span>
              </span>
              <ChevronRight className="h-5 w-5 text-muted transition group-hover:translate-x-0.5 group-hover:text-ink" aria-hidden />
            </Link>
          ))}
          {types.length === 0 && <p className="col-span-full text-center text-muted">No events available right now.</p>}
        </div>
      </div>
    </BookingShell>
  );
}
