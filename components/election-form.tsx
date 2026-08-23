"use client";

import { useState } from "react";
import { unstable_rethrow } from "next/navigation";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Checkbox } from "@/components/checkbox";
import { PendingButton } from "@/components/pending-button";
import { ElectionQuestionsInput } from "@/components/election-questions-input";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

export function ElectionForm({ onSubmit }: { onSubmit: (formData: FormData) => Promise<void> }) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          await onSubmit(new FormData(e.currentTarget));
        } catch (err) {
          // createElection finishes by calling redirect(), which Next.js
          // implements as a special thrown error for the framework to
          // catch further up. Left unhandled here, that same throw lands
          // in this catch block first and would flash "Couldn't create the
          // election" for an instant before the redirect actually
          // completes. unstable_rethrow lets it continue past untouched;
          // only a real error reaches the message below.
          unstable_rethrow(err);
          setError(err instanceof Error ? err.message : "Couldn't create the election");
        } finally {
          setPending(false);
        }
      }}
      className="mt-4 flex max-w-lg flex-col gap-3 rounded-lg border border-line bg-surface p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Title
        <input
          name="title"
          required
          placeholder="e.g. 2026 Committee Election"
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea
          name="description"
          rows={2}
          placeholder="Context for voters (optional)"
          className={`${inputClass} max-h-40 overflow-y-auto`}
        />
      </label>

      <div className="flex flex-col gap-1 text-sm font-medium">
        Questions
        <p className="text-xs font-normal text-ink-soft">
          Each is its own instant-runoff race, voters rank the options in order of preference.
        </p>
        <ElectionQuestionsInput />
      </div>

      <div className="flex flex-col gap-1 text-sm font-medium">
        Closes
        <div className="flex gap-2">
          <div className="flex-1">
            <DatePicker name="closes_at_date" required />
          </div>
          <TimePicker name="closes_at_time" required />
        </div>
      </div>

      <label className="flex items-center gap-2 text-sm font-medium">
        <Checkbox checked={scheduleOpen} onChange={(e) => setScheduleOpen(e.target.checked)} />
        Schedule the opening for later
      </label>
      {scheduleOpen && (
        <div className="flex flex-col gap-1 text-sm font-medium">
          Opens
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePicker name="opens_at_date" required />
            </div>
            <TimePicker name="opens_at_time" required />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
      <PendingButton
        pending={pending}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Create election
      </PendingButton>
    </form>
  );
}
