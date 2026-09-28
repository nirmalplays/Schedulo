"use client";

import { CalendarDays, Clock, ExternalLink, Home, LayoutGrid, Link2, LogOut, Menu, Plus, Settings, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { signOut } from "@/app/login/actions";
import { Avatar, Wordmark, cx } from "@/components/ui";

const NAV = [
  { href: "/dashboard", label: "Scheduling", icon: Link2, match: (p: string) => p === "/dashboard" || p.startsWith("/dashboard/event-types") },
  { href: "/dashboard/meetings", label: "Meetings", icon: CalendarDays },
  { href: "/dashboard/availability", label: "Availability", icon: Clock },
  {
    href: "/dashboard/integrations",
    label: "Integrations & apps",
    icon: LayoutGrid,
    match: (p: string) => p.startsWith("/dashboard/integrations") || p.startsWith("/dashboard/calendars"),
  },
];

type Props = { user: { name: string; email: string; image: string | null; username: string } };

const item = (active: boolean) =>
  cx(
    "flex items-center gap-3 rounded-[9px] px-3 py-2.5 text-sm transition-colors",
    active ? "bg-primary-soft font-semibold text-primary-hover" : "font-medium text-ink hover:bg-hover",
  );

export function Sidebar({ user }: Props) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  const nav = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between px-[22px] pt-[22px] pb-5">
        <Link href="/" onClick={close} aria-label="Schedulo home">
          <Wordmark />
        </Link>
        <button type="button" className="rounded-lg p-2 text-ink-soft hover:bg-hover lg:hidden" onClick={close} aria-label="Close menu">
          <X className="h-5 w-5" />
        </button>
      </div>

      <div className="px-3.5">
        <Link
          href="/dashboard/event-types/new"
          onClick={close}
          className="flex h-[42px] w-full items-center justify-center gap-2 rounded-[10px] bg-ink text-sm font-semibold text-surface transition-colors hover:bg-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
        >
          <Plus className="h-4 w-4" aria-hidden />
          Create
        </Link>
      </div>

      <nav className="mt-[18px] flex flex-1 flex-col gap-0.5 px-2.5" aria-label="Main">
        {NAV.map(({ href, label, icon: Icon, match }) => {
          const active = match ? match(pathname) : pathname.startsWith(href);
          return (
            <Link key={href} href={href} onClick={close} aria-current={active ? "page" : undefined} className={item(active)}>
              <Icon className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
              {label}
            </Link>
          );
        })}
      </nav>

      <div className="flex flex-col gap-0.5 px-2.5 pb-3" aria-label="Your site">
        <a href={`/${user.username}`} target="_blank" rel="noreferrer" className={item(false)}>
          <ExternalLink className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          Your booking page
        </a>
        <Link href="/" onClick={close} className={item(false)}>
          <Home className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          Schedulo website
        </Link>
      </div>

      <div className="border-t border-line px-2.5 py-3">
        <Link
          href="/dashboard/settings"
          onClick={close}
          aria-current={pathname.startsWith("/dashboard/settings") ? "page" : undefined}
          className={item(pathname.startsWith("/dashboard/settings"))}
        >
          <Settings className="h-[18px] w-[18px]" strokeWidth={1.75} aria-hidden />
          Account settings
        </Link>
        <div className="flex items-center gap-2.5 px-3 py-2">
          <Avatar name={user.name} image={user.image} size={32} />
          <div className="min-w-0 flex-1">
            <p className="truncate text-[13px] font-semibold text-ink">{user.name}</p>
            <p className="truncate text-xs text-muted">{user.email}</p>
          </div>
          <form action={signOut}>
            <button
              type="submit"
              className="flex h-7 w-7 items-center justify-center rounded-lg text-muted hover:bg-hover hover:text-ink"
              aria-label="Sign out"
              title="Sign out"
            >
              <LogOut className="h-[15px] w-[15px]" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile top bar */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-line bg-paper px-4 py-3 lg:hidden">
        <button type="button" onClick={() => setOpen(true)} className="rounded-lg p-2 text-ink hover:bg-hover" aria-label="Open menu">
          <Menu className="h-5 w-5" />
        </button>
        <Link href="/dashboard" aria-label="Schedulo dashboard">
          <Wordmark size={24} />
        </Link>
        <Avatar name={user.name} image={user.image} size={32} />
      </header>

      {/* Mobile drawer */}
      {open && <div className="fixed inset-0 z-40 bg-ink/30 lg:hidden" onClick={close} aria-hidden />}
      <aside
        className={cx(
          "fixed inset-y-0 left-0 z-50 w-62 border-r border-line bg-paper transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {nav}
      </aside>
    </>
  );
}
