import { asc, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import { db } from "@/db";
import { eventTypes } from "@/db/schema";
import { appUrl } from "@/lib/email";
import { requireHost } from "@/lib/session";
import { EmbedBuilder } from "./embed-builder";

export const metadata = { title: "Embed on your website" };

export default async function EmbedPage(props: PageProps<"/dashboard/integrations/embed">) {
  const host = await requireHost();
  const { event } = await props.searchParams;
  const types = await db.select().from(eventTypes).where(eq(eventTypes.userId, host.id)).orderBy(asc(eventTypes.createdAt));

  return (
    <>
      <Link href="/dashboard/integrations" className="mb-4 inline-flex items-center gap-1 text-sm font-semibold text-primary hover:underline">
        <ArrowLeft className="h-4 w-4" aria-hidden /> Integrations & apps
      </Link>
      <PageHeader title="Add to website" description="Paste one snippet into any site builder: WordPress, Webflow, Wix, Squarespace, Framer or plain HTML." />
      <EmbedBuilder
        base={appUrl()}
        brandColor={host.brandColor}
        profile={{ label: `${host.name ?? host.username} (all event types)`, path: `/${host.username}` }}
        events={types.filter((t) => t.isActive).map((t) => ({ label: t.title, path: `/${host.username}/${t.slug}`, slug: t.slug }))}
        initialSlug={typeof event === "string" ? event : undefined}
      />
    </>
  );
}
