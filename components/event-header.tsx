"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";
import { DeleteEventButton } from "@/components/delete-event-button";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
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
  };
  canManage: boolean;
  hasRequests: boolean;
  onToggleOpen: () => Promise<void>;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function EventHeader({
  event,
  canManage,
  hasRequests,
  onToggleOpen,
  onUpdate,
  onDelete,
}: EventHeaderProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <form
        action={async (formData) => {
          await onUpdate(formData);
          setEditing(false);
        }}
        className="mt-2 flex flex-col gap-2 rounded-lg border border-line bg-surface p-4"
      >
        <input
          name="title"
          required
          defaultValue={event.title}
          className="rounded-md border border-line bg-bg px-3 py-2 text-sm font-medium"
        />
        <textarea
          name="description"
          rows={2}
          defaultValue={event.description}
          className="max-h-40 overflow-y-auto rounded-md border border-line bg-bg px-3 py-2 text-sm"
        />
        <div className="flex gap-2">
          <SubmitButton className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover">
            Save
          </SubmitButton>
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
        <p className="mt-1 text-xs text-ink-soft/70">
          Created by {event.creatorName} · Opened{" "}
          {dateFormatter.format(new Date(event.created_at))}
          {event.closed_at &&
            ` · Closed ${dateFormatter.format(new Date(event.closed_at))}`}
        </p>
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
            hasRequests={hasRequests}
            onDelete={onDelete}
          />
        </div>
      )}
    </div>
  );
}
