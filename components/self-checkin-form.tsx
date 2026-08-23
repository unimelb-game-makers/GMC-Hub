"use client";

import { useState } from "react";
import { PendingButton } from "@/components/pending-button";
import { Checkbox } from "@/components/checkbox";
import type { ExistingMatch } from "@/app/checkin/[eventId]/actions";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

type Step = "details" | "confirm" | "done";

export function SelfCheckinForm({
  onCheckMatch,
  onSubmit,
}: {
  onCheckMatch: (formData: FormData) => Promise<ExistingMatch>;
  onSubmit: (formData: FormData) => Promise<void>;
}) {
  const [step, setStep] = useState<Step>("details");
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [fullName, setFullName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [notAStudent, setNotAStudent] = useState(false);
  const [course, setCourse] = useState("");
  const [isClubMember, setIsClubMember] = useState(false);
  const [match, setMatch] = useState<ExistingMatch | null>(null);

  const idValid = notAStudent ? studentNumber === "" : studentNumber.length === 7;

  const buildFormData = (confirmedMemberId?: string) => {
    const fd = new FormData();
    fd.set("full_name", fullName);
    fd.set("student_number", studentNumber);
    if (notAStudent) fd.set("not_a_student", "on");
    fd.set("course", course);
    if (isClubMember) fd.set("is_club_member", "on");
    if (confirmedMemberId) fd.set("confirmed_member_id", confirmedMemberId);
    return fd;
  };

  const finishCheckIn = async (confirmedMemberId?: string) => {
    setError(null);
    setPending(true);
    try {
      await onSubmit(buildFormData(confirmedMemberId));
      setStep("done");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't check you in");
    } finally {
      setPending(false);
    }
  };

  if (step === "done") {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 text-center">
        <h2 className="font-display text-lg font-semibold tracking-tight">You&apos;re checked in</h2>
        <p className="mt-2 text-sm text-ink-soft">Thanks, enjoy the event.</p>
      </div>
    );
  }

  if (step === "confirm" && match?.matched) {
    return (
      <div className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4">
        <p className="text-sm">
          Welcome back, <span className="font-semibold">{match.matchedName}</span>. Is this you?
        </p>
        {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
        <div className="flex gap-2">
          <PendingButton
            pending={pending}
            onClick={() => finishCheckIn(match.memberId)}
            className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Yes, that&apos;s me
          </PendingButton>
          <PendingButton
            pending={pending}
            onClick={() => finishCheckIn()}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-bg"
          >
            No, add me as new
          </PendingButton>
        </div>
        <button
          type="button"
          onClick={() => {
            setError(null);
            setStep("details");
          }}
          disabled={pending}
          className="self-start text-xs text-ink-soft underline-offset-2 hover:underline disabled:cursor-not-allowed"
        >
          Edit my details instead
        </button>
      </div>
    );
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          const result = await onCheckMatch(buildFormData());
          if (result.matched) {
            setMatch(result);
            setStep("confirm");
          } else {
            await finishCheckIn();
          }
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't check you in");
        } finally {
          setPending(false);
        }
      }}
      className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Full name
        <input
          name="full_name"
          required
          placeholder="Your full name"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Student ID
        <input
          name="student_number"
          value={studentNumber}
          onChange={(e) => setStudentNumber(e.target.value.replace(/\D/g, ""))}
          inputMode="numeric"
          maxLength={7}
          required={!notAStudent}
          disabled={notAStudent}
          placeholder={notAStudent ? "N/A" : "7 digits"}
          className={`${inputClass} font-mono disabled:cursor-not-allowed disabled:opacity-50`}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          name="not_a_student"
          checked={notAStudent}
          onChange={(e) => {
            setNotAStudent(e.target.checked);
            if (e.target.checked) setStudentNumber("");
          }}
        />
        I&apos;m not a student
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Course
        <input
          name="course"
          value={course}
          onChange={(e) => setCourse(e.target.value.toUpperCase())}
          pattern="[A-Z]+-[A-Z]+"
          title="All caps with a dash, e.g. B-SCI"
          placeholder="e.g. B-SCI (optional)"
          className={`${inputClass} font-mono uppercase`}
        />
      </label>
      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox
          name="is_club_member"
          checked={isClubMember}
          onChange={(e) => setIsClubMember(e.target.checked)}
        />
        I&apos;m a club member
      </label>

      {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
      <PendingButton
        pending={pending}
        disabled={!idValid}
        className="self-start rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Check in
      </PendingButton>
    </form>
  );
}
