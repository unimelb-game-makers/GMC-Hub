"use client";

import { useState } from "react";
import Link from "next/link";
import type { ElectionStatus } from "@/lib/types";

export interface ElectionSummary {
  id: string;
  title: string;
  status: ElectionStatus;
  votedCount: number;
  invitedCount: number;
  opensAt: string | null;
  effectiveClose: string;
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Melbourne",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<ElectionStatus, string> = {
  upcoming: "Upcoming",
  open: "Open",
  closed: "Closed",
};
const STATUS_STYLE: Record<ElectionStatus, string> = {
  upcoming: "bg-[#4a3a22] text-[#f0c98d]",
  open: "bg-[#26402f] text-[#8fd6ac]",
  closed: "bg-line text-ink-soft",
};

export function ElectionsList({ elections }: { elections: ElectionSummary[] }) {
  const [tab, setTab] = useState<"active" | "closed">("active");

  const active = elections.filter((e) => e.status !== "closed");
  const closed = elections.filter((e) => e.status === "closed");
  const shown = tab === "active" ? active : closed;

  return (
    <>
      <div className="mt-6 flex gap-1 border-b border-line text-sm font-medium">
        <button
          type="button"
          onClick={() => setTab("active")}
          className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
            tab === "active"
              ? "border-accent text-ink"
              : "border-transparent text-ink-soft hover:text-ink"
          }`}
        >
          Open &amp; upcoming ({active.length})
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
          Closed ({closed.length})
        </button>
      </div>

      <ul className="mt-4 flex flex-col gap-2">
        {shown.map((e) => (
          <li key={e.id}>
            <Link
              href={`/voting/elections/${e.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/40"
            >
              <span className="font-medium">{e.title}</span>
              <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[e.status]}`}>
                {STATUS_LABEL[e.status]}
              </span>
              <span className="ml-auto text-xs text-ink-soft">
                {e.votedCount} / {e.invitedCount} voted
              </span>
              {e.status !== "closed" && (
                <span className="w-full text-xs text-ink-soft/70">
                  {e.status === "upcoming"
                    ? `Opens ${dateFormatter.format(new Date(e.opensAt!))}`
                    : `Closes ${dateFormatter.format(new Date(e.effectiveClose))}`}
                </span>
              )}
            </Link>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="rounded-lg border border-line bg-surface p-4 text-center text-sm text-ink-soft/70">
            {tab === "active" ? "Nothing open right now." : "No closed elections yet."}
          </li>
        )}
      </ul>
    </>
  );
}
