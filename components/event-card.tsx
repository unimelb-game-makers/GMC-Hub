"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
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
import { REQUEST_STATUSES, type EventType, type RequestStatus } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export interface EventCardProps {
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
  counts: Partial<Record<RequestStatus, number>>;
  attendanceCount: number;
  canManage: boolean;
  onToggleOpen: () => Promise<void>;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function EventCard({
  event,
  counts,
  attendanceCount,
  canManage,
  onToggleOpen,
  onUpdate,
  onDelete,
}: EventCardProps) {
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Controlled: React clears uncontrolled fields once a form action
  // settles, success or failure, so an uncontrolled title/description
  // would wipe itself out the instant validation fails on another field.
  const [title, setTitle] = useState(event.title);
  const [description, setDescription] = useState(event.description);
  const deleteBlocked = Object.keys(counts).length > 0 || attendanceCount > 0;
  const missingCsvDetails = !event.startsAt || !event.venue || event.eventTypes.length === 0;

  if (editing) {
    return (
      <li className="rounded-lg border border-line bg-surface p-4">
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
          className="flex flex-col gap-2"
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
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Save
            </PendingButton>
            <button
              type="button"
              onClick={() => setEditing(false)}
              className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
            >
              Cancel
            </button>
          </div>
        </form>
      </li>
    );
  }

  return (
    <li className="rounded-lg border border-line bg-surface p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <Link
            href={`/events/${event.id}`}
            className="group/title inline-flex items-center gap-1 font-medium underline decoration-ink-soft/40 underline-offset-4 transition-colors hover:text-accent hover:decoration-accent"
          >
            {event.title}
            <span
              aria-hidden
              className="text-ink-soft/50 transition-transform group-hover/title:translate-x-0.5 group-hover/title:text-accent"
            >
              →
            </span>
          </Link>{" "}
          <span
            className={`ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
              event.is_open
                ? "bg-[#26402f] text-[#8fd6ac]"
                : "bg-line text-ink-soft"
            }`}
          >
            {event.is_open ? "Open" : "Closed"}
          </span>
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
          {Object.keys(counts).length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1.5">
              {REQUEST_STATUSES.filter((s) => counts[s]).map((s) => (
                <span key={s} className="inline-flex items-center gap-1 text-xs">
                  <StatusBadge status={s} />
                  <span className="text-ink-soft">×{counts[s]}</span>
                </span>
              ))}
            </div>
          )}
        </div>
        {canManage && (
          <div className="flex flex-none flex-col items-end gap-1.5">
            <div className="flex gap-1.5">
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
              >
                Edit
              </button>
              <form action={onToggleOpen}>
                <SubmitButton className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg">
                  {event.is_open ? "Close" : "Reopen"}
                </SubmitButton>
              </form>
            </div>
            <DeleteEventButton
              eventTitle={event.title}
              blocked={deleteBlocked}
              onDelete={onDelete}
            />
          </div>
        )}
      </div>
    </li>
  );
}
