"use client";

import { useState } from "react";
import { SubmitButton } from "@/components/submit-button";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

export interface AttendanceEntryRow {
  id: string;
  fullName: string;
  studentNumber: string | null;
  createdAt: string;
  checkedInByName: string;
}

export function AttendanceList({
  entries,
  onAdd,
  onRemove,
  exportHref,
}: {
  entries: AttendanceEntryRow[];
  onAdd: (formData: FormData) => Promise<void>;
  onRemove: (entryId: string) => Promise<void>;
  exportHref: string;
}) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? entries.filter(
        (e) =>
          e.fullName.toLowerCase().includes(q) ||
          (e.studentNumber ?? "").toLowerCase().includes(q)
      )
    : entries;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <form
        action={onAdd}
        className="flex flex-wrap items-end gap-2 rounded-lg border border-line bg-surface p-4"
      >
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm font-medium">
          Name
          <input
            name="full_name"
            required
            placeholder="Full name"
            className={inputClass}
          />
        </label>
        <label className="flex min-w-[10rem] flex-1 flex-col gap-1 text-sm font-medium">
          Student number
          <input
            name="student_number"
            placeholder="Optional"
            className={`${inputClass} font-mono`}
          />
        </label>
        <SubmitButton className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover">
          Check in
        </SubmitButton>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name or student number"
          className="max-w-xs flex-1 rounded-md border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-soft/60"
        />
        <a
          href={exportHref}
          className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
        >
          Export CSV
        </a>
      </div>

      <ul className="flex flex-col gap-2">
        {shown.map((entry) => (
          <li
            key={entry.id}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3 text-sm"
          >
            <span className="font-medium">{entry.fullName}</span>
            {entry.studentNumber && (
              <span className="font-mono text-ink-soft">
                {entry.studentNumber}
              </span>
            )}
            <span className="ml-auto text-xs text-ink-soft">
              Checked in by {entry.checkedInByName}
            </span>
            <form action={onRemove.bind(null, entry.id)}>
              <SubmitButton className="rounded-md border border-line px-2 py-1 text-xs font-medium text-ink-soft transition-colors hover:bg-bg hover:text-ink">
                Remove
              </SubmitButton>
            </form>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-ink-soft/70">
            {entries.length === 0 ? "No one checked in yet." : "No matches."}
          </li>
        )}
      </ul>
    </div>
  );
}
