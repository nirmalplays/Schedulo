# Schedulo — Dark Landing Page Prompt ("Book Time")

Rebuild the landing page of this repo (`src/app/page.tsx`) as a dark, video-led marketing page for the
scheduling product **Schedulo**: a full-screen hero, a features bento, a time-zones band and a closing
CTA. The hero follows the spec in §4 exactly; the sections after it reuse the same tokens. Do not
invent pages, stats, customers or testimonials. Every claim on the page must be something the app
already does (see `README.md` → "Status against the PRD").

═══════════════════════════════════════
0. READ FIRST — THIS REPO
═══════════════════════════════════════
- Stack already installed: Next.js 16.3 (App Router) · React 19 · TypeScript · Tailwind CSS v4
  (CSS-first: `@theme` in `src/app/globals.css`, there is NO tailwind.config) · lucide-react · next/font.
- This is NOT the Next.js in your training data. Before writing code, read the relevant guides in
  `node_modules/next/dist/docs/01-app/` and heed deprecation notices (see `AGENTS.md`).
- ONE new dependency is allowed: `npm i motion` (needed by React Bits BlurText + RotatingText).
  No framer-motion, no gsap, no ogl/three, no shadcn init.
- Files you may touch:
  | File | Action |
  |---|---|
  | `src/app/page.tsx` | rewrite; stays an async SERVER component, no `"use client"` |
  | `src/app/_landing/hero-video.tsx` | NEW, `"use client"`: the fade-loop hero video |
  | `src/app/_landing/lazy-video.tsx` | NEW, `"use client"`: in-view play/pause for section videos |
  | `src/app/_landing/integrations-marquee.tsx` | NEW, `"use client"`: wraps React Bits LogoLoop |
  | `src/components/reactbits/*.tsx` | NEW: React Bits sources (§2) |
  | `src/components/ui.tsx` | ADD one variant, `heroSecondary` (§3). Change nothing else. |
  | `src/app/globals.css` | APPEND only. Do not edit existing tokens (the dashboard depends on them). |
- Do NOT touch `layout.tsx`, the dashboard, booking routes or anything in `src/lib`.

KEEP THIS LOGIC VERBATIM from the current `page.tsx`:
```ts
const user = await getCurrentUser();          // from "@/lib/session"
const cta = user ? "/dashboard" : "/login";
```
Keep the existing `BookingPreview()` component and the `FEATURES` array. Copy them over unchanged.
`/demo` is the seeded demo host (`npm run db:seed`) and the only "live example" link.

═══════════════════════════════════════
1. MEDIA: WHICH VIDEOS, AND WHY
═══════════════════════════════════════
Only three videos are used. Each one matches the job its section does. All are CloudFront MP4s;
use the URLs verbatim.

| Where | Source prompt | Look | URL |
|---|---|---|---|
| §4 Hero background | your "Power AI" spec | deep blue-purple, dark | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4 |
| §6 Time-zones band | Orbis "Hello! I'm orbis" section | dark space, reads as "the whole globe" | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4 |
| §7 Closing CTA card | Velorah hero | deep navy, calm and cinematic ("room to breathe") | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4 |

Deliberately NOT used: JungleMind (bright; fights the dark theme), nexum (flips light/dark
per breakpoint), the Orbis NFT square clips (product objects), the LTX R2 clips (tied to their
click-state machine), and the Orbit planet (it's the Orbit brand artwork). The full inventory is
in the appendix if you want to swap one.

Hero video = no `poster`, no overlay (per spec). Section videos (§6, §7) use `lazy-video.tsx`:
- `muted loop playsInline preload="metadata" aria-hidden="true"`, no `autoPlay` attribute
- `IntersectionObserver` (threshold 0.15): `v.muted = true; v.play().catch(() => {})` when
  intersecting, `v.pause()` when not. Disconnect on unmount.
- `prefers-reduced-motion: reduce` → never call `play()`; the first frame stays as a still.

═══════════════════════════════════════
2. REACT BITS (reactbits.dev): WHAT TO USE
═══════════════════════════════════════
Use the **TS + Tailwind (TS-TW)** variant of each. This repo has no `components.json`, so do NOT run
`shadcn init` (it would rewrite `globals.css`). Instead fetch the registry item and write its file:

```bash
# registry item JSON → files[0].content is the component source
curl -s https://reactbits.dev/r/LogoLoop-TS-TW.json      # no deps
curl -s https://reactbits.dev/r/RotatingText-TS-TW.json  # dep: motion
curl -s https://reactbits.dev/r/BlurText-TS-TW.json      # dep: motion
curl -s https://reactbits.dev/r/SpotlightCard-TS-TW.json # no deps
```
Save each one as `src/components/reactbits/<Name>.tsx`. All four already start with `'use client'`.
Leave their internals alone. Style them only through props and `className`.

| Component | Used for | Key props |
|---|---|---|
| `LogoLoop` | §4 hero marquee (replaces the hand-rolled CSS marquee; it already honours reduced motion) | `speed={40}` `direction="left"` `gap={64}` `logoHeight={24}` `pauseOnHover` `fadeOut` `fadeOutColor="hsl(260 87% 3%)"` `ariaLabel="Integrations"` + `renderItem` |
| `RotatingText` | §5 heading: "Get booked for ___" | `texts` · `rotationInterval={2200}` · `staggerDuration={0.02}` · `staggerFrom="last"` · `splitBy="characters"` |
| `BlurText` | §5/§6/§7 `h2` entrance on scroll | `animateBy="words"` `direction="top"` `delay={90}` |
| `SpotlightCard` | §5 bento cards | `spotlightColor="rgba(168, 85, 247, 0.18)"` |

Nothing else from React Bits. No WebGL backgrounds (DarkVeil, Aurora, Silk): the videos
already provide the motion, and stacking both makes the page heavy.

═══════════════════════════════════════
3. TOKENS, FONTS, UTILITIES (append to globals.css)
═══════════════════════════════════════
Colours: exact values from the spec, exposed as Tailwind v4 colours:
```css
@theme {
  --color-background: hsl(260 87% 3%);   /* deep dark blue-purple */
  --color-foreground: hsl(40 6% 95%);    /* off-white */
  --color-hero-sub:   hsl(40 6% 82%);
  --font-display: "General Sans", var(--font-geist-sans), sans-serif;
}
```
These are NEW names, so the existing `primary / ink / line…` tokens and the dashboard are unaffected.

Fonts:
- Body = **Geist Sans**. In Next, use `next/font/google` (`Geist`) instead of `@fontsource/geist-sans`,
  which gives the same font with no new package. Declare it at module scope in `page.tsx`:
  `const geist = Geist({ subsets: ["latin"], variable: "--font-geist-sans" });`
  and put `${geist.variable} ${geist.className}` on the page's `<main>`, NOT on `layout.tsx`
  (the dashboard keeps Inter).
- Headline = **General Sans** from Fontshare. Render inside `page.tsx` (React 19 hoists it to `<head>`):
  ```tsx
  <link rel="preconnect" href="https://api.fontshare.com" />
  <link rel="stylesheet" precedence="default"
        href="https://api.fontshare.com/v2/css?f[]=general-sans@400,500,600,700&display=swap" />
  ```
  Use it with `font-display` (the `--font-display` token above).

Liquid glass, verbatim from the spec:
```css
.liquid-glass { background: rgba(255,255,255,0.01); background-blend-mode: luminosity;
  -webkit-backdrop-filter: blur(4px); backdrop-filter: blur(4px); border: none;
  box-shadow: inset 0 1px 1px rgba(255,255,255,0.1); position: relative; overflow: hidden; }
.liquid-glass::before { content: ""; position: absolute; inset: 0; border-radius: inherit; padding: 1.4px;
  background: linear-gradient(180deg, rgba(255,255,255,0.45) 0%, rgba(255,255,255,0.15) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%, rgba(255,255,255,0.15) 80%, rgba(255,255,255,0.45) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor; mask-composite: exclude; pointer-events: none; }
```

Entrance keyframes (hero only; sections use BlurText):
```css
@keyframes rise { from { opacity: 0; transform: translate3d(0, 18px, 0) } to { opacity: 1; transform: none } }
.rise { animation: rise .9s cubic-bezier(.16,1,.3,1) both; animation-delay: calc(var(--i, 0) * 80ms) }
@media (prefers-reduced-motion: reduce) { .rise { animation: none !important } }
```

`heroSecondary` button variant: add to `buttonStyles` in `ui.tsx`:
```ts
heroSecondary: "liquid-glass text-foreground hover:bg-white/[0.06]",
```
It inherits `base` (rounded-full, focus ring). When a spec gives explicit padding, pass it through
`className` and use `size="md"` with `h-auto` so the padding wins.

═══════════════════════════════════════
4. HERO: FULL-SCREEN, DARK (exact spec, adapted copy)
═══════════════════════════════════════
Page wrapper (`<main>`): `relative flex flex-1 flex-col overflow-x-hidden bg-background text-foreground`.

HERO WRAPPER: `relative overflow-hidden` · holds the video + a `relative z-10` content div.

BACKGROUND VIDEO (`hero-video.tsx`, `"use client"`):
- Hero video URL from §1. `absolute inset-0 w-full h-full object-cover`, attributes
  `muted playsInline preload="auto" aria-hidden="true"`, and **no `loop`** (the `ended` event
  drives the loop). Initial `style={{ opacity: 0 }}`.
- JS fade loop with `requestAnimationFrame`:
  - rAF tick reads `currentTime` / `duration`:
    `t < 0.5 → opacity = t / 0.5` · `duration - t < 0.5 → opacity = (duration - t) / 0.5` · else `1`.
    Write straight to `ref.current.style.opacity`, never to React state.
  - `ended` → opacity `0`, `setTimeout(100)`, `currentTime = 0`, `play()`.
  - In `useEffect`: `v.muted = true`; `play().catch(() => {})` immediately, on `canplay`, and on
    `visibilitychange` → visible. Cancel the rAF, timeout and listeners on cleanup.
  - Reduced motion: don't play; set opacity `1` so the first frame shows as a still.
- NO gradient or scrim over the video.

SECTION: `<section class="relative flex min-h-screen flex-col overflow-visible">`
(`overflow-visible` so the blur shape is not clipped; the outer wrapper's `overflow-hidden` still
stops horizontal scroll).

BLURRED SHAPE (behind content, inside the section):
`pointer-events-none absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2`
`w-[984px] h-[527px] max-w-[92vw] opacity-90 bg-gray-950 blur-[82px]` (`max-w` is the only
addition, so phones don't get a 984px slab.)

NAVBAR (`rise --i:0`): `relative w-full flex items-center justify-between py-5 px-8`
- Left: brand. There is no `src/assets/logo.png` in this repo, so build it: `<Link href="/">`
  `flex h-8 items-center gap-2 text-lg font-semibold tracking-tight text-foreground` with lucide
  `CalendarClock` (`h-7 w-7`, `aria-hidden`) + "Schedulo". Keep the total height at 32px.
- Center (`hidden md:flex items-center gap-1`): `<Link>`s styled
  `rounded-full px-4 py-2 text-sm text-foreground/90 transition-colors hover:text-foreground`:
  "Features" → `#features` · "Time zones" → `#time-zones` · "Integrations" → `#integrations` ·
  "Live demo" → `/demo`.
  (The spec's ChevronDown dropdowns are dropped. Schedulo has no menus to open, and a chevron
  that opens nothing is a broken promise.)
- Right: `<LinkButton variant="heroSecondary" className="h-auto rounded-full px-4 py-2">`
  - signed out: "Sign Up" → `/login` · signed in: "Dashboard" → `/dashboard`.
- DIVIDER below the nav: `mt-[3px] h-px w-full bg-gradient-to-r from-transparent via-foreground/20 to-transparent`

HERO CONTENT: `relative flex flex-1 items-center justify-center px-6 text-center`, inner
`flex flex-col items-center`.

HEADLINE `h1` (`rise --i:1`): `font-display font-normal leading-[1.02] tracking-[-0.024em]`
`text-[clamp(84px,15.3vw,220px)]` (exactly **220px** at ≥1440px wide; scales down, never wraps).
```tsx
<h1 ...>
  <span className="text-foreground">Book </span>
  <span className="bg-clip-text text-transparent"
        style={{ backgroundImage: "linear-gradient(to left, #6366f1, #a855f7, #fcd34d)" }}>Time</span>
</h1>
```
(indigo → purple → amber, same gradient and direction as the spec's "AI".)

SUBTITLE `p` (`rise --i:3`): `mt-[9px] max-w-md text-lg leading-8 text-hero-sub opacity-80`
```
Share one link. Invitees book a slot
<br className="hidden sm:inline" /> in their own time zone.
```

CTA (`rise --i:4`): `<LinkButton href={cta} variant="heroSecondary" className="mt-[25px] h-auto px-[29px] py-[24px] text-base">`
- signed out "Get started free" · signed in "Go to dashboard".

INTEGRATIONS MARQUEE (`id="integrations"`, `rise --i:6`): bottom of the section, `pb-10 px-6`
- Container `mx-auto flex w-full max-w-5xl items-center gap-12`
- Left, static (`hidden sm:block shrink-0 text-sm text-foreground/50`):
  `Works with the tools<br/>you already use`
  (The spec's "Relied on by brands across the globe" + made-up logos would be fake social proof.
  These are real integrations the app ships.)
- Right: `integrations-marquee.tsx` rendering React Bits `<LogoLoop>` (props in §2) inside
  `min-w-0 flex-1`. `logos` = `{ node, title }` items, and `renderItem` draws each one as:
  `flex items-center gap-3` → `liquid-glass flex h-6 w-6 items-center justify-center rounded-lg`
  holding a lucide icon (`h-3.5 w-3.5`), then the name in `text-base font-semibold text-foreground`.
  | Name | lucide icon |
  |---|---|
  | Google Calendar | `CalendarDays` |
  | Google Meet | `Video` |
  | WhatsApp sharing | `MessageCircle` |
  | Website embed | `Code2` |
  | Webhooks | `Webhook` |
  | REST API | `Braces` |
  | Apple & Outlook (.ics) | `CalendarCheck` |
  (Icons instead of first letters: two "G" tiles in a row would read as a bug.)

Structure summary: `min-h-screen flex flex-col` → navbar (top) → content (`flex-1`, centred) → marquee (bottom).

═══════════════════════════════════════
5. FEATURES BENTO (`id="features"`)
═══════════════════════════════════════
`<section class="relative mx-auto w-full max-w-6xl scroll-mt-8 px-6 py-28 md:py-36">`

EYEBROW: `text-sm uppercase tracking-widest text-foreground/40`: "Features"

HEADING `h2`: `mt-4 font-display text-4xl font-normal tracking-tight md:text-6xl`, one line on md+:
`Get booked for` + `<RotatingText>` with
`texts={["discovery calls", "demos", "interviews", "office hours", "consults"]}` and
`mainClassName="inline-flex overflow-hidden rounded-2xl liquid-glass px-3 md:px-4 py-0.5 md:py-1 text-transparent bg-clip-text"`
+ `style` backgroundImage = the §4 gradient
(if the gradient doesn't clip through the split spans, put the gradient on
`elementLevelClassName` instead).
`splitLevelClassName="overflow-hidden pb-1"`. Reserve width so the line doesn't jump:
`min-w-[11ch]` on the pill.

GRID: `mt-14 grid gap-4 md:grid-cols-3 md:grid-rows-2`
Every cell is a `<SpotlightCard className="rounded-3xl border border-white/10 bg-white/[0.02] p-6 md:p-8">`.

1. BIG CELL (`md:col-span-2 md:row-span-2`): label "Your booking page"
   (`text-xs uppercase tracking-widest text-foreground/40`), title "What invitees see"
   (`mt-2 text-2xl text-foreground`), then `<div class="mt-6 flex justify-center"><BookingPreview /></div>`.
   BookingPreview is the real product UI, so it stays white. Don't restyle it.
2–5. SMALL CELLS: one per `FEATURES` entry, in order. Each: lucide icon in a
   `liquid-glass h-10 w-10 rounded-xl flex items-center justify-center` tile, short title
   (`mt-5 text-lg text-foreground`), then the FEATURES sentence (`mt-2 text-sm leading-relaxed text-foreground/60`).
   | # | Title | Icon |
   |---|---|---|
   | 1 | One link | `Link2` |
   | 2 | Calendar + Meet | `CalendarDays` |
   | 3 | Embed & share | `Code2` |
   | 4 | Webhooks & API | `Webhook` |
   The grid is 3×2 with the big cell taking 2×2, so 2 small cells fit beside it. Put cells 4–5 in a
   second row: `md:grid-rows-[auto_auto_auto]` with the last two as `md:col-span-1` beneath, OR
   make the grid `md:grid-cols-3` with the big cell `md:col-span-2 md:row-span-2` and 4 small cells
   filling (col 3 row 1), (col 3 row 2), then a new row of (col 1)+(col 2)+(col 3 = CTA cell:
   "Try it on the live demo →" → `/demo`). Pick the second; the page has no empty cells.

═══════════════════════════════════════
6. TIME-ZONES BAND (`id="time-zones"`), SPACE VIDEO
═══════════════════════════════════════
`<section class="relative mx-4 overflow-hidden rounded-[32px] md:mx-8 scroll-mt-8">`
- `<LazyVideo>` = §1 Orbis space URL, `absolute inset-0 h-full w-full object-cover`.
- Content: `relative z-10 mx-auto flex min-h-[80vh] max-w-6xl flex-col justify-end gap-10 px-6 py-16 md:py-24`
  - `h2` via `<BlurText>`: "Every time zone, handled." in
    `font-display text-5xl md:text-7xl tracking-tight text-foreground`
  - `p` `max-w-xl text-base md:text-lg leading-relaxed text-hero-sub`:
    "Invitees see open slots in their own local time. Your weekly hours stay in yours, and
    daylight-saving changes are already accounted for."
  - A row of 4 `liquid-glass rounded-2xl px-5 py-4` chips, `flex flex-wrap gap-3`. Same
    moment (the slot highlighted in BookingPreview: Thu 15 Oct 2026, 10:30 IST) in four zones:
    | Label (`text-xs text-foreground/50`) | Time (`text-lg text-foreground`) |
    |---|---|
    | Host · Chennai | 10:30 AM IST |
    | London | 6:00 AM BST |
    | New York | 1:00 AM EDT |
    | Sydney | 4:00 PM AEDT |
    (Checked: 05:00 UTC. BST runs until 25 Oct, EDT until 1 Nov, AEDT started 4 Oct.)
- No scrim over the video. Legibility comes from the glass chips and text-shadow
  `0 2px 12px rgb(0 0 0 / .35)` on the h2/p only if a frame is too bright.

═══════════════════════════════════════
7. CLOSING CTA, CALM NAVY VIDEO CARD
═══════════════════════════════════════
`<section class="mx-auto w-full max-w-6xl px-6 py-28 md:py-36">`
- Card: `relative aspect-[4/5] sm:aspect-video overflow-hidden rounded-3xl`
  - `<LazyVideo>` = §1 Velorah URL, `absolute inset-0 h-full w-full object-cover`
  - Gradient: `absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent`.
    This card is the ONE place a gradient is allowed; it isn't the hero.
  - Bottom overlay `absolute inset-x-0 bottom-0 flex flex-col gap-6 p-6 md:flex-row md:items-end md:justify-between md:p-10`:
    - Left `liquid-glass max-w-md rounded-2xl p-6 md:p-8`:
      eyebrow `text-xs uppercase tracking-widest text-foreground/50 mb-3` "Take your time back"
      · `<BlurText>` h2 `font-display text-3xl md:text-4xl text-foreground`: "Stop the back-and-forth."
      · `p mt-3 text-sm md:text-base text-foreground/70`: "Share one link and let people book
      straight into your calendar."
    - Right: `<LinkButton href={cta} variant="heroSecondary" className="h-auto px-8 py-4 text-base">`
      "Get started free" / "Go to dashboard".

FOOTER: `mx-auto flex w-full max-w-6xl items-center justify-between px-6 pb-10 pt-6 text-sm text-foreground/50`,
preceded by the §4 gradient divider. Left "© {new Date().getFullYear()} Schedulo". Right: "Live demo"
(`/demo`) and, when signed out, "Log In" (`/login`), `hover:text-foreground`.

═══════════════════════════════════════
8. ACCESSIBILITY & PERFORMANCE
═══════════════════════════════════════
- All videos and `BookingPreview` are `aria-hidden`. `LogoLoop` gets `ariaLabel="Integrations"`.
- Focus rings come from `LinkButton`'s base; nav links get
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-foreground`.
- Contrast: `text-foreground/50` is only for non-essential labels. Body copy is ≥ `/60`.
- Only the hero video preloads (`preload="auto"`). §6/§7 use `preload="metadata"` + in-view play.
- Reduced motion: `.rise` off, no video playback (first frame visible), and LogoLoop, BlurText and
  RotatingText rely on their own handling. If RotatingText keeps rotating, pass `auto={false}`
  when `matchMedia('(prefers-reduced-motion: reduce)')` matches.

═══════════════════════════════════════
9. ACCEPTANCE CHECKS
═══════════════════════════════════════
- `npm run typecheck`, `npm run lint`, `npm test` pass. `page.tsx` has no `"use client"`.
- Only `motion` added to `package.json`. `layout.tsx` unchanged; dashboard still Inter + light.
- No horizontal scrollbar at 320, 375, 640, 768, 1024, 1280, 1440, 1920 px.
- At 1440×900: hero is exactly one screen; nav top, "Book Time" at 220px centred, marquee at bottom.
- "Book Time" never wraps at ≥320px.
- Hero video fades in over 0.5s, out over the last 0.5s, goes black for ~100ms, and replays forever.
- Signed in: no "Sign Up"/"Log In" anywhere; every CTA says "Dashboard"/"Go to dashboard" → `/dashboard`.
- Nav anchors scroll to `#features`, `#time-zones`, `#integrations`. "Live demo" opens `/demo`.
- Marquee loops seamlessly, pauses on hover, fades at both edges into the background colour.
- Off-screen section videos are paused (check DevTools → Media).

─────────────────────────────────────────────────────────────────────
APPENDIX: FULL VIDEO INVENTORY (from all the source prompts)
─────────────────────────────────────────────────────────────────────
★ = used above. Swap any section video for another dark one if you prefer.

| Source prompt | Role there | URL |
|---|---|---|
| ★ "Power AI" spec (your message) | hero bg, dark blue-purple | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4 |
| ★ Orbis.Nft, about section | dark space, text over | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4 |
| ★ Velorah hero (also Asme service card 1) | deep navy, cinematic | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4 |
| Asme hero | full-bleed, fade loop, black bg | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260405_074625_a81f018a-956b-43fb-9aee-4d1508e30e6a.mp4 |
| Asme featured video | 16:9 rounded card | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4 |
| Asme "Innovation x Vision" | 4:3 beside text | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260307_083826_e938b29f-a43a-41ec-a153-3d4730578ab8.mp4 |
| Asme service card 2 | 16:9 card | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260324_151826_c7218672-6e92-402c-9e45-f1e0f454bdc4.mp4 |
| Vantage | dark cinematic, dashboards theme | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_064556_051587f1-74a1-4336-8c05-4dde3594ed05.mp4 |
| JungleMind | bright sunlit glasshouse (used by the older light `schedulo-hero.md`) | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260831_232706_43757be4-2250-4f09-8cd7-23aebbf147ad.mp4 |
| nexum | light on mobile, darker on desktop | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4 |
| Orbit | black sky, ringed planet, violet clouds | https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4b73c700-3112-4c07-bd48-0af2893dff7c.mp4 |
| Orbis.Nft hero | dark space | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4 |
| Orbis.Nft CTA | dark space, wide, native aspect | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055729_72d66327-b59e-4ae9-bb70-de6ccb5ecdb0.mp4 |
| Orbis.Nft card 1 / 2 / 3 | square NFT objects | …hf_20260331_053923_22c0a6a5-313c-474c-85ff-3b50d25e944a.mp4 · …hf_20260331_054411_511c1b7a-fb2f-42ef-bf6c-32c0b1a06e79.mp4 · …hf_20260331_055427_ac7035b5-9f3b-4289-86fc-941b2432317d.mp4 (same `d8j0ntlcm91z4…/user_38xz…/` prefix) |
| loose URL | unknown | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260624_052448_43259007-b7c4-4269-90bd-e3ab14e80075.mp4 |
| loose URL (HLS) | unknown; needs hls.js | https://stream.mux.com/Ffho601Cogzm02GpMzVct5MI8hRMJepDoTH48AixAHkwQ.m3u8 |
| LTX (R2) | click-driven forward/reverse pairs, not loops | https://pub-86dc5b5484314368ac5436a674b0d919.r2.dev/designs/video-{1..4}.mp4 and video-{1..4}-reverse.mp4 |
