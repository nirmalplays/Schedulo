import { Clock, CreditCard, MapPin, Phone, Video } from "lucide-react";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import type { EventType, User } from "@/db/schema";
import { describeLocation, formatPrice } from "@/lib/format";
import { Avatar, cx } from "./ui";

function LocationIcon({ type }: { type: EventType["location"]["type"] }) {
  const cls = "mt-px h-[17px] w-[17px] shrink-0";
  if (type === "google_meet" || type === "zoom") return <Video className={cls} aria-hidden />;
  if (type === "phone") return <Phone className={cls} aria-hidden />;
  return <MapPin className={cls} aria-hidden />;
}

/** Left panel of the booking card: host, event title, duration, location, description. */
export function EventInfo({ host, eventType, children }: { host: User; eventType: EventType; children?: ReactNode }) {
  const name = host.name ?? host.username ?? "Host";
  const location = eventType.location.type === "google_meet" ? "Google Meet" : describeLocation(eventType.location);

  return (
    <div className="border-b border-line-soft bg-paper p-6 sm:p-8 md:border-r md:border-b-0">
      <Avatar name={name} image={host.image} size={52} />
      <p className="mt-4 text-sm text-muted">{name}</p>
      <h1 className="mt-1 font-serif text-[40px] leading-none font-normal text-ink">{eventType.title}</h1>
      <ul className="mt-[22px] flex flex-col gap-3 text-sm text-ink-soft">
        <li className="flex items-start gap-2.5">
          <Clock className="mt-px h-[17px] w-[17px] shrink-0" aria-hidden /> {eventType.durationMin} min
        </li>
        <li className="flex items-start gap-2.5">
          <LocationIcon type={eventType.location.type} /> <span>{location}</span>
        </li>
        {eventType.priceMinor ? (
          <li className="flex items-start gap-2.5">
            <CreditCard className="mt-px h-[17px] w-[17px] shrink-0" aria-hidden /> {formatPrice(eventType.priceMinor, eventType.currency)}
          </li>
        ) : null}
      </ul>
      {children}
      {eventType.description && <p className="mt-[22px] text-sm leading-relaxed whitespace-pre-line text-ink-soft">{eventType.description}</p>}
    </div>
  );
}

/** Page frame for public booking screens (hidden chrome when embedded). */
export function BookingShell({
  style,
  embed,
  wide = true,
  children,
}: {
  style?: CSSProperties;
  embed?: boolean;
  wide?: boolean;
  children: ReactNode;
}) {
  return (
    <main
      style={style}
      className={cx("flex w-full flex-1 flex-col items-center", embed ? "bg-card" : "bg-surface px-0 pt-0 pb-16 sm:px-5 sm:pt-12 sm:pb-[90px]")}
    >
      <div
        className={cx(
          "w-full overflow-hidden bg-card",
          wide ? "max-w-[1020px]" : "max-w-[600px]",
          !embed && "sm:rounded-[20px] sm:border sm:border-line sm:shadow-[0_20px_60px_-30px_rgba(29,33,31,.25)]",
        )}
      >
        {children}
      </div>
      {!embed && (
        <Link href="/" className="mt-[18px] font-mono text-[11px] text-muted hover:text-ink">
          Powered by schedulo
        </Link>
      )}
    </main>
  );
}
