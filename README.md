# Schedulo

Self-serve scheduling: a host shares one link, invitees book a free slot in their own timezone, no back-and-forth. See the PRD for scope; this repo is the MVP.

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind v4 · Supabase (Postgres via Drizzle, Auth for Google + email sign-in) · Luxon · Resend · Vitest

## Getting started

Requires Node 20.9+.

```bash
npm install
cp .env.example .env     # fill in the values (see comments in the file)
npm run db:migrate
npm run db:seed          # optional: demo host at /demo
npm run dev              # http://localhost:3000
```

**Database:** the app talks to Supabase Postgres directly with Drizzle (the Supabase client is used only for Auth). Use the *transaction pooler* URL (port 6543); prepared statements are switched off automatically for it. For a fully offline setup, run `npm run db` (real Postgres via `embedded-postgres`) and point `DATABASE_URL` at it.

Without `RESEND_API_KEY`, booking emails (confirmations, reschedules, cancellations) are printed to the dev server console. Sign-in emails are sent by Supabase Auth.

### Sign-in (Supabase Auth)

- **Google** and **email magic links** are Supabase Auth providers. In Supabase → Authentication → URL Configuration, add `http://localhost:3000/auth/callback` (and the production URL) to *Redirect URLs*.
- Magic links use PKCE, so they open in the same browser that requested them. For links that work on any device, change the *Magic Link* and *Confirm signup* email templates to `{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email` (the callback supports both).
- Supabase's built-in mailer sends only a few emails per hour; set up custom SMTP (e.g. Resend) in Supabase before launch.
- Our `users` table is the host profile, keyed by the Supabase auth user id.

### Google Calendar

Uses the same Google OAuth client you configured in Supabase's Google provider:

1. Google Cloud Console → enable the **Google Calendar API**; on the consent screen add scopes `calendar.readonly` and `calendar.events` (and test users while unverified).
2. On the OAuth client, *Authorized redirect URIs* must include both `https://<project-ref>.supabase.co/auth/v1/callback` (sign-in) and `http://localhost:3000/api/google/callback` (Connect Google Calendar).
3. Put the client ID and secret in `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET`. Supabase doesn't refresh Google tokens, so the server needs them.

Signing in with Google grants calendar access in the same step (captured in `/auth/callback`). Any host can also connect a Google account from **Dashboard → Calendars**; that flow talks to Google directly, so it works even when the calendar's Google account differs from the login. Submit the app for Google verification early: sensitive scopes can take weeks, and unverified apps are capped at 100 users.

| Script | |
| --- | --- |
| `npm test` | Unit + integration tests (integration uses in-memory Postgres via PGlite, Google API mocked) |
| `TEST_DATABASE_URL=postgres://… npm test` | Run integration tests against a real, empty Postgres database |
| `npm run typecheck` / `npm run lint` | |
| `npm run db:generate` | Generate a migration after editing `src/db/schema.ts` |

## How it's put together

| Path | What |
| --- | --- |
| `src/lib/availability.ts` | Pure slot engine: weekly hours, date overrides, min notice, booking window, buffers, daily cap, slot interval. Evaluated in UTC; wall-clock rules in the schedule's IANA zone. DST-tested for IST, US, UK, AU. |
| `src/lib/slots.ts` | Loads schedule, overrides, bookings and calendar busy times, then runs the engine. |
| `src/lib/bookings.ts` | Create / reschedule / cancel. The calendar is checked live, then each write runs in a transaction holding a per-host advisory lock and re-checks the slot. |
| `src/lib/google/` | Google Calendar: free/busy (60 s cache for listing, live on submit, fails closed if Google errors), events with Meet links, token refresh, revoked grants pause the booking page and email the host. |
| `src/lib/crypto.ts` | AES-256-GCM for OAuth tokens at rest (`TOKEN_ENCRYPTION_KEY`). |
| `src/proxy.ts`, `src/lib/session.ts`, `src/app/auth/callback` | Supabase session refresh (httpOnly cookies), verified identity via `getClaims()`, sign-in callback. |
| `drizzle/0001_booking_no_overlap.sql` | Final guard: an `EXCLUDE` constraint so no two active bookings for a host can overlap. |
| `drizzle/0003_enable_rls.sql` | Row-level security on every table, so Supabase's Data API can't read them. **Add every new table here**; a test fails otherwise. |
| `src/app/[username]/[slug]` | Public booking page; `src/components/booking-widget.tsx` is the slot picker. |
| `src/app/booking|reschedule|cancel/[token]` | Invitee pages, keyed by an unguessable per-booking token. |
| `src/app/dashboard` | Host: bookings, event types, availability, calendars, settings. |

## Status against the PRD

**Done (P0):** sign-in, onboarding, profile, event types with intake questions and scheduling rules, weekly hours and overrides, public booking pages, booking integrity, confirmation with `.ics`, reschedule/cancel links, notification emails, dashboard with search and CSV export, Google Calendar busy times and event writing with Meet links.

**Next up:**
1. Calendar push notifications (watch channels) and the 6-hourly resync; sync edits made in Google back to bookings. Needs a public HTTPS URL.
2. Reminder worker: 24 h and 1 h emails.
3. Rate limiting on public endpoints (`/api/slots`, booking actions).
