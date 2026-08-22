"use client";

import { useState } from "react";
import Link from "next/link";

export interface HomeEventSummary {
  id: string;
  title: string;
  isOpen: boolean;
  createdAt: string;
  requestCount: number;
  attendanceCount: number;
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export function HomeEventsTabs({ events }: { events: HomeEventSummary[] }) {
  const [tab, setTab] = useState<"open" | "closed">("open");

  const openEvents = events.filter((e) => e.isOpen);
  const closedEvents = events.filter((e) => !e.isOpen);
  const shown = tab === "open" ? openEvents : closedEvents;

  return (
    <>
      <div className="mt-3 flex gap-1 border-b border-line text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab("open")}
          className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
            tab === "open"
              ? "border-accent text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Open ({openEvents.length})
        </button>
        <button
          type="button"
          onClick={() => setTab("closed")}
          className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
            tab === "closed"
              ? "border-accent text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Closed ({closedEvents.length})
        </button>
      </div>

      <ul className="mt-3 flex flex-col gap-2">
        {shown.map((event) => (
          <li key={event.id}>
            <Link
              href={`/events/${event.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/40"
            >
              <span className="font-medium">{event.title}</span>
              <span
                className={`inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                  event.isOpen
                    ? "bg-[#26402f] text-[#8fd6ac]"
                    : "bg-line text-ink-soft"
                }`}
              >
                {event.isOpen ? "Open" : "Closed"}
              </span>
              <span className="ml-auto text-xs text-ink-soft">
                {event.requestCount} requests · {event.attendanceCount} checked in
              </span>
              <span className="w-full text-xs text-ink-soft/70">
                {dateFormatter.format(new Date(event.createdAt))}
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="rounded-lg border border-line bg-surface p-4 text-center text-sm text-ink-soft/70">
            {tab === "open" ? "No open events." : "No closed events yet."}
          </li>
        )}
      </ul>
    </>
  );
}
