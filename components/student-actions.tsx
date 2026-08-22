"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { PendingButton } from "@/components/pending-button";
import { Checkbox } from "@/components/checkbox";
import { ConfirmDeleteButton } from "@/components/confirm-delete-button";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

export interface StudentActionsMember {
  id: string;
  fullName: string;
  studentNumber: string | null;
  course: string | null;
  isClubMember: boolean;
}

export function StudentActions({
  member,
  hasHistory,
  onUpdate,
  onDelete,
}: {
  member: StudentActionsMember;
  hasHistory: boolean;
  onUpdate: (formData: FormData) => Promise<void>;
  onDelete: () => Promise<void>;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  // Controlled, and submitted via a plain onSubmit handler rather than
  // <form action={fn}>: that mechanism resets the form's DOM fields
  // directly once the action settles, success or failure, bypassing
  // React's reconciliation for controlled inputs like this checkbox until
  // something else triggers a re-render.
  const [fullName, setFullName] = useState(member.fullName);
  const [studentNumber, setStudentNumber] = useState(member.studentNumber ?? "");
  const [course, setCourse] = useState(member.course ?? "");
  const [isClubMember, setIsClubMember] = useState(member.isClubMember);

  if (editing) {
    return (
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          setSaveError(null);
          setSaving(true);
          try {
            await onUpdate(new FormData(e.currentTarget));
            setEditing(false);
          } catch (err) {
            setSaveError(err instanceof Error ? err.message : "Couldn't save changes");
          } finally {
            setSaving(false);
          }
        }}
        className="mt-4 flex flex-col gap-2 rounded-lg border border-line bg-surface p-4"
      >
        <label className="flex flex-col gap-1 text-sm font-medium">
          Name
          <input
            name="full_name"
            required
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            className={inputClass}
          />
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Student ID
            <input
              name="student_number"
              inputMode="numeric"
              pattern="\d{7}"
              maxLength={7}
              placeholder="7 digits (optional)"
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              className={`${inputClass} font-mono`}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
            Course
            <input
              name="course"
              pattern="[A-Z]+-[A-Z]+"
              title="All caps with a dash, e.g. B-SCI"
              placeholder="e.g. B-SCI (optional)"
              value={course}
              onChange={(e) => setCourse(e.target.value.toUpperCase())}
              className={`${inputClass} font-mono uppercase`}
            />
          </label>
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            name="is_club_member"
            checked={isClubMember}
            onChange={(e) => setIsClubMember(e.target.checked)}
          />
          Club member
        </label>
        {saveError && <p className="text-sm text-[#f0a3a3]">{saveError}</p>}
        <div className="flex gap-2">
          <PendingButton
            pending={saving}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Save
          </PendingButton>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-bg"
          >
            Cancel
          </button>
        </div>
      </form>
    );
  }

  return (
    <div className="mt-4 flex items-center gap-2">
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
      >
        Edit
      </button>
      <ConfirmDeleteButton
        confirmTitle="Delete student?"
        confirmBody={`Delete "${member.fullName}" from the roster? This can't be undone.`}
        blocked={hasHistory}
        blockedMessage="This student has attendance history. Remove their entries first."
        onDelete={async () => {
          await onDelete();
          router.push("/attendance/students");
        }}
      />
    </div>
  );
}
