"use client";

import { useState } from "react";
import { EventCard, type EventCardProps } from "@/components/event-card";

type EventEntry = Omit<EventCardProps, "canManage">;

export function EventsTabs({
  openEvents,
  previousEvents,
  canManage,
}: {
  openEvents: EventEntry[];
  previousEvents: EventEntry[];
  canManage: boolean;
}) {
  const [activeTab, setActiveTab] = useState<"open" | "previous">("open");
  const shown = activeTab === "open" ? openEvents : previousEvents;

  return (
    <>
      <div className="mt-6 flex gap-1 border-b border-line text-sm font-medium">
        <button
          type="button"
          onClick={() => setActiveTab("open")}
          className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
            activeTab === "open"
              ? "border-accent text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Open ({openEvents.length})
        </button>
        <button
          type="button"
          onClick={() => setActiveTab("previous")}
          className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
            activeTab === "previous"
              ? "border-accent text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Previous ({previousEvents.length})
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-3">
        {shown.map((entry) => (
          <EventCard key={entry.event.id} {...entry} canManage={canManage} />
        ))}
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-ink-soft/70">
            {activeTab === "open"
              ? canManage
                ? "No open events. Create one above."
                : "No open events. An exec or payment manager needs to create one first."
              : "No previous events yet."}
          </li>
        )}
      </ul>
    </>
  );
}
