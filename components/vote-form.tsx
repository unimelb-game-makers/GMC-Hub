"use client";

import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Checkbox } from "@/components/checkbox";
import { VoteOptionsInput } from "@/components/vote-options-input";
import { PendingButton } from "@/components/pending-button";
import { ROLES } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/format";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

export function VoteForm({
  onCreate,
}: {
  onCreate: (formData: FormData) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [scheduleOpen, setScheduleOpen] = useState(false);

  return (
    <form
      onSubmit={async (e) => {
        // Manual submit, not <form action={fn}>: that mechanism resets the
        // form's DOM fields directly once the action settles, bypassing
        // React's reconciliation for controlled inputs (checkboxes) until
        // something else triggers a re-render.
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          await onCreate(new FormData(e.currentTarget));
          // On success this redirects to the new vote's page, so no local
          // reset is needed the way the event form needs one.
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't create the vote");
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
          placeholder="e.g. New merch colour"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={inputClass}
        />
      </label>
      <label className="flex flex-col gap-1 text-sm font-medium">
        Description
        <textarea
          name="description"
          rows={2}
          placeholder="Context for voters (optional)"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          className={`${inputClass} max-h-40 overflow-y-auto`}
        />
      </label>

      <VoteOptionsInput />

      <div className="flex flex-col gap-1 text-sm font-medium">
        Who can vote
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-normal">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2">
              <Checkbox name={`role_${r}`} />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-soft">
          Leave all unchecked for anyone signed in to vote.
        </p>
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
        <Checkbox
          checked={scheduleOpen}
          onChange={(e) => setScheduleOpen(e.target.checked)}
        />
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
        Create vote
      </PendingButton>
    </form>
  );
}
