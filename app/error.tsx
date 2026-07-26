"use client";

import { useEffect } from "react";
import Link from "next/link";

// Catches any error thrown by a page, layout, or server action anywhere
// under app/ that isn't handled closer to where it happened, so committee
// members see a recoverable message instead of the platform's stock crash
// screen. Client Component: required by Next.js for error boundaries.
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Something went wrong
        </h1>
        <p className="mt-2 max-w-md text-ink-soft">
          {error.message || "An unexpected error occurred."} Nothing was
          lost: any change that failed here was safely rejected rather than
          partially applied.
        </p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-accent px-5 py-2.5 font-medium text-accent-ink transition-colors hover:bg-accent-hover"
        >
          Try again
        </button>
        <Link
          href="/"
          className="rounded-lg border border-line px-5 py-2.5 font-medium transition-colors hover:bg-surface"
        >
          Dashboard
        </Link>
      </div>
    </main>
  );
}
