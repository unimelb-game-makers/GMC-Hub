"use client";

import { useState } from "react";
import Link from "next/link";
import { StatusBadge } from "@/components/status-badge";
import { REQUEST_STATUSES, type RequestStatus } from "@/lib/types";

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

interface EventCardProps {
  event: {
    id: string;
    title: string;
    description: string;
    is_open: boolean;
    created_at: string;
    closed_at: string | null;
    creatorName: string;
  };
  counts: Partial<Record<RequestStatus, number>>;
  canManage: boolean;
  onToggleOpen: () => Promise<void>;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
}

export function EventCard({
  event,
  counts,
  canManage,
  onToggleOpen,
  onUpdate,
  onDelete,
}: EventCardProps) {
  const [editing, setEditing] = useState(false);

  if (editing) {
    return (
      <li className="rounded-lg border border-line bg-surface p-4">
        <form
          action={async (formData) => {
            await onUpdate(formData);
            setEditing(false);
          }}
          className="flex flex-col gap-2"
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
            className="rounded-md border border-line bg-bg px-3 py-2 text-sm"
          />
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-md bg-accent px-3 py-1.5 text-xs font-medium text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Save
            </button>
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
            className="font-medium underline-offset-2 hover:underline"
          >
            {event.title}
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
          <p className="mt-1 text-xs text-ink-soft/70">
            Created by {event.creatorName} · Opened{" "}
            {dateFormatter.format(new Date(event.created_at))}
            {event.closed_at &&
              ` · Closed ${dateFormatter.format(new Date(event.closed_at))}`}
          </p>
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
                <button
                  type="submit"
                  className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
                >
                  {event.is_open ? "Close" : "Reopen"}
                </button>
              </form>
            </div>
            <form
              action={onDelete}
              onSubmit={(e) => {
                if (!confirm(`Delete "${event.title}"? This can't be undone.`)) {
                  e.preventDefault();
                }
              }}
            >
              <button
                type="submit"
                className="rounded-md border border-[#5a3232] px-3 py-1.5 text-xs font-medium text-[#f0a3a3] transition-colors hover:bg-[#2a1818]"
              >
                Delete
              </button>
            </form>
          </div>
        )}
      </div>
    </li>
  );
}
