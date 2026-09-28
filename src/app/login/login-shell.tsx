import Link from "next/link";
import type { ReactNode } from "react";
import { Wordmark } from "@/components/ui";

/** Split layout for sign-in screens: form on the left, dark grid panel on the right. */
export function LoginShell({ children }: { children: ReactNode }) {
  return (
    <main className="grid min-h-screen flex-1 grid-cols-[repeat(auto-fit,minmax(min(100%,420px),1fr))] bg-surface">
      <div className="flex flex-col p-7">
        <Link href="/" aria-label="Schedulo home" className="self-start">
          <Wordmark />
        </Link>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[380px]">{children}</div>
        </div>
      </div>
      <div
        className="hidden items-end bg-code p-14 text-surface md:flex"
        style={{
          backgroundImage:
            "linear-gradient(rgba(246,244,239,.05) 1px, transparent 1px), linear-gradient(90deg, rgba(246,244,239,.05) 1px, transparent 1px)",
          backgroundSize: "44px 44px",
        }}
      >
        <div className="max-w-[420px]">
          <p className="font-serif text-[40px] leading-[1.08] italic">One link. Your hours, their time zone, straight into your calendar.</p>
          <p className="mt-[18px] font-mono text-xs text-[#9cc9b3]">Google Calendar · Meet links · embeds · webhooks</p>
        </div>
      </div>
    </main>
  );
}
