import { and, asc, desc, eq } from "drizzle-orm";
import { ArrowRight, ArrowUpRight, CalendarDays, Code2, Link2, Webhook, type LucideIcon } from "lucide-react";
import { Geist } from "next/font/google";
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import BlurText from "@/components/reactbits/BlurText";
import RotatingText from "@/components/reactbits/RotatingText";
import SpotlightCard from "@/components/reactbits/SpotlightCard";
import { db } from "@/db";
import { eventTypes, users } from "@/db/schema";
import { LOCATION_LABELS } from "@/lib/format";
import { getCurrentUser } from "@/lib/session";
import { HeroVideo } from "./_landing/hero-video";
import { HowItWorks } from "./_landing/how-it-works";
import { IntegrationsMarquee } from "./_landing/integrations-marquee";
import { LandingNav } from "./_landing/landing-nav";
import { LazyVideo } from "./_landing/lazy-video";
import { LivePreview, type PreviewEvent } from "./_landing/live-preview";
import { Magnetic } from "./_landing/magnetic";
import { RESPECT_REDUCED_MOTION } from "./_landing/motion-pref";
import { ScrollEffects } from "./_landing/scroll-effects";
import { TimezoneSlider } from "./_landing/timezone-slider";

const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });

const TZ_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4";
const CTA_VIDEO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4";

/** Only claims the product actually delivers (see README "Status against the PRD"). */
const FEATURES: { title: string; body: string; Icon: LucideIcon }[] = [
  { title: "One link", body: "Share one link: invitees pick a time in their own time zone", Icon: Link2 },
  { title: "Calendar + Meet", body: "Syncs with Google Calendar and adds Google Meet links", Icon: CalendarDays },
  { title: "Embed & share", body: "Embed on your website, WhatsApp-friendly sharing", Icon: Code2 },
  { title: "Webhooks & API", body: "Webhooks and an API to connect your other apps", Icon: Webhook },
];

const MANIFESTO =
  "Finding a time shouldn't take seven emails. Share one link, let people pick a slot that suits them, and it lands in your calendar with the Meet link attached.";
const VELOCITY = ["Discovery calls", "Demos", "Interviews", "Office hours", "Consults", "Portfolio reviews"];

const cellClass = "relative min-w-0 overflow-hidden rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8";
const spot = "rgba(168, 85, 247, 0.18)" as const;
const i = (n: number) => ({ "--i": n }) as CSSProperties;

/** The seeded demo host's Discovery Call (else first public event), for the live preview (null if not seeded). */
async function getDemoEvent(): Promise<PreviewEvent | null> {
  try {
    const [row] = await db
      .select({ eventType: eventTypes, host: users })
      .from(eventTypes)
      .innerJoin(users, eq(users.id, eventTypes.userId))
      .where(and(eq(users.username, "demo"), eq(eventTypes.isActive, true), eq(eventTypes.isSecret, false)))
      .orderBy(desc(eq(eventTypes.slug, "discovery")), asc(eventTypes.createdAt))
      .limit(1);
    if (!row) return null;
    return {
      id: row.eventType.id,
      title: row.eventType.title,
      durationMin: row.eventType.durationMin,
      href: `/demo/${row.eventType.slug}`,
      hostName: row.host.name ?? "Demo host",
      locationLabel: LOCATION_LABELS[row.eventType.location.type],
    };
  } catch {
    return null;
  }
}

function Eyebrow({ children }: { children: ReactNode }) {
  return <p className="font-mono text-xs tracking-[0.12em] text-foreground/45 uppercase">{children}</p>;
}

function GlassCta({ href, children, className = "" }: { href: string; children: ReactNode; className?: string }) {
  return (
    <Magnetic>
      <Link
        href={href}
        className={`liquid-glass inline-flex items-center justify-center gap-2.5 rounded-full font-semibold whitespace-nowrap text-foreground transition-colors hover:bg-white/[0.06] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground ${className}`}
      >
        {children}
      </Link>
    </Magnetic>
  );
}

export default async function Home() {
  const [user, demo] = await Promise.all([getCurrentUser(), getDemoEvent()]);
  const cta = user ? "/dashboard" : "/login";
  const mainCta = user ? "Go to dashboard" : "Get started free";

  return (
    <main
      data-rm={RESPECT_REDUCED_MOTION ? "1" : "0"}
      className={`${geist.variable} ${geist.className} relative flex min-h-screen flex-1 flex-col overflow-x-hidden bg-background text-foreground antialiased`}
    >
      <link rel="preconnect" href="https://api.fontshare.com" />
      <link rel="stylesheet" precedence="default" href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap" />

      {/* Ambient drifting light */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
        <div
          data-motion
          className="absolute top-[10%] left-[5%] h-[55vw] w-[55vw] rounded-full blur-[40px]"
          style={{ background: "radial-gradient(circle, rgba(99,102,241,.16), transparent 65%)", animation: "drift-a 26s ease-in-out infinite" }}
        />
        <div
          data-motion
          className="absolute right-0 bottom-0 h-[50vw] w-[50vw] rounded-full blur-[40px]"
          style={{ background: "radial-gradient(circle, rgba(168,85,247,.13), transparent 65%)", animation: "drift-b 32s ease-in-out infinite" }}
        />
      </div>

      <ScrollEffects />
      <LandingNav cta={cta} ctaLabel={user ? "Dashboard" : "Sign Up"} account={user ? { name: user.name || user.email || "You", image: user.image ?? null } : null} />

      {/* ─────────────── Hero ─────────────── */}
      <section id="top" className="relative z-[1] flex min-h-screen flex-col">
        <div
          data-hero-media
          aria-hidden
          className="absolute inset-0 overflow-hidden will-change-[opacity,transform] [mask-image:linear-gradient(to_bottom,#000_70%,transparent)]"
        >
          <HeroVideo />
        </div>
        <div aria-hidden className="pointer-events-none absolute top-1/2 left-1/2 h-[527px] w-[984px] max-w-[92vw] -translate-x-1/2 -translate-y-1/2 bg-gray-950 opacity-90 blur-[82px]" />

        <div data-hero-content className="relative flex flex-1 items-center justify-center px-6 pt-24 text-center will-change-[opacity,transform]">
          <div className="flex flex-col items-center">
            <p className="rise liquid-glass mb-8 inline-flex items-center gap-2.5 rounded-full py-1 pr-3.5 pl-1 text-[13px] text-foreground/75" style={i(0)}>
              <span className="rounded-full bg-gradient-to-r from-indigo-500 to-purple-500 px-2.5 py-0.5 text-xs font-semibold text-white">New</span>
              Google Meet links on every booking
            </p>
            <h1
              className="rise font-display text-[clamp(60px,15.3vw,220px)] leading-[1.02] font-normal tracking-[-0.024em] whitespace-nowrap"
              style={i(1)}
            >
              <span className="text-foreground">Book </span>
              <span
                className="gradient-shift bg-clip-text text-transparent"
                style={{ backgroundImage: "linear-gradient(to left, #6366f1, #a855f7, #fcd34d, #a855f7, #6366f1)" }}
              >
                Time
              </span>
            </h1>
            <p className="rise mt-[9px] max-w-md text-lg leading-8 text-hero-sub opacity-80" style={i(3)}>
              Share one link. Invitees book a slot
              <br className="hidden sm:inline" /> in their own time zone.
            </p>
            <div className="rise mt-[25px]" style={i(4)}>
              <GlassCta href={cta} className="px-[29px] py-6 text-base">
                {mainCta}
                <ArrowRight className="h-4 w-4" aria-hidden />
              </GlassCta>
            </div>
          </div>
        </div>

        <div id="integrations" className="rise relative scroll-mt-20 px-6 pb-10" style={i(6)}>
          <div className="mx-auto flex w-full max-w-5xl items-center gap-12">
            <p className="hidden shrink-0 text-sm leading-5 text-foreground/50 sm:block">
              Works with the tools
              <br />
              you already use
            </p>
            <div className="min-w-0 flex-1">
              <IntegrationsMarquee />
            </div>
          </div>
        </div>
      </section>

      {/* ─────────────── Manifesto ─────────────── */}
      <section className="relative z-[1] mx-auto w-full max-w-5xl px-6 pt-24 pb-16 md:pt-36 md:pb-24">
        <p data-scroll-reveal className="flex flex-wrap gap-x-[0.26em] font-display text-[30px] leading-[1.18] font-normal tracking-[-0.02em] md:text-5xl">
          {MANIFESTO.split(" ").map((w, n) => (
            <span key={n} style={{ opacity: 0.14 }}>
              {w}
            </span>
          ))}
        </p>
      </section>

      {/* ─────────────── Velocity words ─────────────── */}
      <div
        aria-hidden
        className="relative z-[1] flex flex-col gap-2 overflow-hidden py-6 [mask-image:linear-gradient(to_right,transparent,#000_10%,#000_90%,transparent)]"
      >
        {[-1, 1].map((dir) => (
          <div key={dir} data-velocity={dir} className="flex w-max will-change-transform">
            {[...VELOCITY, ...VELOCITY, ...VELOCITY, ...VELOCITY].map((w, n) => (
              <span
                key={n}
                className="flex items-center gap-7 pr-7 font-display text-[40px] leading-[1.1] tracking-[-0.02em] whitespace-nowrap md:text-[64px]"
                style={dir === 1 ? { color: "transparent", WebkitTextStroke: "1px hsla(40,6%,95%,.35)" } : { color: "hsla(40,6%,95%,.9)" }}
              >
                {w}
                <span
                  className="inline-block h-2.5 w-2.5 rotate-45"
                  style={dir === 1 ? { border: "1px solid hsla(40,6%,95%,.35)" } : { background: "linear-gradient(135deg,#a855f7,#fcd34d)" }}
                />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ─────────────── Features ─────────────── */}
      <section id="features" className="relative z-[1] mx-auto w-full max-w-6xl scroll-mt-[72px] px-6 py-24 md:py-32">
        <Eyebrow>01 — Features</Eyebrow>
        <h2 className="mt-4 flex flex-wrap items-center gap-x-[0.28em] gap-y-2 font-display text-4xl leading-[1.1] font-normal tracking-[-0.025em] md:text-6xl">
          <span>Get booked for</span>
          <RotatingText
            texts={["discovery calls", "demos", "interviews", "office hours", "consults"]}
            rotationInterval={2200}
            staggerDuration={0.02}
            staggerFrom="last"
            splitBy="characters"
            mainClassName="glass-ring min-w-[11ch] overflow-hidden rounded-2xl px-3 py-0.5 md:px-4 md:py-1"
            splitLevelClassName="overflow-hidden pb-1"
            elementLevelClassName="text-gradient"
          />
        </h2>

        <div className="mt-14 grid gap-4 md:grid-cols-3">
          <SpotlightCard spotlightColor={spot} className={`${cellClass} md:col-span-2 md:row-span-2`}>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs tracking-widest text-foreground/45 uppercase">Your booking page</p>
                <p className="mt-2 text-2xl text-foreground">What invitees see</p>
              </div>
              <span className="font-mono text-[11px] text-foreground/50">{demo ? "Live · pick a time to book it" : "Preview"}</span>
            </div>
            <div className="mt-6 flex justify-center">
              <LivePreview event={demo} />
            </div>
          </SpotlightCard>

          {FEATURES.map(({ title, body, Icon }) => (
            <SpotlightCard key={title} spotlightColor={spot} className={cellClass}>
              <span className="glass-ring flex h-10 w-10 items-center justify-center rounded-xl">
                <Icon className="h-[18px] w-[18px]" aria-hidden />
              </span>
              <p className="mt-5 text-lg text-foreground">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">{body}</p>
            </SpotlightCard>
          ))}

          <Link href={demo?.href ?? "/demo"} className="group block min-w-0 rounded-3xl focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground">
            <SpotlightCard spotlightColor={spot} className={`${cellClass} h-full transition-colors group-hover:bg-white/[0.04]`}>
              <div className="flex items-start justify-between gap-4">
                <p className="text-lg text-foreground">See a live booking page</p>
                <span className="glass-ring flex rounded-full p-2">
                  <ArrowUpRight className="h-4 w-4" aria-hidden />
                </span>
              </div>
              <p className="mt-2 text-sm leading-relaxed text-foreground/60">Book a test slot on the demo host.</p>
            </SpotlightCard>
          </Link>
        </div>
      </section>

      {/* ─────────────── How it works ─────────────── */}
      <section id="how" className="relative z-[1] mx-auto w-full max-w-6xl scroll-mt-[72px] px-6 pt-6 pb-24 md:pt-10 md:pb-32">
        <Eyebrow>02 — How it works</Eyebrow>
        <HowItWorks
          title={
            <div role="heading" aria-level={2} className="flex flex-wrap gap-x-[0.26em] font-display text-4xl leading-[1.1] font-normal tracking-[-0.025em] md:text-6xl">
              <BlurText text="Set up once." animateBy="words" direction="top" delay={90} />
              <span className="text-gradient">Get booked.</span>
            </div>
          }
        />
      </section>

      {/* ─────────────── Time zones ─────────────── */}
      <section id="time-zones" className="relative z-[1] scroll-mt-[72px]">
        <div aria-hidden className="absolute inset-0 overflow-hidden [mask-image:linear-gradient(to_bottom,transparent,#000_22%,#000_78%,transparent)]">
          <LazyVideo src={TZ_VIDEO} className="absolute inset-0 h-full w-full object-cover opacity-85" />
        </div>
        <div className="relative mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-24 md:py-32">
          <p className="font-mono text-xs tracking-[0.12em] text-foreground/55 uppercase">03 — Time zones</p>
          <div className="-mt-6 flex flex-col gap-5">
            <div
              role="heading"
              aria-level={2}
              className="font-display text-[44px] leading-[1.05] font-normal tracking-[-0.025em] text-foreground [text-shadow:0_2px_12px_rgb(0_0_0/.35)] md:text-7xl"
            >
              <BlurText text="Every time zone, handled." animateBy="words" direction="top" delay={90} />
            </div>
            <p className="max-w-xl text-base leading-relaxed text-hero-sub [text-shadow:0_2px_12px_rgb(0_0_0/.35)] md:text-lg">
              Invitees see open slots in their own local time. Your weekly hours stay in yours, and daylight-saving changes are already accounted for.
            </p>
          </div>
          <TimezoneSlider />
        </div>
      </section>

      {/* ─────────────── Closing CTA ─────────────── */}
      <section className="relative z-[1] mx-auto w-full max-w-6xl px-6 py-24 md:py-32">
        <div className="relative aspect-[4/5] overflow-hidden rounded-[28px] sm:aspect-video">
          <LazyVideo src={CTA_VIDEO} className="absolute inset-0 h-full w-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
          <div className="absolute inset-x-0 bottom-0 flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-10">
            <div className="liquid-glass max-w-md rounded-2xl p-6 md:p-8">
              <p className="mb-3 text-xs tracking-widest text-foreground/55 uppercase">Take your time back</p>
              <div role="heading" aria-level={2} className="font-display text-3xl leading-[1.15] font-normal text-foreground md:text-4xl">
                <BlurText text="Stop the back-and-forth." animateBy="words" direction="top" delay={90} />
              </div>
              <p className="mt-3 text-sm leading-relaxed text-foreground/75 md:text-base">Share one link and let people book straight into your calendar.</p>
            </div>
            <Magnetic className="self-start md:self-auto">
              <Link
                href={cta}
                className="relative inline-block shrink-0 overflow-hidden rounded-full py-px focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground"
              >
                <span
                  data-motion
                  aria-hidden
                  className="absolute right-[-250%] bottom-[-11px] h-1/2 w-[300%] rounded-full opacity-80"
                  style={{ background: "radial-gradient(circle, #fcd34d, transparent 10%)", animation: "star-b 5s linear infinite alternate" }}
                />
                <span
                  data-motion
                  aria-hidden
                  className="absolute top-[-10px] left-[-250%] h-1/2 w-[300%] rounded-full opacity-80"
                  style={{ background: "radial-gradient(circle, #a855f7, transparent 10%)", animation: "star-t 5s linear infinite alternate" }}
                />
                <span className="relative z-[1] inline-flex items-center gap-2.5 rounded-full border border-white/[0.12] bg-gradient-to-b from-[#0b0714] to-[#06030c] px-8 py-4 text-base font-semibold whitespace-nowrap text-foreground">
                  {mainCta}
                  <ArrowRight className="h-4 w-4" aria-hidden />
                </span>
              </Link>
            </Magnetic>
          </div>
        </div>
      </section>

      <div className="relative z-[1] h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent" />
      <footer className="relative z-[1] mx-auto flex w-full max-w-6xl items-center justify-between gap-4 px-6 pt-6 pb-10 text-sm text-foreground/50">
        <span>© {new Date().getFullYear()} Schedulo</span>
        <div className="flex gap-5">
          <Link href="/demo" className="hover:text-foreground">
            Live demo
          </Link>
          {!user && (
            <Link href="/login" className="hover:text-foreground">
              Log In
            </Link>
          )}
        </div>
      </footer>
    </main>
  );
}
