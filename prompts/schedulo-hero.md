# Schedulo — Landing Hero Prompt

Rebuild the landing page of this repo (`src/app/page.tsx`) as ONE full-viewport, video-backed hero
for the scheduling product "Schedulo". Match every value below exactly. Do not add sections, do not
invent pages or links, do not "improve" anything.

═══════════════════════════════════════
0. READ FIRST — THIS REPO
═══════════════════════════════════════
- Stack is already installed: Next.js 16.3 (App Router) · React 19 · TypeScript · Tailwind CSS v4
  (CSS-first, `@theme` in `src/app/globals.css`, no tailwind.config) · lucide-react · next/font.
- This is NOT the Next.js in your training data. Before writing code, read the relevant guides in
  `node_modules/next/dist/docs/01-app/` and heed deprecation notices (see `AGENTS.md`).
- No new dependencies. No Framer Motion, no shadcn. CSS keyframes only.
- Files you may touch:
  - `src/app/page.tsx` — rewrite (stays an async SERVER component)
  - `src/app/hero-video.tsx` — NEW, `"use client"`, the only client code
  - `src/app/globals.css` — APPEND only (glass + animation classes); do not edit existing tokens
- Do NOT touch `layout.tsx`, `src/components/ui.tsx`, the dashboard, or any booking route.

KEEP THIS LOGIC VERBATIM from the current `page.tsx`:
```ts
const user = await getCurrentUser();          // from "@/lib/session"
const cta = user ? "/dashboard" : "/login";
```
- Signed in → CTAs read "Go to dashboard" and the "Log In" link is not rendered.
- Signed out → header CTA "Get started", hero CTA "Sign up free with Google", "Log In" link shown.
- Keep the existing `BookingPreview()` component and `FEATURES` array unchanged (copy them over as is).
- `/demo` is the seeded demo host (`npm run db:seed`) — it is the only "live example" link.

═══════════════════════════════════════
1. DESIGN TOKENS — REUSE, DON'T REDEFINE
═══════════════════════════════════════
Already in `globals.css` `@theme` — use them as Tailwind classes:
  primary #006bff · primary-hover #0055cc · primary-soft #e6f0ff
  ink #0b3558 (headings) · ink-soft #476788 · muted #5f738a · line #d4e0ed · line-strong #b2c3d6
Font: Inter via next/font (`font-sans`) — already wired. No new font.

Append ONE easing token to `:root` in globals.css:
  --ease: cubic-bezier(0.16, 1, 0.3, 1)        /* expo-out, used by every animation */
  --e-reveal: cubic-bezier(.18, .85, .26, 1)   /* headline mask reveal only */

Light theme: dark navy ink sits directly on a bright, sunlit video. No dark mode for this page.

═══════════════════════════════════════
2. BACKGROUND VIDEO — NO SCRIM
═══════════════════════════════════════
Video (10 s, 16:9, 1080p loop of a sunlit glasshouse — leaves, lilies, a shallow stream, drifting
sunbeams; calm, bright, "time to breathe"):
https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260831_232706_43757be4-2250-4f09-8cd7-23aebbf147ad.mp4

Poster (escape `&` as `&amp;` only if written into raw HTML; in JSX use the plain string):
https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260831_223518_f11bfa03-4e65-47e1-a4a7-30e42a7a8c2f.png&w=1920&q=85

Structure: `<section class="hero">` > `<div class="hero-bg">` > `<HeroVideo />`

`.hero-bg` — `absolute inset-0 -z-10 bg-cover bg-center` with the POSTER as its inline
`backgroundImage`, plus `animation: fade-in 1.15s var(--ease) both`.
  (The poster lives on the wrapper as well, so reduced-motion users who get `video{display:none}`
   still see the artwork — a `display:none` video hides its own poster.)

`<video>` — `absolute inset-0 h-full w-full object-cover object-center`, attributes
`autoPlay loop muted playsInline preload="auto" aria-hidden="true"`, `poster` = poster URL,
`<source type="video/mp4">` = video URL.
  Use object-cover (NOT fill): phones are portrait and fill would squash the frame.

`hero-video.tsx` (`"use client"`) — React does not reliably render the `muted` attribute on SSR,
and `autoPlay` alone does not start playback on iOS. So:
  - `useRef<HTMLVideoElement>`; in `useEffect`: `v.muted = true`
  - `play()` → if `v.paused`, `v.play().catch(() => {})`
  - call it immediately, on `canplay`, on `visibilitychange` when `document.visibilityState === "visible"`,
    and once on the first `pointerdown` / `touchstart` / `scroll` (passive, `{ once: true }`)
  - remove every listener in the effect cleanup

CRITICAL: no gradient, tint, scrim, or overlay element over the video. Legibility comes from the
glass surfaces and dark ink, never from darkening the footage.

═══════════════════════════════════════
3. HERO SHELL
═══════════════════════════════════════
`<main>` keeps `flex flex-1 flex-col` (layout.tsx body is `flex min-h-full flex-col`).

section.hero — `relative isolate flex min-h-svh w-full flex-col overflow-hidden`
                `lg:h-svh lg:min-h-[680px]`
  (≥lg: exactly one screen, nothing scrolls. <lg: content stacks and may grow past one screen.)

═══════════════════════════════════════
4. HEADER
═══════════════════════════════════════
`<header>` — `mx-auto flex w-full max-w-7xl items-center justify-between gap-4`
             `px-5 pt-5 sm:px-8 sm:pt-6 lg:px-12`

BRAND (left, `rise --i:0`): `<Link href="/">` — `flex items-center gap-2 text-xl font-bold tracking-tight text-ink`.
  Icon: lucide `CalendarClock`, `h-8 w-8 text-primary`, `aria-hidden`. Wordmark: Schedulo

RIGHT CLUSTER — `flex items-center gap-3`:

  a) GLASS NAV PILL (`hidden md:flex`, `rise --i:1`):
     `items-center gap-1 rounded-full bg-white/55 p-1.5 ring-1 ring-white/60 backdrop-blur-lg`
     `shadow-[0_8px_24px_-12px_rgba(11,53,88,0.25)]`
     Links — `rounded-full px-4 py-1.5 text-sm font-semibold text-ink/80 transition-colors`
             `hover:bg-white/70 hover:text-ink`
       - "Live demo" → `/demo`
       - "Log In" → `/login`   (signed out only)
     Only these. There are no About / Pricing / Blog pages — do not link to them.

  b) MOBILE LOG IN (`md:hidden`, signed out only):
     `<Link href="/login">` — `px-2 text-sm font-semibold text-ink hover:text-primary`

  c) CTA (`rise --i:2`): `<LinkButton href={cta} size="md">` — label per §0.
     On `<sm` use `size="sm"`: render two buttons, one `sm:hidden` and one `hidden sm:inline-flex`.

  No hamburger: there are only three destinations, all visible at every width.

═══════════════════════════════════════
5. STAGE (two columns ≥lg, stacked below)
═══════════════════════════════════════
`<div class="stage">` —
  `mx-auto grid w-full max-w-7xl flex-1 items-center gap-10 px-5 py-10`
  `sm:px-8 sm:py-14 lg:grid-cols-[minmax(0,1fr)_minmax(0,36rem)] lg:gap-16 lg:px-12 lg:py-0`

LEFT COLUMN (`<div>`, text-left):

BADGE (`rise --i:4`) — `inline-flex items-center gap-3 rounded-full border border-white/70`
  `bg-white/80 py-1 pr-3.5 pl-1 text-[13px] font-medium text-ink/80 backdrop-blur-md`
  Chip: `<span>` `rounded-full bg-primary px-2.5 py-0.5 text-xs font-semibold text-white` → New
  Label: Google Meet links on every booking

HEADLINE `h1` — `mt-6 text-[clamp(40px,5.4vw,80px)] leading-[1.02] font-semibold tracking-[-0.035em] text-ink`
  Two masked lines (mask reveal, see §7):
  ```
  <span class="ln"><span class="ln-i" style="--d:.34s">Easy scheduling</span></span>
  <span class="ln"><span class="ln-i" style="--d:.48s">ahead</span></span>
  ```
  `.ln { display:block; overflow:hidden; padding-bottom:.12em; margin-bottom:-.12em }`
  (clears descenders without changing layout) · `.ln-i { display:block }`

SUBCOPY `p` (`rise --i:8`) — `mt-5 max-w-[34rem] text-[15.5px] leading-[1.6] text-ink/80 sm:text-[17px]`
  Exact text:
  Join professionals who share one link and get booked without the back-and-forth. Clients pick a
  time in their own time zone, and it lands straight in your calendar.

CTA ROW — `mt-8 flex flex-wrap gap-3`
  1. `rise --i:9`  `<LinkButton href={cta} size="lg">` — "Sign up free with Google" / "Go to dashboard"
  2. `rise --i:10` `<LinkButton href="/demo" size="lg" variant="secondary"`
     `className="border-white/70 bg-white/55 backdrop-blur-lg hover:border-white hover:bg-white/75">`
     — See a live booking page

FEATURES `ul` (`rise --i:11`) — `mt-9 grid max-w-xl gap-x-6 gap-y-3 sm:grid-cols-2`
  Each `li`: `flex items-start gap-2.5 text-sm font-medium text-ink`
  Icon: lucide `Check` `mt-0.5 h-4 w-4 shrink-0 text-primary` `aria-hidden`
  Items = the existing `FEATURES` array, unchanged, in order.

RIGHT COLUMN — PREVIEW IN A GLASS FRAME (`rise-card --i:12`):
  `<div class="glass w-full max-w-xl justify-self-center rounded-[26px] p-2.5 sm:p-3 lg:justify-self-end">`
    `<BookingPreview />`   ← existing component, untouched
  `</div>`

═══════════════════════════════════════
6. LIQUID GLASS (append to globals.css)
═══════════════════════════════════════
Light-background variant of the liquid-glass effect. Used ONLY on the preview frame.
```css
.glass {
  position: relative;
  background: rgba(255, 255, 255, 0.42);
  -webkit-backdrop-filter: blur(18px) saturate(1.15);
  backdrop-filter: blur(18px) saturate(1.15);
  border: 1px solid rgba(255, 255, 255, 0.55);
  box-shadow: 0 18px 44px -26px rgba(11, 53, 88, 0.35), inset 0 1px 1px rgba(255, 255, 255, 0.6);
}
.glass::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  padding: 1.4px;
  background: linear-gradient(180deg,
    rgba(255,255,255,0.75) 0%, rgba(255,255,255,0.25) 20%,
    rgba(255,255,255,0) 40%, rgba(255,255,255,0) 60%,
    rgba(255,255,255,0.25) 80%, rgba(255,255,255,0.75) 100%);
  -webkit-mask: linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0);
  -webkit-mask-composite: xor;
  mask-composite: exclude;
  pointer-events: none;
}
```
The blur belongs to the glass surfaces only — never blur or filter `.hero-bg`.

═══════════════════════════════════════
7. PAGE-LOAD ENTRANCE (append to globals.css)
═══════════════════════════════════════
```css
@keyframes fade-in   { from { opacity: 0 } to { opacity: 1 } }
@keyframes rise      { from { opacity: 0; transform: translate3d(0, 18px, 0) } to { opacity: 1; transform: none } }
@keyframes rise-card { from { opacity: 0; transform: translate3d(0, 24px, 0) scale(.985) } to { opacity: 1; transform: none } }
@keyframes line-up   { from { transform: translate3d(0, 110%, 0) } to { transform: none } }

.rise      { animation: rise 0.9s var(--ease) both;       animation-delay: calc(var(--i, 0) * 70ms) }
.rise-card { animation: rise-card 1s var(--ease) both;    animation-delay: calc(var(--i, 0) * 70ms) }
.ln-i      { animation: line-up .95s var(--e-reveal) both; animation-delay: var(--d, 0s) }
```
Apply with `className="rise"` + `style={{ "--i": N } as React.CSSProperties}`. Exact N values:
  brand ............... 0      badge ............... 4      primary CTA ......... 9
  nav pill ............ 1      h1 line 1 ........... .34s   secondary CTA ....... 10
  header CTA .......... 2      h1 line 2 ........... .48s   features ul ......... 11
                                subcopy ............. 8      preview frame ....... 12 (rise-card)
Transform/opacity only — layout never shifts. Whole entrance ends at ≈1.8 s.

REDUCED MOTION:
```css
@media (prefers-reduced-motion: reduce) {
  .hero-bg video { display: none }   /* poster on .hero-bg still shows */
  .hero-bg, .rise, .rise-card, .ln-i { animation: none !important }
}
```

═══════════════════════════════════════
8. ACCESSIBILITY
═══════════════════════════════════════
- Video and `BookingPreview` are `aria-hidden` (decorative).
- Focus rings come from `LinkButton`; give the nav pill links
  `focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary`.
- Subcopy is `text-ink/80`, NOT `text-ink-soft` — ink-soft is too light on bright footage.
  If a screenshot shows any text under 4.5:1 against the brightest video frame, add
  `text-shadow: 0 1px 14px rgba(255,255,255,.65)` to that text. Still no overlay.

═══════════════════════════════════════
9. ACCEPTANCE CHECKS
═══════════════════════════════════════
- `npm run typecheck` and `npm run lint` pass. `page.tsx` has no `"use client"`.
- No horizontal scrollbar at 320, 375, 640, 768, 1024, 1280, 1512 px.
- ≥1024px: exactly one screen, no vertical scroll at 1280×720 and above; copy left, glass preview right.
- <768px: nav pill hidden, "Log In" text link + CTA visible and not colliding with the logo at 320px.
- Signed in: no "Log In" anywhere; both primary CTAs read "Go to dashboard" and go to `/dashboard`.
- Headline renders on exactly 2 lines ("Easy scheduling" / "ahead") at every width ≥375px.
- Video fills the section edge to edge, plays muted on iOS Safari, nothing layered over it.
- Reduced motion: no animation, no video, poster visible.
- Entrance plays once in ≈1.8 s.

─────────────────────────────────────────────────────────────────────
APPENDIX — VIDEO INVENTORY (extracted from the source prompts)
─────────────────────────────────────────────────────────────────────
Swap §2's URL for any of these. Dark footage (★) needs the text flipped to white
(`text-white`, `text-white/70` for subcopy) and the glass switched to `rgba(255,255,255,0.10)` fills.

| Source prompt | Look | URL |
|---|---|---|
| JungleMind (USED) | bright sunlit glasshouse | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260831_232706_43757be4-2250-4f09-8cd7-23aebbf147ad.mp4 |
| Velorah ★ | deep navy, cinematic | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260314_131748_f2ca2a28-fed7-44c8-b9a9-bd9acdd5ec31.mp4 |
| nexum | light on mobile, darker on desktop | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260803_192301_9231ed6b-c55c-4a48-909c-4ebe11cf2e11.mp4 |
| Orbit ★ | black sky, planet, violet clouds | https://d2ol7oe51mr4n9.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/4b73c700-3112-4c07-bd48-0af2893dff7c.mp4 |
| Orbis.Nft hero ★ | dark space | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_045634_e1c98c76-1265-4f5c-882a-4276f2080894.mp4 |
| Orbis about ★ | dark space | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_151551_992053d1-3d3e-4b8c-abac-45f22158f411.mp4 |
| Orbis.Nft card 1 | square NFT object | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_053923_22c0a6a5-313c-474c-85ff-3b50d25e944a.mp4 |
| Orbis.Nft card 2 | square NFT object | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_054411_511c1b7a-fb2f-42ef-bf6c-32c0b1a06e79.mp4 |
| Orbis.Nft card 3 | square NFT object | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055427_ac7035b5-9f3b-4289-86fc-941b2432317d.mp4 |
| Orbis.Nft CTA ★ | dark space, wide | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260331_055729_72d66327-b59e-4ae9-bb70-de6ccb5ecdb0.mp4 |
| (loose URL) | unknown | https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260624_052448_43259007-b7c4-4269-90bd-e3ab14e80075.mp4 |
| (loose URL, HLS) | unknown — needs hls.js | https://stream.mux.com/Ffho601Cogzm02GpMzVct5MI8hRMJepDoTH48AixAHkwQ.m3u8 |
