"use client";

import { useState } from "react";
import { PendingButton } from "@/components/pending-button";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

interface InviteResult {
  invited: number;
  skipped: number;
  sent: number;
  failed: string[];
}

export function ElectionInviteForm({
  onSubmit,
}: {
  onSubmit: (formData: FormData) => Promise<InviteResult>;
}) {
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<InviteResult | null>(null);
  const [pending, setPending] = useState(false);
  const [emails, setEmails] = useState("");

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setError(null);
        setResult(null);
        setPending(true);
        try {
          const res = await onSubmit(new FormData(e.currentTarget));
          setResult(res);
          setEmails("");
        } catch (err) {
          setError(err instanceof Error ? err.message : "Couldn't send invites");
        } finally {
          setPending(false);
        }
      }}
      className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4"
    >
      <label className="flex flex-col gap-1 text-sm font-medium">
        Invite voters by email
        <textarea
          name="emails"
          rows={4}
          required
          placeholder="One per line, or comma/space separated"
          value={emails}
          onChange={(e) => setEmails(e.target.value)}
          className={`${inputClass} max-h-48 overflow-y-auto`}
        />
      </label>
      <p className="text-xs text-ink-soft">
        Each voter gets a unique, single-use voting link. Re-inviting an email that
        hasn&apos;t voted yet sends a fresh link and cancels the old one.
      </p>

      {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
      {result && (
        <p className="text-sm text-ink-soft">
          Sent {result.sent} invite{result.sent === 1 ? "" : "s"}
          {result.skipped > 0 && `, skipped ${result.skipped} (already voted)`}
          {result.failed.length > 0 && ` — failed to send to: ${result.failed.join(", ")}`}
          .
        </p>
      )}

      <PendingButton
        pending={pending}
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Send invites
      </PendingButton>
    </form>
  );
}
