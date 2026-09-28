import { redirect } from "next/navigation";
import { Wordmark } from "@/components/ui";
import { appUrl } from "@/lib/email";
import { getCurrentUser } from "@/lib/session";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Set up your link" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.username) redirect("/dashboard");

  const suggested = (user.email ?? "").split("@")[0].toLowerCase().replace(/[^a-z0-9-]/g, "-").slice(0, 30);
  const first = user.name?.trim().split(/\s+/)[0];

  return (
    <main className="flex flex-1 flex-col items-center bg-surface p-7">
      <div className="flex w-full max-w-[560px] items-center justify-between">
        <Wordmark />
        <span className="font-mono text-xs text-muted">Almost there</span>
      </div>
      <div className="mt-16 w-full max-w-[560px] rounded-[20px] border border-line bg-card p-7 sm:p-10">
        <h1 className="font-serif text-[44px] leading-none font-normal text-ink">{first ? `Hi ${first}, let's set up your link` : "Let's set up your link"}</h1>
        <p className="mt-3 text-[15px] text-muted">
          We&apos;ll create a 30-minute meeting with Mon–Fri, 10:00–18:00 availability. You can change all of this later.
        </p>
        <OnboardingForm defaultName={user.name ?? ""} suggestedUsername={suggested} linkPrefix={appUrl().replace(/^https?:\/\//, "")} />
      </div>
    </main>
  );
}
