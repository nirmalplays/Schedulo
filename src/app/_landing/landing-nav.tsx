"use client";

import { CalendarClock } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { Magnetic } from "./magnetic";

const LINKS = [
  { href: "#features", label: "Features", id: "features" },
  { href: "#how", label: "How it works", id: "how" },
  { href: "#time-zones", label: "Time zones", id: "time-zones" },
  { href: "/demo", label: "Live demo", id: "demo" },
];

export function LandingNav({
  cta,
  ctaLabel,
  account,
}: {
  cta: string;
  ctaLabel: string;
  /** Signed-in user, or null when signed out. */
  account: { name: string; image: string | null } | null;
}) {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState("");

  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 40);
      const mid = window.innerHeight * 0.45;
      let current = "";
      for (const { id } of LINKS) {
        const el = document.getElementById(id);
        if (!el) continue;
        const r = el.getBoundingClientRect();
        if (r.top < mid && r.bottom > mid) current = id;
      }
      setActive(current);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      className="fixed inset-x-0 top-0 z-50 transition-[background-color,backdrop-filter] duration-400"
      style={{
        background: scrolled ? "rgba(6,3,14,.55)" : "transparent",
        backdropFilter: scrolled ? "blur(14px)" : "none",
        WebkitBackdropFilter: scrolled ? "blur(14px)" : "none",
      }}
    >
      <nav
        className="mx-auto flex w-full items-center justify-between px-5 transition-[padding] duration-400 sm:px-8"
        style={{
          paddingTop: scrolled ? 12 : 20,
          paddingBottom: scrolled ? 12 : 20,
        }}
        aria-label="Main"
      >
        <Link
          href="/"
          className="flex h-8 items-center gap-2 text-lg font-semibold tracking-tight text-foreground"
        >
          <CalendarClock className="h-7 w-7" aria-hidden />
          Schedulo
        </Link>
        <div className="hidden items-center gap-1 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.id}
              href={l.href}
              aria-current={active === l.id ? "true" : undefined}
              className={`rounded-full px-4 py-2 text-sm transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${
                active === l.id
                  ? "bg-white/[0.06] text-foreground"
                  : "text-foreground/75"
              }`}
            >
              {l.label}
            </Link>
          ))}
        </div>
        <div className="flex items-center gap-1">
          {!account && (
            <Link
              href="/login"
              className="rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-foreground/85 transition-colors hover:text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              Log in
            </Link>
          )}
          <Magnetic>
            <Link
              href={cta}
              className="liquid-glass inline-flex items-center justify-center rounded-full px-4 py-2 text-sm font-semibold whitespace-nowrap text-foreground transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
            >
              {account &&
                (account.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={account.image} alt="" referrerPolicy="no-referrer" className="mr-2 -ml-1 h-6 w-6 rounded-full object-cover" />
                ) : (
                  <span aria-hidden className="mr-2 -ml-1 flex h-6 w-6 items-center justify-center rounded-full bg-white/15 text-xs font-bold">
                    {account.name.trim().charAt(0).toUpperCase()}
                  </span>
                ))}
              {ctaLabel}
            </Link>
          </Magnetic>
        </div>
      </nav>
      <div
        className="h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent transition-opacity duration-400"
        style={{ opacity: scrolled ? 0.6 : 1 }}
      />
    </header>
  );
}
