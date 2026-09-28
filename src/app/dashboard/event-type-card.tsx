"use client";

import { Code2, Copy, ExternalLink, Mail, MessageCircle, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useOptimistic, useState, useTransition } from "react";
import { MenuItem, Popover } from "@/components/popover";
import { CopyButton } from "@/components/share-link";
import { Badge, Chip, Switch, cx } from "@/components/ui";
import { deleteEventType, duplicateEventType, toggleEventTypeActive } from "./actions";

type Props = {
  id: string;
  title: string;
  durationMin: number;
  locationLabel: string;
  color: string;
  isActive: boolean;
  isSecret: boolean;
  url: string;
  slug: string;
};

export function EventTypeCard(p: Props) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [active, setActive] = useOptimistic(p.isActive);
  const [error, setError] = useState<string | null>(null);

  const toggle = (next: boolean) =>
    startTransition(async () => {
      setActive(next);
      await toggleEventTypeActive(p.id, next);
    });

  return (
    <div
      className={cx(
        "relative flex flex-col rounded-2xl border border-line transition-[transform,box-shadow] duration-300 ease-[cubic-bezier(.2,.7,.2,1)] hover:-translate-y-[3px] hover:shadow-[0_16px_36px_-18px_rgba(29,33,31,.28)]",
        active ? "bg-card" : "bg-[#f6f4ef]",
      )}
    >
      <div className="flex-1 px-5 pt-5 pb-4">
        <div className="flex items-start gap-3">
          <span className="mt-1.5 h-3 w-3 shrink-0 rounded-[4px]" style={{ background: active ? p.color : "var(--color-line-strong)" }} aria-hidden />
          <div className="min-w-0 flex-1">
            <Link href={`/dashboard/event-types/${p.id}`} className={cx("text-[17px] font-semibold hover:underline", active ? "text-ink" : "text-muted")}>
              {p.title}
            </Link>
            <p className="mt-1 text-[13px] text-muted">
              {p.durationMin} min · One-on-One · {p.locationLabel}
            </p>
          </div>
          <Popover
            trigger={({ open, toggle: t, id }) => (
              <button
                type="button"
                onClick={t}
                aria-expanded={open}
                aria-controls={id}
                aria-label={`More actions for ${p.title}`}
                className="-mt-1 -mr-1.5 flex h-[30px] w-[30px] items-center justify-center rounded-lg text-ink-soft hover:bg-hover"
              >
                <MoreHorizontal className="h-[18px] w-[18px]" />
              </button>
            )}
          >
            {(close) => (
              <>
                <MenuItem icon={<Pencil />} onClick={() => router.push(`/dashboard/event-types/${p.id}`)}>
                  Edit
                </MenuItem>
                <MenuItem
                  icon={<Copy />}
                  disabled={pending}
                  onClick={() => {
                    close();
                    startTransition(() => duplicateEventType(p.id));
                  }}
                >
                  Duplicate
                </MenuItem>
                <MenuItem icon={<Code2 />} onClick={() => router.push(`/dashboard/integrations/embed?event=${p.slug}`)}>
                  Add to website
                </MenuItem>
                <MenuItem icon={<ExternalLink />} onClick={() => window.open(p.url, "_blank", "noopener")}>
                  View booking page
                </MenuItem>
                <MenuItem
                  icon={<MessageCircle />}
                  onClick={() => {
                    close();
                    window.open(`https://wa.me/?text=${encodeURIComponent(`Book a time with me: ${p.url}`)}`, "_blank", "noopener");
                  }}
                >
                  Share on WhatsApp
                </MenuItem>
                <MenuItem
                  icon={<Mail />}
                  onClick={() => {
                    close();
                    window.location.href = `mailto:?subject=${encodeURIComponent(p.title)}&body=${encodeURIComponent(`Pick a time that works for you: ${p.url}`)}`;
                  }}
                >
                  Share by email
                </MenuItem>
                <div className="my-1 h-px bg-line-soft" />
                <MenuItem
                  icon={<Trash2 />}
                  danger
                  disabled={pending}
                  onClick={() => {
                    close();
                    if (!confirm(`Delete "${p.title}"? Existing bookings are kept.`)) return;
                    startTransition(async () => setError((await deleteEventType(p.id))?.error ?? null));
                  }}
                >
                  Delete
                </MenuItem>
              </>
            )}
          </Popover>
        </div>
        <div className="mt-4 flex flex-wrap gap-1.5">
          <Chip>/{p.slug}</Chip>
          {p.isSecret && <Badge>Secret</Badge>}
          {!active && <Badge tone="red">Off</Badge>}
        </div>
        {error && (
          <p role="alert" className="mt-2 text-xs text-danger">
            {error}
          </p>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line-soft px-5 py-3">
        <CopyButton text={p.url} variant="link" />
        <Switch checked={active} onChange={toggle} disabled={pending} label={`${p.title} is ${active ? "on" : "off"}`} />
      </div>
    </div>
  );
}
