"use client";

import { useState, type ReactNode } from "react";

type Tab = "requests" | "attendance" | "stats";

export function EventDetailTabs({
  defaultTab = "requests",
  requestsLabel,
  attendanceLabel,
  requests,
  attendance,
  stats,
}: {
  defaultTab?: Tab;
  requestsLabel: string;
  attendanceLabel: string;
  requests: ReactNode;
  attendance: ReactNode;
  stats: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(defaultTab);

  const tabs: { key: Tab; label: string }[] = [
    { key: "requests", label: requestsLabel },
    { key: "attendance", label: attendanceLabel },
    { key: "stats", label: "Stats" },
  ];

  return (
    <>
      <div className="mt-6 flex gap-1 border-b border-line text-sm font-medium">
        {tabs.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={() => setTab(t.key)}
            className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
              tab === t.key
                ? "border-accent text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>
      {tab === "requests" && requests}
      {tab === "attendance" && attendance}
      {tab === "stats" && stats}
    </>
  );
}
