import { PageHeader } from "@/components/ui";
import { requireHost } from "@/lib/session";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const host = await requireHost();
  return (
    <div className="max-w-xl">
      <PageHeader title="Settings" description="How you appear on your booking pages." />
      <SettingsForm
        user={{ name: host.name ?? "", username: host.username, bio: host.bio ?? "", timezone: host.timezone, brandColor: host.brandColor, email: host.email ?? "" }}
      />
    </div>
  );
}
