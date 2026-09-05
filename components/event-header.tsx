"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { PendingButton } from "@/components/pending-button";
import { DeleteEventButton } from "@/components/delete-event-button";
import { EventFormFields } from "@/components/event-form-fields";
import {
  formatEventDate,
  formatEventTime,
  formatEventTypes,
  toDatetimeLocalValue,
} from "@/lib/format";
import type { EventType } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Melbourne",
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface EventHeaderProps {
  event: {
    id: string;
    title: string;
    description: string;
    is_open: boolean;
    created_at: string;
    closed_at: string | null;
    creatorName: string;
    startsAt: string | null;
    venue: string | null;
    eventTypes: EventType[];
    eventTypeOtherDetails: string | null;
  };
  canManage: boolean;
  deleteBlocked: boolean;
  onToggleOpen: () => Promise<void>;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function EventHeader({
  event,
  canManage,
  deleteBlocked,
  onToggleOpen,
  onUpdate,
  onDelete,
}: EventHeaderProps) {
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Controlled: React clears uncontrolled fields once a form action
  // settles, success or failure, so an uncontrolled title/description
  // would wipe itself out the instant validation fails on another field.
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const missingCsvDetails = !event.startsAt || !event.venue || event.eventTypes.length === 0;

  if (editing) {
    return (
      <form
        onSubmit={async (e) => {
          // Not <form action={fn}>: that mechanism resets the form's DOM
          // fields directly once the action settles, success or failure,
          // bypassing React's own reconciliation for controlled inputs
          // like checkboxes until something else re-renders them.
          e.preventDefault();
          setSaveError(null);
          setSaving(true);
          try {
            await onUpdate(new FormData(e.currentTarget));
            setEditing(false);
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Couldn't save changes");
          } finally {
            setSaving(false);
          }
        }}
        className="mt-2 flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
      >
        <input
          name="title"
          required
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className="rounded-md border border-line bg-bg px-3 py-2 text-sm font-medium"
        />
        <textarea
          name="description"
          rows={2}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className="max-h-40 overflow-y-auto rounded-md border border-line bg-bg px-3 py-2 text-sm"
        />
        <EventFormFields
          defaultStartsAt={toDatetimeLocalValue(event.startsAt)}
          defaultVenue={event.venue ?? ""}
          defaultEventTypes={event.eventTypes}
          defaultOtherDetails={event.eventTypeOtherDetails ?? ""}
        />
        {saveError && <p className="text-sm text-[#f0a3a3]">{saveError}</p>}
        <div className="flex gap-2">
          <PendingButton
            pending={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Save
          </PendingButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-bg"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
      <div>
        <div className="flex items-center gap-2">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {event.title}
          </h1>
          <span
            className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              event.is_open
                ? "bg-[#26402f] text-[#8fd6ac]"
                : "bg-line text-ink-soft"
            }`}
          >
            {event.is_open ? "Open" : "Closed"}
          </span>
        </div>
        {event.description && (
          <p className="mt-1 text-sm text-ink-soft">{event.description}</p>
        )}
        {event.startsAt && (
          <p className="mt-1 text-sm text-ink-soft">
            {formatEventDate(event.startsAt)} at {formatEventTime(event.startsAt)}
            {event.venue && ` · ${event.venue}`}
            {event.eventTypes.length > 0 &&
              ` · ${formatEventTypes(event.eventTypes, event.eventTypeOtherDetails)}`}
          </p>
        )}
        <p className="mt-1 text-xs text-ink-soft/70">
          Created by {event.creatorName} · Opened{" "}
          {dateFormatter.format(new Date(event.created_at))}
          {event.closed_at &&
            ` · Closed ${dateFormatter.format(new Date(event.closed_at))}`}
        </p>
        {canManage && missingCsvDetails && (
          <p className="mt-1 text-xs text-[#f0c98d]">
            Add date, venue, and event type to enable the attendance CSV export.
          </p>
        )}
      </div>
      {canManage && (
        <div className="flex flex-none items-center gap-2">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
          >
            Edit
          </button>
          <form action={onToggleOpen}>
            <SubmitButton className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg">
              {event.is_open ? "Close event" : "Reopen event"}
            </SubmitButton>
          </form>
          <DeleteEventButton
            eventTitle={event.title}
            blocked={deleteBlocked}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}
