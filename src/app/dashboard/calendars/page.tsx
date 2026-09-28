import { Alert, Badge, Card, LinkButton, PageHeader } from "@/components/ui";
import { googleConfigured, listCalendars, type GoogleCalendar } from "@/lib/google/api";
import { accessTokenFor, getConnections } from "@/lib/google/calendar";
import { requireHost } from "@/lib/session";
import { CalendarSettingsForm, DisconnectButton } from "./calendar-settings";

export const metadata = { title: "Calendars" };

export default async function CalendarsPage(props: PageProps<"/dashboard/calendars">) {
  const host = await requireHost();
  const sp = await props.searchParams;
  const connections = await getConnections(host.id);

  // Load each active connection's calendar list from Google.
  const details = await Promise.all(
    connections.map(async (conn) => {
      if (conn.status !== "active") return { conn, calendars: null as GoogleCalendar[] | null, error: null };
      try {
        return { conn, calendars: await listCalendars(await accessTokenFor(conn)), error: null };
      } catch (err) {
        return { conn, calendars: null, error: err instanceof Error ? err.message : "Couldn't load calendars" };
      }
    }),
  );

  const googleEnabled = googleConfigured();
  const connectButton = googleEnabled ? (
    <LinkButton href="/api/google/connect" prefetch={false} variant={connections.length ? "secondary" : "primary"}>
      {connections.length ? "Connect another Google account" : "Connect Google Calendar"}
    </LinkButton>
  ) : null;

  return (
    <>
      <PageHeader
        title="Calendars"
        description="Connected calendars block busy times on your booking page, and new bookings are added to your calendar."
        actions={connectButton}
      />

      {!googleEnabled && (
        <Alert tone="amber">
          Google isn&apos;t configured yet. Set <code>GOOGLE_CLIENT_ID</code> and <code>GOOGLE_CLIENT_SECRET</code> in the server environment.
        </Alert>
      )}
      {typeof sp.error === "string" && sp.error !== "scopes" && (
        <div className="mb-6">
          <Alert>Couldn&apos;t connect Google Calendar: {sp.error}</Alert>
        </div>
      )}
      {sp.connected && connections.length > 0 && (
        <div className="mb-6">
          <Alert tone="green">Google Calendar connected.</Alert>
        </div>
      )}
      {(sp.error === "scopes" || sp.calendar === "missing") && (
        <div className="mb-6">
          <Alert tone="amber">
            Google didn&apos;t grant calendar access. Connect again and keep the calendar permissions ticked on Google&apos;s consent screen.
          </Alert>
        </div>
      )}

      {connections.length === 0 && googleEnabled && (
        <Card className="p-10 text-center">
          <p className="font-medium">No calendar connected</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-muted">
            Without a calendar, invitees can book times when you&apos;re already busy, and you won&apos;t get Google Meet links.
          </p>
        </Card>
      )}

      <div className="space-y-6">
        {details.map(({ conn, calendars, error }) => (
          <Card key={conn.id} className="p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold">Google · {conn.email ?? "Google account"}</p>
                <div className="mt-1">
                  {conn.status === "active" ? <Badge tone="green">Connected</Badge> : <Badge tone="red">Needs reconnecting</Badge>}
                </div>
              </div>
              <DisconnectButton connectionId={conn.id} />
            </div>

            {conn.status !== "active" && (
              <div className="mt-4 space-y-3">
                <Alert>
                  We lost access to this calendar, so your booking page is paused to avoid double-bookings.
                  {conn.lastError ? ` (${conn.lastError})` : ""}
                </Alert>
                {googleEnabled && (
                  <LinkButton href="/api/google/connect" prefetch={false}>
                    Reconnect Google Calendar
                  </LinkButton>
                )}
              </div>
            )}
            {error && (
              <div className="mt-4">
                <Alert tone="amber">Couldn&apos;t load your calendars from Google: {error}</Alert>
              </div>
            )}
            {calendars && (
              <CalendarSettingsForm
                connectionId={conn.id}
                calendars={calendars.map((c) => ({ id: c.id, summary: c.summary, primary: !!c.primary, writable: ["owner", "writer"].includes(c.accessRole) }))}
                check={conn.checkCalendarIds}
                write={conn.writeCalendarId}
              />
            )}
          </Card>
        ))}
      </div>
    </>
  );
}
