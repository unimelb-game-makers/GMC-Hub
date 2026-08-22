"use client";

import { useState } from "react";
import { EventFormFields } from "@/components/event-form-fields";
import { PendingButton } from "@/components/pending-button";

export function NewEventForm({
  onCreate,
}: {
  onCreate: (formData: FormData) => Promise<void>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  // Controlled: React clears uncontrolled fields once a form action
  // settles, success or failure, so an uncontrolled title/description would
  // wipe itself out the instant validation fails on a different field.
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  // Remounts EventFormFields (and its own internal state: venue, event
  // type, date, time) on success, since resetting all of that from here
  // would mean threading reset callbacks through every field.
  const [formKey, setFormKey] = useState(0);

  return (
    <form
      onSubmit={async (e) => {
        // Not <form action={fn}>: React resets a form's fields directly at
        // the DOM level once that mechanism's action settles, success or
        // failure, bypassing React's own reconciliation for controlled
        // inputs like checkboxes until something else re-renders them. A
        // plain submit handler has no such lifecycle to fight.
        e.preventDefault();
        setError(null);
        setPending(true);
        try {
          await onCreate(new FormData(e.currentTarget));
          setTitle("");
          setDescription("");
          setFormKey((k) => k + 1);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't create event");
        } finally {
          setPending(false);
        }
      }}
      className="mt-4 flex max-w-lg flex-col gap-2 rounded-lg border border-line bg-surface p-4"
    >
      <h2 className="text-sm font-medium">New event</h2>
      <input
        name="title"
        required
        placeholder="Event title"
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="rounded-md border border-line bg-bg px-3 py-2 text-sm placeholder:text-ink-soft/60"
      />
      <textarea
        name="description"
        rows={2}
        placeholder="Description (optional)"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
        className="max-h-40 overflow-y-auto rounded-md border border-line bg-bg px-3 py-2 text-sm placeholder:text-ink-soft/60"
      />
      <EventFormFields key={formKey} />
      {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
      <PendingButton
        pending={pending}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Create event
      </PendingButton>
    </form>
  );
}
