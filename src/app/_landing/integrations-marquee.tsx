import { Braces, CalendarCheck, CalendarDays, Code2, MessageCircle, Video, Webhook, type LucideIcon } from "lucide-react";

/** Integrations the app actually ships (no invented logos). */
const ITEMS: { title: string; Icon: LucideIcon }[] = [
  { title: "Google Calendar", Icon: CalendarDays },
  { title: "Google Meet", Icon: Video },
  { title: "WhatsApp sharing", Icon: MessageCircle },
  { title: "Website embed", Icon: Code2 },
  { title: "Webhooks", Icon: Webhook },
  { title: "REST API", Icon: Braces },
  { title: "Apple & Outlook (.ics)", Icon: CalendarCheck },
];

/** Seamless CSS marquee (two copies, shifted by -50%); pauses on hover; edges fade out. */
export function IntegrationsMarquee() {
  return (
    <div
      role="region"
      aria-label="Integrations"
      className="marquee overflow-hidden [mask-image:linear-gradient(to_right,transparent,#000_12%,#000_88%,transparent)]"
    >
      <ul className="marquee-track flex w-max">
        {[...ITEMS, ...ITEMS].map(({ title, Icon }, i) => (
          <li key={i} aria-hidden={i >= ITEMS.length} className="flex h-6 shrink-0 items-center gap-3 pr-16">
            <span className="glass-ring flex h-6 w-6 items-center justify-center rounded-lg text-foreground">
              <Icon className="h-3.5 w-3.5" aria-hidden />
            </span>
            <span className="text-base font-semibold whitespace-nowrap text-foreground">{title}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
