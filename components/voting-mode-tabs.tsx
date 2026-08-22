"use client";

import { useState } from "react";
import Link from "next/link";
import { VotingTabs, type VoteSummary } from "@/components/voting-tabs";
import { ElectionsList, type ElectionSummary } from "@/components/elections-list";

// A second top-level mode, not a new nav item: Elections lives inside the
// existing Voting Booth page as a tab, since public elections and internal
// booths are different enough tools to keep visually distinct, but not
// different enough to earn their own place in the header.
export function VotingModeTabs({
  votes,
  elections,
  canManage,
}: {
  votes: VoteSummary[];
  elections: ElectionSummary[];
  canManage: boolean;
}) {
  const [mode, setMode] = useState<"booths" | "elections">("booths");

  // Elections are exec-only end to end (public voters never see this page,
  // they vote from their emailed link instead), so the mode switcher itself
  // only appears for execs, everyone else gets the plain Booths list they
  // always had.
  if (!canManage) {
    return <VotingTabs votes={votes} />;
  }

  return (
    <>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <div className="flex gap-2 rounded-md border border-line bg-surface p-1 text-sm font-medium">
          <button
            type="button"
            onClick={() => setMode("booths")}
            className={`rounded px-3 py-1.5 transition-colors ${
              mode === "booths" ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            Booths
          </button>
          <button
            type="button"
            onClick={() => setMode("elections")}
            className={`rounded px-3 py-1.5 transition-colors ${
              mode === "elections" ? "bg-accent text-accent-ink" : "text-ink-soft hover:text-ink"
            }`}
          >
            Elections
          </button>
        </div>
        <Link
          href={mode === "booths" ? "/voting/new" : "/voting/elections/new"}
          className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
        >
          {mode === "booths" ? "New booth" : "New election"}
        </Link>
      </div>

      {mode === "booths" ? (
        <VotingTabs votes={votes} />
      ) : (
        <ElectionsList elections={elections} />
      )}
    </>
  );
}
