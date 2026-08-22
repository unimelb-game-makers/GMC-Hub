"use client";

import { useState } from "react";
import Link from "next/link";

export interface AttendanceEventSummary {
  id: string;
  title: string;
  isOpen: boolean;
  count: number;
}

export interface AttendanceSearchEntry {
  id: string;
  fullName: string;
  studentNumber: string | null;
  eventId: string;
  eventTitle: string;
  createdAt: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function AttendanceSearch({
  events,
  entries,
}: {
  events: AttendanceEventSummary[];
  entries: AttendanceSearchEntry[];
}) {
  const [query, setQuery] = useState("");
  const [eventTab, setEventTab] = useState<"open" | "previous">("open");

  const q = query.trim().toLowerCase();
  const matches = q
    ? entries.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          (e.studentNumber ?? "").toLowerCase().includes(q)
      )
    : [];

  const openEvents = events.filter((e) => e.isOpen);
  const previousEvents = events.filter((e) => !e.isOpen);
  const shownEvents = eventTab === "open" ? openEvents : previousEvents;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search every event by name or student number"
        className="w-full max-w-md rounded-md border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-soft/60"
      />

      {q ? (
        <ul className="flex flex-col gap-2">
          {matches.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/events/${entry.eventId}?tab=attendance`}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/40"
              >
                <span className="font-medium">{entry.fullName}</span>
                {entry.studentNumber && (
                  <span className="font-mono text-ink-soft">
                    {entry.studentNumber}
                  </span>
                )}
                <span className="ml-auto text-xs text-ink-soft">
                  {entry.eventTitle} ·{" "}
                  {dateFormatter.format(new Date(entry.createdAt))}
                </span>
              </Link>
            </li>
          ))}
          {matches.length === 0 && (
            <li className="py-8 text-center text-sm text-ink-soft/70">
              No one matching &ldquo;{query}&rdquo; has been checked in anywhere.
            </li>
          )}
        </ul>
      ) : (
        <>
          <div className="flex gap-1 border-b border-line text-sm font-medium">
            <button
              type="button"
              onClick={() => setEventTab("open")}
              className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
                eventTab === "open"
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              Open ({openEvents.length})
            </button>
            <button
              type="button"
              onClick={() => setEventTab("previous")}
              className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
                eventTab === "previous"
                  ? "border-accent text-ink"
                  : "border-transparent text-ink-soft hover:text-ink"
              }`}
            >
              Previous ({previousEvents.length})
            </button>
          </div>

          <ul className="flex flex-col gap-2">
            {shownEvents.map((event) => (
              <li key={event.id}>
                <Link
                  href={`/events/${event.id}?tab=attendance`}
                  className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/40"
                >
                  <span className="font-medium">{event.title}</span>
                  <span className="text-ink-soft">
                    {event.count} checked in
                  </span>
                </Link>
              </li>
            ))}
            {shownEvents.length === 0 && (
              <li className="py-8 text-center text-sm text-ink-soft/70">
                {eventTab === "open" ? "No open events." : "No previous events."}
              </li>
            )}
          </ul>
        </>
      )}
    </div>
  );
}
