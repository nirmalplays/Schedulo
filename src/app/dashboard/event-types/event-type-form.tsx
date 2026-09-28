"use client";

import Link from "next/link";
import { useActionState, useState, useTransition } from "react";
import { Alert, Button, Card, Field, Input, Select, Textarea } from "@/components/ui";
import type { EventType, QuestionType } from "@/db/schema";
import { EVENT_COLORS } from "@/lib/colors";
import { saveEventType } from "../actions";

type Question = { label: string; type: QuestionType; required: boolean; options: string[] | null };

const slugify = (s: string) =>
  s.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 60);

const LOCATION_HINTS: Record<string, string> = {
  google_meet: "A Meet link is generated once Google Calendar is connected.",
  zoom: "Your personal Zoom meeting link.",
  phone: "Leave blank to call the invitee, or enter your number for them to call.",
  in_person: "Address shown to the invitee.",
  custom: "Anything else, e.g. a Teams link.",
};

export function EventTypeForm({ eventType, questions: initialQuestions, usernamePrefix }: {
  eventType?: EventType;
  questions: Question[];
  usernamePrefix: string;
}) {
  const [state, action, pending] = useActionState(saveEventType, undefined);
  const [, startTransition] = useTransition();
  const [title, setTitle] = useState(eventType?.title ?? "");
  const [slug, setSlug] = useState(eventType?.slug ?? "");
  const [slugEdited, setSlugEdited] = useState(Boolean(eventType));
  const [locationType, setLocationType] = useState<string>(eventType?.location.type ?? "google_meet");
  const [questions, setQuestions] = useState<Question[]>(initialQuestions);

  const updateQ = (i: number, patch: Partial<Question>) => setQuestions((qs) => qs.map((q, j) => (j === i ? { ...q, ...patch } : q)));

  return (
    <form
      className="space-y-6"
      onSubmit={(e) => {
        // Submit manually so React doesn't reset the fields when validation fails.
        e.preventDefault();
        const data = new FormData(e.currentTarget);
        startTransition(() => action(data));
      }}
    >
      {eventType && <input type="hidden" name="id" value={eventType.id} />}
      <input type="hidden" name="questions" value={JSON.stringify(questions.map((q) => ({ ...q, options: q.options?.map((o) => o.trim()).filter(Boolean) ?? null })))} />
      {state?.error && <Alert>{state.error}</Alert>}

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Basics</h2>
        <Field label="Title" htmlFor="title">
          <Input
            id="title"
            name="title"
            required
            value={title}
            onChange={(e) => {
              setTitle(e.target.value);
              if (!slugEdited) setSlug(slugify(e.target.value));
            }}
            placeholder="30-min Discovery Call"
          />
        </Field>
        <fieldset>
          <legend className="mb-2 block text-sm font-semibold text-ink">Event color</legend>
          <div className="flex flex-wrap gap-2">
            {EVENT_COLORS.map((c) => (
              <label key={c} className="cursor-pointer">
                <input type="radio" name="color" value={c} defaultChecked={(eventType?.color ?? EVENT_COLORS[0]) === c} className="peer sr-only" />
                <span
                  className="block h-8 w-8 rounded-full ring-offset-2 peer-checked:ring-2 peer-checked:ring-ink peer-focus-visible:ring-2 peer-focus-visible:ring-primary"
                  style={{ backgroundColor: c }}
                  aria-label={c}
                />
              </label>
            ))}
          </div>
        </fieldset>
        <Field label="URL" htmlFor="slug" hint={`${usernamePrefix}/${slug || "…"}`}>
          <Input
            id="slug"
            name="slug"
            required
            value={slug}
            onChange={(e) => {
              setSlug(e.target.value);
              setSlugEdited(true);
            }}
          />
        </Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Duration (minutes)" htmlFor="durationMin">
            <Input id="durationMin" name="durationMin" type="number" min={5} max={720} step={5} required defaultValue={eventType?.durationMin ?? 30} />
          </Field>
          <Field label="Location" htmlFor="locationType">
            <Select id="locationType" name="locationType" value={locationType} onChange={(e) => setLocationType(e.target.value)}>
              <option value="google_meet">Google Meet</option>
              <option value="zoom">Zoom</option>
              <option value="phone">Phone call</option>
              <option value="in_person">In person</option>
              <option value="custom">Custom</option>
            </Select>
          </Field>
        </div>
        {locationType !== "google_meet" && (
          <Field label="Location details" htmlFor="locationValue" hint={LOCATION_HINTS[locationType]}>
            <Input id="locationValue" name="locationValue" defaultValue={eventType?.location.value ?? ""} />
          </Field>
        )}
        {locationType === "google_meet" && <p className="text-xs text-muted">{LOCATION_HINTS.google_meet}</p>}
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={eventType?.description ?? ""} maxLength={2000} />
        </Field>
      </Card>

      <Card className="space-y-4 p-6">
        <h2 className="font-semibold">Scheduling rules</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Buffer before (min)" htmlFor="bufferBeforeMin">
            <Input id="bufferBeforeMin" name="bufferBeforeMin" type="number" min={0} max={240} step={5} defaultValue={eventType?.bufferBeforeMin ?? 0} />
          </Field>
          <Field label="Buffer after (min)" htmlFor="bufferAfterMin">
            <Input id="bufferAfterMin" name="bufferAfterMin" type="number" min={0} max={240} step={5} defaultValue={eventType?.bufferAfterMin ?? 0} />
          </Field>
          <Field label="Minimum notice (hours)" htmlFor="minNoticeHours" hint="How soon before a slot it can still be booked.">
            <Input
              id="minNoticeHours"
              name="minNoticeHours"
              type="number"
              min={0}
              step={0.5}
              defaultValue={(eventType?.minNoticeMin ?? 240) / 60}
            />
          </Field>
          <Field label="Booking window (days)" htmlFor="windowDays" hint="How far into the future invitees can book.">
            <Input id="windowDays" name="windowDays" type="number" min={1} max={365} defaultValue={eventType?.windowDays ?? 60} />
          </Field>
          <Field label="Max bookings per day" htmlFor="dailyCap" hint="Leave blank for no limit.">
            <Input id="dailyCap" name="dailyCap" type="number" min={1} max={100} defaultValue={eventType?.dailyCap ?? ""} />
          </Field>
          <Field label="Start times every" htmlFor="slotIntervalMin">
            <Select id="slotIntervalMin" name="slotIntervalMin" defaultValue={eventType?.slotIntervalMin?.toString() ?? ""}>
              <option value="">Event duration</option>
              <option value="15">15 min</option>
              <option value="30">30 min</option>
              <option value="60">60 min</option>
            </Select>
          </Field>
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="isSecret" defaultChecked={eventType?.isSecret} className="h-4 w-4" />
          Secret: hide from my profile page (only people with the link can book)
        </label>
      </Card>

      <Card className="space-y-4 p-6">
        <div>
          <h2 className="font-semibold">Invitee questions</h2>
          <p className="text-sm text-muted">Name and email are always asked.</p>
        </div>
        {questions.map((q, i) => (
          <div key={i} className="space-y-3 rounded-lg border border-line p-4">
            <div className="grid gap-3 sm:grid-cols-[1fr_10rem]">
              <Input aria-label="Question" value={q.label} placeholder="Question" onChange={(e) => updateQ(i, { label: e.target.value })} />
              <Select
                aria-label="Answer type"
                value={q.type}
                onChange={(e) => {
                  const type = e.target.value as QuestionType;
                  updateQ(i, { type, options: type === "select" ? q.options ?? [] : null });
                }}
              >
                <option value="text">Short text</option>
                <option value="textarea">Long text</option>
                <option value="phone">Phone number</option>
                <option value="select">Dropdown</option>
              </Select>
            </div>
            {q.type === "select" && (
              <Textarea
                aria-label="Dropdown options, one per line"
                placeholder="One option per line"
                className="min-h-20"
                value={(q.options ?? []).join("\n")}
                onChange={(e) => updateQ(i, { options: e.target.value.split("\n") })}
                onBlur={(e) => updateQ(i, { options: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) })}
              />
            )}
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" checked={q.required} onChange={(e) => updateQ(i, { required: e.target.checked })} className="h-4 w-4" />
                Required
              </label>
              <button type="button" className="text-sm text-danger hover:underline" onClick={() => setQuestions((qs) => qs.filter((_, j) => j !== i))}>
                Remove
              </button>
            </div>
          </div>
        ))}
        <Button
          type="button"
          variant="secondary"
          onClick={() => setQuestions((qs) => [...qs, { label: "", type: "text", required: false, options: null }])}
        >
          Add question
        </Button>
      </Card>

      <div className="flex gap-3">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save"}
        </Button>
        <Link href="/dashboard/event-types" className="px-4 py-2 text-sm text-ink-soft hover:text-ink">
          Cancel
        </Link>
      </div>
    </form>
  );
}
