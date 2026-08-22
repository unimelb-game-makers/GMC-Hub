"use client";

import { useState } from "react";
import Link from "next/link";

export interface StudentSummary {
  id: string;
  fullName: string;
  studentNumber: string | null;
  course: string | null;
  isClubMember: boolean;
  eventCount: number;
}

export function StudentsList({ students }: { students: StudentSummary[] }) {
  const [query, setQuery] = useState("");
  const q = query.trim().toLowerCase();
  const shown = q
    ? students.filter(
        (s) =>
          s.fullName.toLowerCase().includes(q) ||
          (s.studentNumber ?? "").includes(q)
      )
    : students;

  return (
    <div className="mt-4 flex flex-col gap-3">
      <input
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search by name or student number"
        className="w-full max-w-md rounded-md border border-line bg-surface px-3 py-2 text-sm placeholder:text-ink-soft/60"
      />

      <ul className="flex flex-col gap-2">
        {shown.map((s) => (
          <li key={s.id}>
            <Link
              href={`/attendance/students/${s.id}`}
              className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/40"
            >
              <span className="font-medium">{s.fullName}</span>
              <span className="font-mono text-ink-soft">
                {s.studentNumber ?? "N/A"}
              </span>
              {s.course && <span className="text-ink-soft">{s.course}</span>}
              {s.isClubMember && (
                <span className="rounded-full bg-accent-soft px-1.5 py-0.5 text-[10px] font-medium text-accent">
                  Member
                </span>
              )}
              <span className="ml-auto text-xs text-ink-soft">
                {s.eventCount === 1 ? "1 event" : `${s.eventCount} events`}
              </span>
            </Link>
          </li>
        ))}
        {shown.length === 0 && (
          <li className="py-8 text-center text-sm text-ink-soft/70">
            {students.length === 0
              ? "No students on the roster yet."
              : "No matches."}
          </li>
        )}
      </ul>
    </div>
  );
}
