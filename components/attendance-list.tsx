"use client";

import { useMemo, useState } from "react";
import { SubmitButton } from "@/components/submit-button";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";
const errorClass = "text-sm text-[#f0a3a3]";

export interface AttendanceEntryRow {
  id: string;
  memberId: string;
  fullName: string;
  studentNumber: string | null;
  createdAt: string;
  checkedInByName: string;
}

export interface AttendanceMemberOption {
  id: string;
  fullName: string;
  studentNumber: string | null;
}

export function AttendanceList({
  entries,
  members,
  onCheckInExisting,
  onAddNew,
  onRemove,
  exportHref,
}: {
  entries: AttendanceEntryRow[];
  members: AttendanceMemberOption[];
  onCheckInExisting: (memberId: string) => Promise<void>;
  onAddNew: (formData: FormData) => Promise<void>;
  onRemove: (entryId: string) => Promise<void>;
  exportHref: string;
}) {
  const [nameQuery, setNameQuery] = useState("");
  const [idQuery, setIdQuery] = useState("");
  const [listQuery, setListQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [checkInError, setCheckInError] = useState<string | null>(null);

  const checkedInIds = useMemo(
    () => new Set(entries.map((e) => e.memberId)),
    [entries]
  );

  const nameTrimmed = nameQuery.trim().toLowerCase();
  const idTrimmed = idQuery.trim();
  const hasQuery = nameTrimmed !== "" || idTrimmed !== "";

  // Matches by name first, then narrowed further by student ID if that's
  // filled in too, so searching on just one field still works.
  const matches = hasQuery
    ? members.filter(
        (m) =>
          !checkedInIds.has(m.id) &&
          (nameTrimmed === "" || m.fullName.toLowerCase().includes(nameTrimmed)) &&
          (idTrimmed === "" || (m.studentNumber ?? "").includes(idTrimmed))
      )
    : [];

  const reset = () => {
    setNameQuery("");
    setIdQuery("");
    setCheckInError(null);
  };

  const handleCheckIn = async (memberId: string) => {
    setPending(true);
    setCheckInError(null);
    try {
      await onCheckInExisting(memberId);
      reset();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "Couldn't check them in");
    } finally {
      setPending(false);
    }
  };

  const handleAddNew = async () => {
    setPending(true);
    setCheckInError(null);
    try {
      const formData = new FormData();
      formData.set("full_name", nameQuery.trim());
      formData.set("student_number", idQuery.trim());
      await onAddNew(formData);
      reset();
    } catch (err) {
      setCheckInError(err instanceof Error ? err.message : "Couldn't add them");
    } finally {
      setPending(false);
    }
  };

  const noMatches = hasQuery && matches.length === 0;
  // Student ID is optional (not everyone checked in is a student), but if
  // one's been typed it has to be complete before submitting.
  const idValid = idQuery.trim() === "" || idQuery.trim().length === 7;
  const canSubmitAdd = noMatches && nameQuery.trim() !== "" && idValid;

  const listQueryTrimmed = listQuery.trim().toLowerCase();
  const shown = listQueryTrimmed
    ? entries.filter(
        (e) =>
          e.fullName.toLowerCase().includes(listQueryTrimmed) ||
          (e.studentNumber ?? "").includes(listQueryTrimmed)
      )
    : entries;

  return (
    <div className="mt-4 flex flex-col gap-4">
      <div className="rounded-lg border border-line bg-surface p-4">
        <p className="text-sm font-medium">Check in</p>
        <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end">
          <label className="flex flex-col gap-1 text-sm font-medium sm:min-w-[10rem] sm:flex-1">
            Name
            <input
              value={nameQuery}
              onChange={(e) => setNameQuery(e.target.value)}
              placeholder="Name"
              disabled={pending}
              className={`${inputClass} w-full`}
            />
          </label>
          <label className="flex flex-col gap-1 text-sm font-medium sm:min-w-[10rem] sm:flex-1">
            Student ID
            <input
              value={idQuery}
              onChange={(e) => setIdQuery(e.target.value.replace(/\D/g, ""))}
              inputMode="numeric"
              maxLength={7}
              placeholder="7 digits (optional)"
              disabled={pending}
              className={`${inputClass} w-full font-mono`}
            />
          </label>
          {noMatches ? (
            <button
              type="button"
              onClick={handleAddNew}
              disabled={pending || !canSubmitAdd}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Add and check in
            </button>
          ) : (
            <button
              type="button"
              onClick={() => matches.length === 1 && handleCheckIn(matches[0].id)}
              disabled={pending || matches.length !== 1}
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              Check in
            </button>
          )}
        </div>

        {noMatches && !canSubmitAdd && (
          <p className="mt-2 text-xs text-ink-soft">
            No one on the roster matches. Enter a name to add them as new
            (student ID is optional, but must be 7 digits if given).
          </p>
        )}
        {hasQuery && matches.length > 1 && (
          <p className="mt-2 text-xs text-ink-soft">
            {matches.length} people match. Pick one below.
          </p>
        )}
        {checkInError && <p className={`mt-2 ${errorClass}`}>{checkInError}</p>}

        {hasQuery && matches.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1 border-t border-line pt-3">
            {matches.map((m) => (
              <li key={m.id}>
                <button
                  type="button"
                  onClick={() => handleCheckIn(m.id)}
                  disabled={pending}
                  className="flex w-full items-center gap-3 rounded-md px-2 py-1.5 text-left text-sm transition-colors hover:bg-bg"
                >
                  <span className="font-medium">{m.fullName}</span>
                  <span className="font-mono text-ink-soft">
                    {m.studentNumber ?? "N/A"}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <input
          value={listQuery}
          onChange={(e) => setListQuery(e.target.value)}
          placeholder="Search checked-in list"
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
            <span className="font-mono text-ink-soft">
              {entry.studentNumber ?? "N/A"}
            </span>
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
