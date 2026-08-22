"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

const dangerButtonClass =
  "rounded-md border border-[#5a3232] px-3 py-1.5 text-xs font-medium text-[#f0a3a3] transition-colors hover:bg-[#2a1818]";

export function DeleteEventButton({
  eventTitle,
  blocked,
  onDelete,
}: {
  eventTitle: string;
  blocked: boolean;
  onDelete: () => Promise<void>;
}) {
  const [confirming, setConfirming] = useState(false);
  const [showTip, setShowTip] = useState(false);

  if (blocked) {
    return (
      <span
        className="relative inline-block"
        onMouseEnter={() => setShowTip(true)}
        onMouseLeave={() => setShowTip(false)}
        onClick={() => setShowTip((v) => !v)}
      >
        <span className="cursor-not-allowed rounded-md border border-line px-3 py-1.5 text-xs font-medium text-ink-soft/50">
          Delete
        </span>
        {showTip && (
          <span
            role="tooltip"
            className="absolute bottom-full right-0 z-10 mb-2 w-48 rounded-md border border-line bg-nav px-3 py-2 text-xs font-normal text-nav-ink shadow-lg"
          >
            This event has requests or attendance recorded. Close it instead.
          </span>
        )}
      </span>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className={dangerButtonClass}
      >
        Delete
      </button>

      {confirming && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setConfirming(false)}
        >
          <div
            className="w-full max-w-sm rounded-lg border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-base font-semibold tracking-tight">
              Delete event?
            </h2>
            <p className="mt-2 text-sm text-ink-soft">
              Delete &ldquo;{eventTitle}&rdquo;? This can&apos;t be undone.
            </p>
            <div className="mt-4 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setConfirming(false)}
                className="rounded-md border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-bg"
              >
                Cancel
              </button>
              <form action={onDelete}>
                <SubmitButton className={`${dangerButtonClass} px-4 py-2 text-sm`}>
                  Delete
                </SubmitButton>
              </form>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
