"use client";

import { useState, type ReactNode } from "react";

export function EventDetailTabs({
  defaultTab = "requests",
  requestsLabel,
  attendanceLabel,
  requests,
  attendance,
}: {
  defaultTab?: "requests" | "attendance";
  requestsLabel: string;
  attendanceLabel: string;
  requests: ReactNode;
  attendance: ReactNode;
}) {
  const [tab, setTab] = useState<"requests" | "attendance">(defaultTab);

  return (
    <>
      <div className="mt-6 flex gap-1 border-b border-line text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab("requests")}
          className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
            tab === "requests"
              ? "border-accent text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          {requestsLabel}
        </button>
        <button
          type="button"
          onClick={() => setTab("attendance")}
          className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
            tab === "attendance"
              ? "border-accent text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          {attendanceLabel}
        </button>
      </div>
      {tab === "requests" ? requests : attendance}
    </>
  );
}
