"use client";

import { useState } from "react";

// Styled so the native file picker's button is obviously clickable (matches
// the accent button elsewhere) instead of blending into the page.
const fileInputClass =
  "text-sm text-ink-soft file:mr-3 file:cursor-pointer file:rounded-md " +
  "file:border-0 file:bg-accent file:px-3 file:py-1.5 file:text-sm " +
  "file:font-medium file:text-accent-ink file:transition-colors " +
  "hover:file:bg-accent-hover";

export function ReceiptField({
  label,
  required = true,
}: {
  label: string;
  required?: boolean;
}) {
  const [inDrive, setInDrive] = useState(false);

  return (
    <div className="flex flex-1 flex-col gap-2">
      <label className="flex flex-col gap-1 text-sm font-medium">
        {label}
        <input
          name="receipt"
          type="file"
          accept="application/pdf,image/*"
          required={required && !inDrive}
          disabled={inDrive}
          className={fileInputClass}
        />
      </label>
      <label className="flex items-start gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          name="receipt_in_drive"
          checked={inDrive}
          onChange={(e) => setInDrive(e.target.checked)}
          className="mt-0.5 accent-accent"
        />
        I&apos;ve uploaded this to the correct event&apos;s folder in the
        Drive instead
      </label>
    </div>
  );
}
