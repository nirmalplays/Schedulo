/**
 * Public representations of our objects, shared by the REST API and webhooks.
 * Shapes follow Calendly's API v2 closely so existing integrations map over easily.
 */
import type { Booking, EventType, User, WebhookSubscription } from "@/db/schema";
import { appUrl } from "../email";
import { LOCATION_LABELS } from "../format";
import { manageLinks } from "../notifications";

export const apiBase = () => `${appUrl()}/api/v1`;
export const uri = {
  user: (id: string) => `${apiBase()}/users/${id}`,
  eventType: (id: string) => `${apiBase()}/event_types/${id}`,
  scheduledEvent: (id: string) => `${apiBase()}/scheduled_events/${id}`,
  invitee: (bookingId: string) => `${apiBase()}/scheduled_events/${bookingId}/invitees/${bookingId}`,
  webhook: (id: string) => `${apiBase()}/webhook_subscriptions/${id}`,
};

export function serializeUser(u: User) {
  return {
    uri: uri.user(u.id),
    name: u.name,
    slug: u.username,
    email: u.email,
    scheduling_url: `${appUrl()}/${u.username}`,
    timezone: u.timezone,
    avatar_url: u.image,
    created_at: u.createdAt.toISOString(),
  };
}

export function serializeEventType(t: EventType, host: Pick<User, "id" | "username">) {
  return {
    uri: uri.eventType(t.id),
    name: t.title,
    slug: t.slug,
    active: t.isActive,
    secret: t.isSecret,
    duration: t.durationMin,
    kind: "solo",
    color: t.color,
    description_plain: t.description,
    scheduling_url: `${appUrl()}/${host.username}/${t.slug}`,
    location: { kind: t.location.type, label: LOCATION_LABELS[t.location.type], location: t.location.value ?? null },
    profile: { type: "User", owner: uri.user(host.id) },
    created_at: t.createdAt.toISOString(),
  };
}

export function serializeScheduledEvent(b: Booking, t: EventType) {
  return {
    uri: uri.scheduledEvent(b.id),
    name: t.title,
    status: b.status === "cancelled" ? "canceled" : "active",
    start_time: b.startUtc.toISOString(),
    end_time: b.endUtc.toISOString(),
    event_type: uri.eventType(t.id),
    location: { type: b.location.type, location: b.location.value ?? null, join_url: b.meetLink },
    invitees_counter: { total: 1, active: b.status === "cancelled" ? 0 : 1, limit: 1 },
    event_memberships: [{ user: uri.user(b.hostId) }],
    cancellation:
      b.status === "cancelled" ? { canceled_by: b.cancelledBy ?? "unknown", reason: b.cancelReason, canceler_type: b.cancelledBy ?? "unknown" } : undefined,
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
  };
}

export function serializeInvitee(b: Booking) {
  const links = manageLinks(b);
  return {
    uri: uri.invitee(b.id),
    event: uri.scheduledEvent(b.id),
    name: b.inviteeName,
    email: b.inviteeEmail,
    text_reminder_number: b.inviteePhone,
    timezone: b.inviteeTimezone,
    status: b.status === "cancelled" ? "canceled" : "active",
    rescheduled: b.rescheduleCount > 0,
    questions_and_answers: b.answers.filter((a) => a.value).map((a, i) => ({ question: a.label, answer: a.value, position: i })),
    cancel_url: links.cancel,
    reschedule_url: links.reschedule,
    created_at: b.createdAt.toISOString(),
    updated_at: b.updatedAt.toISOString(),
  };
}

export function serializeSubscription(s: WebhookSubscription) {
  return {
    uri: uri.webhook(s.id),
    callback_url: s.url,
    events: s.events,
    state: s.active ? "active" : "disabled",
    scope: "user",
    user: uri.user(s.userId),
    created_at: s.createdAt.toISOString(),
  };
}
