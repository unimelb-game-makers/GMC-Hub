"use client";

import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Checkbox } from "@/components/checkbox";
import { VoteOptionsInput } from "@/components/vote-options-input";
import { PendingButton } from "@/components/pending-button";
import { ROLES, type Role } from "@/lib/types";
import { ROLE_LABELS } from "@/lib/format";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

export function VoteForm({
  onSubmit,
  onCancel,
  submitLabel = "Create booth",
  defaultTitle = "",
  defaultDescription = "",
  defaultOptions = ["", ""],
  optionsLocked = false,
  defaultAllowedRoles = [],
  defaultRevealVoters = false,
  defaultOpensDate = "",
  defaultOpensTime = "",
  defaultClosesDate = "",
  defaultClosesTime = "",
}: {
  onSubmit: (formData: FormData) => Promise<void>;
  onCancel?: () => void;
  submitLabel?: string;
  defaultTitle?: string;
  defaultDescription?: string;
  defaultOptions?: string[];
  optionsLocked?: boolean;
  defaultAllowedRoles?: Role[];
  defaultRevealVoters?: boolean;
  defaultOpensDate?: string;
  defaultOpensTime?: string;
  defaultClosesDate?: string;
  defaultClosesTime?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [title, setTitle] = useState(defaultTitle);
  const [description, setDescription] = useState(defaultDescription);
  const [scheduleOpen, setScheduleOpen] = useState(!!(defaultOpensDate && defaultOpensTime));

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
          await onSubmit(new FormData(e.currentTarget));
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't save the vote");
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

      <VoteOptionsInput defaultOptions={defaultOptions} locked={optionsLocked} />

      <div className="flex flex-col gap-1 text-sm font-medium">
        Who can vote
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-normal">
          {ROLES.map((r) => (
            <label key={r} className="flex items-center gap-2">
              <Checkbox name={`role_${r}`} defaultChecked={defaultAllowedRoles.includes(r)} />
              {ROLE_LABELS[r]}
            </label>
          ))}
        </div>
        <p className="text-xs text-ink-soft">
          Leave all unchecked for anyone signed in to vote.
        </p>
      </div>

      <div className="flex flex-col gap-1">
        <label className="flex items-center gap-2 text-sm font-medium">
          <Checkbox
            name="reveal_voters"
            defaultChecked={defaultRevealVoters}
            disabled={optionsLocked}
          />
          Show who voted for what once this closes
        </label>
        <p className="text-xs text-ink-soft">
          Off by default (secret ballot).
          {optionsLocked && " Votes have already been cast, so this can't be changed."}
        </p>
      </div>

      <div className="flex flex-col gap-1 text-sm font-medium">
        Closes
        <div className="flex gap-2">
          <div className="flex-1">
            <DatePicker name="closes_at_date" defaultValue={defaultClosesDate} required />
          </div>
          <TimePicker name="closes_at_time" defaultValue={defaultClosesTime} required />
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
              <DatePicker name="opens_at_date" defaultValue={defaultOpensDate} required />
            </div>
            <TimePicker name="opens_at_time" defaultValue={defaultOpensTime} required />
          </div>
        </div>
      )}

      {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
      <div className="flex gap-2">
        <PendingButton
          pending={pending}
          className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
        >
          {submitLabel}
        </PendingButton>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-md border border-line px-4 py-2 text-sm font-medium transition-colors hover:bg-bg"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
