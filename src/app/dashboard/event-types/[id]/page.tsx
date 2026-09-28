import { and, asc, eq } from "drizzle-orm";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/ui";
import { db } from "@/db";
import { bookingQuestions, eventTypes } from "@/db/schema";
import { appUrl } from "@/lib/email";
import { requireHost } from "@/lib/session";
import { EventTypeForm } from "../event-type-form";

export const metadata = { title: "Edit event type" };

export default async function EditEventTypePage(props: PageProps<"/dashboard/event-types/[id]">) {
  const host = await requireHost();
  const { id } = await props.params;
  const [eventType] = await db
    .select()
    .from(eventTypes)
    .where(and(eq(eventTypes.id, id), eq(eventTypes.userId, host.id)))
    .limit(1);
  if (!eventType) notFound();
  const questions = await db
    .select()
    .from(bookingQuestions)
    .where(eq(bookingQuestions.eventTypeId, id))
    .orderBy(asc(bookingQuestions.position));

  return (
    <div className="max-w-2xl">
      <PageHeader title={`Edit: ${eventType.title}`} />
      <EventTypeForm
        eventType={eventType}
        questions={questions.map((q) => ({ label: q.label, type: q.type, required: q.required, options: q.options }))}
        usernamePrefix={`${appUrl().replace(/^https?:\/\//, "")}/${host.username}`}
      />
    </div>
  );
}
