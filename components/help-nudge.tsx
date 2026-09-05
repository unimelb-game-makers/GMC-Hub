"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const DISMISSED_KEY = "gmc-hub-help-nudge-dismissed";

// Shown once on a browser's first visit to the home page, pointing new
// committee members at the Help page. Dismissal is per-browser
// (localStorage), not per-account, so it comes back on a new device but
// never reappears on the one you dismissed it from.
export function HelpNudge() {
  const [dismissed, setDismissed] = useState(true);

  useEffect(() => {
    try {
      setDismissed(localStorage.getItem(DISMISSED_KEY) === "true");
    } catch {
      // Storage unavailable (private browsing, disabled site data): just
      // stay dismissed rather than nag every load.
    }
  }, []);

  function dismiss() {
    setDismissed(true);
    try {
      localStorage.setItem(DISMISSED_KEY, "true");
    } catch {
      // Nothing to fall back to here, worst case it shows again next visit.
    }
  }

  if (dismissed) return null;

  return (
    <div className="mt-4 flex items-center justify-between gap-3 rounded-xl border border-accent/30 bg-accent/10 p-3 text-sm">
      <span>
        New here?{" "}
        <Link href="/help" className="font-medium text-accent underline-offset-2 hover:underline">
          Check the Help page
        </Link>{" "}
        for how everything works.
      </span>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="flex-none text-ink-soft transition-colors hover:text-ink"
      >
        ✕
      </button>
    </div>
  );
}
