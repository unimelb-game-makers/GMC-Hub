"use client";

import { useState } from "react";

// The QR SVG is generated server-side (event detail page) and handed in as
// markup, not built in the browser: it never needs to change per-viewer, so
// there's no reason to ship the qrcode library to the client or regenerate
// it on every reveal.
export function AttendanceSharePanel({
  checkinUrl,
  qrSvg,
}: {
  checkinUrl: string;
  qrSvg: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
      >
        Share check-in form
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center bg-black/60 p-4 sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div
            className="flex w-full max-w-sm flex-col items-center gap-3 rounded-lg border border-line bg-surface p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="font-display text-base font-semibold tracking-tight">
              Self check-in
            </h2>
            <p className="text-center text-xs text-ink-soft">
              Anyone can scan this or open the link to check themselves in, no sign-in needed.
            </p>
            <div
              className="h-48 w-48 flex-none rounded-md bg-[#f0ead6] p-2 [&_svg]:h-full [&_svg]:w-full"
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <div className="flex w-full items-center gap-2">
              <input
                readOnly
                value={checkinUrl}
                onFocus={(e) => e.currentTarget.select()}
                className="flex-1 truncate rounded-md border border-line bg-bg px-2 py-1.5 text-xs text-ink-soft"
              />
              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(checkinUrl);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 1500);
                }}
                className="flex-none rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
              >
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="mt-1 rounded-md border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-bg"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}
