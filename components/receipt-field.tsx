"use client";

import { useRef, useState } from "react";

export function ReceiptField({
  label,
  required = true,
}: {
  label: string;
  required?: boolean;
}) {
  const [inDrive, setInDrive] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="flex flex-1 flex-col gap-2">
      <span className="flex flex-col gap-1 text-sm font-medium">
        {label}
        {/* Real <input type="file"> stays in the DOM (so it still submits
            with the form) but visually hidden; a normal button drives it via
            .click(). More reliable across browsers/mobile than styling the
            native file-picker button directly. accept covers both
            camera/gallery photos and PDFs — mobile browsers show the full
            picker (gallery, camera, files) for image/* automatically.
            sr-only, not `hidden`/display:none: a display:none input is
            excluded from HTML5 constraint validation, so `required` would
            silently stop blocking submission. */}
        <input
          ref={inputRef}
          name="receipt"
          type="file"
          accept="application/pdf,image/*"
          required={required && !inDrive}
          disabled={inDrive}
          onChange={(e) => setFileName(e.target.files?.[0]?.name ?? null)}
          className="sr-only"
        />
        <span className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={inDrive}
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Choose file
          </button>
          <span className="text-sm text-ink-soft">
            {fileName ?? "No file chosen"}
          </span>
        </span>
      </span>
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
