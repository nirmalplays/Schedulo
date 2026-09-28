/** Minimal Google OAuth + Calendar v3 client over fetch. */

const CAL = "https://www.googleapis.com/calendar/v3";

export const GOOGLE_CALENDAR_SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
];

/** Our own OAuth client: needed to refresh calendar tokens and for "Connect Google Calendar". */
export const googleConfigured = () => Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);

export const hasCalendarScopes = (scope: string | null | undefined) =>
  GOOGLE_CALENDAR_SCOPES.every((s) => scope?.split(/\s+/).includes(s));

/** The grant is gone (revoked, expired, or password changed): the host must reconnect. */
export class GoogleAuthRevokedError extends Error {}

export class GoogleApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
  }
}

async function call<T>(accessToken: string, path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${CAL}${path}`, {
    ...init,
    headers: { Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json", ...init.headers },
    signal: init.signal ?? AbortSignal.timeout(10_000),
  });
  if (res.status === 204) return undefined as T;
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleApiError(body?.error?.message ?? `Google Calendar ${res.status}`, res.status);
  return body as T;
}

export async function refreshAccessToken(refreshToken: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      refresh_token: refreshToken,
      grant_type: "refresh_token",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    if (body?.error === "invalid_grant") throw new GoogleAuthRevokedError(body.error_description ?? "invalid_grant");
    throw new GoogleApiError(body?.error_description ?? `Token refresh failed (${res.status})`, res.status);
  }
  return body as { access_token: string; expires_in: number; scope?: string };
}

/** Consent URL for connecting a calendar directly (not via Supabase sign-in). */
export function authorizationUrl(redirectUri: string, state: string) {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID ?? "",
    redirect_uri: redirectUri,
    response_type: "code",
    scope: ["openid", "email", ...GOOGLE_CALENDAR_SCOPES].join(" "),
    access_type: "offline",
    // Always show consent so Google returns a refresh token.
    prompt: "consent",
    include_granted_scopes: "true",
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export async function exchangeCode(code: string, redirectUri: string) {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID ?? "",
      client_secret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleApiError(body?.error_description ?? `Code exchange failed (${res.status})`, res.status);
  return body as { access_token: string; refresh_token?: string; expires_in: number; scope: string; id_token?: string };
}

/** Who a token belongs to and what it may do. */
export async function tokenInfo(accessToken: string) {
  const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?access_token=${encodeURIComponent(accessToken)}`, {
    signal: AbortSignal.timeout(10_000),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new GoogleApiError(body?.error_description ?? "Invalid token", res.status);
  return { sub: String(body.sub), email: body.email as string | undefined, scope: String(body.scope ?? ""), expiresIn: Number(body.expires_in ?? 3600) };
}

export async function revokeToken(token: string) {
  await fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, {
    method: "POST",
    signal: AbortSignal.timeout(10_000),
  }).catch(() => {});
}

export type GoogleCalendar = { id: string; summary: string; primary?: boolean; accessRole: string };

export async function listCalendars(accessToken: string): Promise<GoogleCalendar[]> {
  const res = await call<{ items?: GoogleCalendar[] }>(
    accessToken,
    "/users/me/calendarList?minAccessRole=freeBusyReader&fields=items(id,summary,primary,accessRole)",
  );
  return res.items ?? [];
}

export async function freeBusy(accessToken: string, calendarIds: string[], timeMin: Date, timeMax: Date) {
  const res = await call<{
    calendars: Record<string, { busy?: { start: string; end: string }[]; errors?: { reason: string }[] }>;
  }>(accessToken, "/freeBusy", {
    method: "POST",
    body: JSON.stringify({
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      items: calendarIds.map((id) => ({ id })),
    }),
  });
  const busy: { start: Date; end: Date }[] = [];
  for (const [id, cal] of Object.entries(res.calendars ?? {})) {
    // A calendar we can't read must not silently look free.
    if (cal.errors?.length) throw new GoogleApiError(`Can't read calendar ${id}: ${cal.errors[0].reason}`, 502);
    for (const b of cal.busy ?? []) busy.push({ start: new Date(b.start), end: new Date(b.end) });
  }
  return busy;
}

export type EventInput = {
  summary: string;
  description?: string;
  location?: string;
  start: Date;
  end: Date;
  attendees: { email: string; displayName?: string }[];
  bookingId: string;
  createMeet: boolean;
};

export type GoogleEvent = {
  id: string;
  hangoutLink?: string;
  conferenceData?: { entryPoints?: { entryPointType: string; uri: string }[] };
};

export const meetLinkOf = (e: GoogleEvent) =>
  e.hangoutLink ?? e.conferenceData?.entryPoints?.find((p) => p.entryPointType === "video")?.uri ?? null;

export async function insertEvent(accessToken: string, calendarId: string, e: EventInput): Promise<GoogleEvent> {
  const body = {
    summary: e.summary,
    description: e.description,
    location: e.location,
    start: { dateTime: e.start.toISOString() },
    end: { dateTime: e.end.toISOString() },
    attendees: e.attendees,
    // Lets us recognise our own events when syncing back from Google.
    extendedProperties: { private: { bookingId: e.bookingId } },
    reminders: { useDefault: true },
    ...(e.createMeet && {
      conferenceData: { createRequest: { requestId: e.bookingId, conferenceSolutionKey: { type: "hangoutsMeet" } } },
    }),
  };
  // sendUpdates=none: we send our own confirmation email with the .ics.
  return call<GoogleEvent>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events?sendUpdates=none&conferenceDataVersion=1`,
    { method: "POST", body: JSON.stringify(body) },
  );
}

export async function patchEvent(accessToken: string, calendarId: string, eventId: string, patch: { start: Date; end: Date }) {
  return call<GoogleEvent>(
    accessToken,
    `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`,
    {
      method: "PATCH",
      body: JSON.stringify({ start: { dateTime: patch.start.toISOString() }, end: { dateTime: patch.end.toISOString() } }),
    },
  );
}

export async function deleteEvent(accessToken: string, calendarId: string, eventId: string) {
  try {
    await call(accessToken, `/calendars/${encodeURIComponent(calendarId)}/events/${encodeURIComponent(eventId)}?sendUpdates=none`, {
      method: "DELETE",
    });
  } catch (err) {
    // Already deleted in Google: nothing to do.
    if (err instanceof GoogleApiError && (err.status === 404 || err.status === 410)) return;
    throw err;
  }
}
