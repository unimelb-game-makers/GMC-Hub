"use client";

import { useRef, useState } from "react";

const MAX_FILES = 3;
const MAX_SIZE_BYTES = 8 * 1024 * 1024;

function formatSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function ReceiptField({
  label,
  required = true,
}: {
  label: string;
  required?: boolean;
}) {
  const [inDrive, setInDrive] = useState(false);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // The hidden input is the actual field the form submits (multiple files
  // under the same "receipt" name); a DataTransfer keeps its real .files
  // list in sync with our own state, so the chips UI can add/remove freely
  // while everything downstream (including native `required` validation)
  // still sees a normal file input.
  function syncInput(next: File[]) {
    const dt = new DataTransfer();
    next.forEach((f) => dt.items.add(f));
    if (inputRef.current) inputRef.current.files = dt.files;
  }

  function addFiles(picked: FileList | null) {
    if (!picked) return;
    setError(null);
    const incoming = Array.from(picked);
    const tooBig = incoming.find((f) => f.size > MAX_SIZE_BYTES);
    if (tooBig) {
      setError(`"${tooBig.name}" is too large (max ${formatSize(MAX_SIZE_BYTES)} per file)`);
      return;
    }
    const combined = [...files, ...incoming];
    if (combined.length > MAX_FILES) {
      setError(`Up to ${MAX_FILES} files allowed`);
      return;
    }
    setFiles(combined);
    syncInput(combined);
  }

  function removeFile(index: number) {
    setError(null);
    const next = files.filter((_, i) => i !== index);
    setFiles(next);
    syncInput(next);
  }

  function onInvalid(e: React.FormEvent<HTMLInputElement>) {
    // The input is visually hidden (sr-only), so the browser's native
    // validation bubble anchors to its off-screen position instead of the
    // visible "Choose file" button. Suppress it and show our own inline
    // message in the right place instead.
    e.preventDefault();
    setError("Please select one or more files, or confirm it's in the Drive folder.");
  }

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
          multiple
          accept="application/pdf,image/*"
          required={required && !inDrive && files.length === 0}
          disabled={inDrive}
          onChange={(e) => addFiles(e.target.files)}
          onInvalid={onInvalid}
          className="sr-only"
        />
        <span className="flex flex-wrap items-center gap-3">
          <button
            type="button"
            disabled={inDrive || files.length >= MAX_FILES}
            onClick={() => inputRef.current?.click()}
            className="rounded-md bg-accent px-3 py-1.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-50"
          >
            Choose file
          </button>
          <span className="text-sm text-ink-soft">
            {files.length === 0
              ? "No file chosen"
              : `${files.length}/${MAX_FILES} files`}
          </span>
        </span>
        {files.length > 0 && (
          <ul className="flex flex-col gap-1">
            {files.map((file, i) => (
              <li
                key={`${file.name}-${i}`}
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-bg px-2.5 py-1.5 text-xs"
              >
                <span className="truncate text-ink-soft">{file.name}</span>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  aria-label={`Remove ${file.name}`}
                  className="flex-none text-ink-soft transition-colors hover:text-[#f0a3a3]"
                >
                  ✕
                </button>
              </li>
            ))}
          </ul>
        )}
        {error && <p className="text-xs text-[#f0a3a3]">{error}</p>}
      </span>
      <label className="flex items-start gap-2 text-xs text-ink-soft">
        <input
          type="checkbox"
          name="receipt_in_drive"
          checked={inDrive}
          onChange={(e) => {
            setInDrive(e.target.checked);
            setError(null);
          }}
          className="mt-0.5 accent-accent"
        />
        I&apos;ve uploaded this to the correct event&apos;s folder in the
        Drive instead
      </label>
    </div>
  );
}
