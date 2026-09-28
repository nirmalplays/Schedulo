import { PageHeader } from "@/components/ui";
import { appUrl } from "@/lib/email";
import { requireHost } from "@/lib/session";
import { EventTypeForm } from "../event-type-form";

export const metadata = { title: "New event type" };

export default async function NewEventTypePage() {
  const host = await requireHost();
  return (
    <div className="max-w-2xl">
      <PageHeader title="New event type" />
      <EventTypeForm questions={[]} usernamePrefix={`${appUrl().replace(/^https?:\/\//, "")}/${host.username}`} />
    </div>
  );
}
