import { CalendarDays, Code2, KeyRound, Mail, MessageCircle, Video, Webhook, Zap } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";
import { Badge, PageHeader } from "@/components/ui";
import { getConnections } from "@/lib/google/calendar";
import { requireHost } from "@/lib/session";

export const metadata = { title: "Integrations & apps" };

/** Icon tile colours per category: [background, ink]. */
const TINTS: Record<string, [string, string]> = {
  Calendars: ["#e4eee8", "#1f4d3d"],
  "Video conferencing": ["#e4eee8", "#1f4d3d"],
  Websites: ["#ebe7f5", "#4b4290"],
  Developer: ["#efece5", "#1d211f"],
  Automation: ["#f7e5dc", "#9a4424"],
  Sharing: ["#e4eee8", "#1f4d3d"],
  Notifications: ["#f5ecd2", "#7a5a0e"],
};

type App = {
  name: string;
  description: string;
  icon: ReactNode;
  href?: string;
  status?: "connected" | "soon" | "builtin";
  category: string;
};

export default async function IntegrationsPage() {
  const host = await requireHost();
  const connections = await getConnections(host.id);
  const calendarConnected = connections.some((c) => c.status === "active");

  const apps: App[] = [
    {
      name: "Google Calendar",
      description: "Check for conflicts and add new events to your calendar.",
      icon: <CalendarDays className="h-6 w-6" />,
      href: "/dashboard/calendars",
      status: calendarConnected ? "connected" : undefined,
      category: "Calendars",
    },
    {
      name: "Google Meet",
      description: "Add a Google Meet link to events automatically. Works once Google Calendar is connected.",
      icon: <Video className="h-6 w-6" />,
      href: "/dashboard/calendars",
      status: calendarConnected ? "connected" : undefined,
      category: "Video conferencing",
    },
    {
      name: "Embed on your website",
      description: "Add your scheduling page inline, as a popup, or as a floating button.",
      icon: <Code2 className="h-6 w-6" />,
      href: "/dashboard/integrations/embed",
      category: "Websites",
    },
    {
      name: "Webhooks",
      description: "Get real-time notifications when meetings are booked, rescheduled or canceled.",
      icon: <Webhook className="h-6 w-6" />,
      href: "/dashboard/integrations/webhooks",
      category: "Developer",
    },
    {
      name: "API & personal access tokens",
      description: "Build custom integrations with the REST API.",
      icon: <KeyRound className="h-6 w-6" />,
      href: "/dashboard/integrations/api",
      category: "Developer",
    },
    {
      name: "Zapier / Make / n8n",
      description: "Connect 6,000+ apps (HubSpot, Sheets, Slack…) using our webhooks and API.",
      icon: <Zap className="h-6 w-6" />,
      href: "/dashboard/integrations/webhooks",
      category: "Automation",
    },
    {
      name: "WhatsApp",
      description: "Share your booking links straight to WhatsApp chats and status.",
      icon: <MessageCircle className="h-6 w-6" />,
      href: "/dashboard",
      status: "builtin",
      category: "Sharing",
    },
    {
      name: "Email confirmations",
      description: "Invitees get confirmations with calendar invites and reschedule/cancel links.",
      icon: <Mail className="h-6 w-6" />,
      status: "builtin",
      category: "Notifications",
    },
    {
      name: "Zoom",
      description: "Create a unique Zoom meeting for each event.",
      icon: <Video className="h-6 w-6" />,
      status: "soon",
      category: "Video conferencing",
    },
    {
      name: "Outlook / Microsoft 365",
      description: "Check Outlook calendars for conflicts and add events.",
      icon: <CalendarDays className="h-6 w-6" />,
      status: "soon",
      category: "Calendars",
    },
  ];

  return (
    <>
      <PageHeader title="Integrations & apps" description="Connect Schedulo to the tools you already use." />
      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(100%,280px),1fr))] gap-4">
        {apps.map((app) => {
          const [tint, ink] = TINTS[app.category] ?? TINTS.Developer;
          const inner = (
            <>
              <div className="flex items-start justify-between gap-2.5">
                <span className="flex h-11 w-11 items-center justify-center rounded-xl [&_svg]:h-[22px] [&_svg]:w-[22px]" style={{ background: tint, color: ink }} aria-hidden>
                  {app.icon}
                </span>
                {app.status === "connected" && <Badge tone="green">Connected</Badge>}
                {app.status === "soon" && <Badge>Coming soon</Badge>}
                {app.status === "builtin" && <Badge>Built in</Badge>}
              </div>
              <p className="mt-4 text-[15px] font-semibold text-ink">{app.name}</p>
              <p className="mt-1 text-[13px] leading-normal text-muted">{app.description}</p>
              <p className="mt-3.5 font-mono text-[10px] tracking-[0.06em] text-muted uppercase">{app.category}</p>
            </>
          );
          const card = "rounded-2xl border border-line bg-card p-5 transition-[transform,border-color] duration-300 ease-[cubic-bezier(.2,.7,.2,1)]";
          return app.href ? (
            <Link key={app.name} href={app.href} className={`${card} hover:-translate-y-[3px] hover:border-line-strong`}>
              {inner}
            </Link>
          ) : (
            <div key={app.name} className={`${card} ${app.status === "soon" ? "opacity-70" : ""}`}>
              {inner}
            </div>
          );
        })}
      </div>
    </>
  );
}
