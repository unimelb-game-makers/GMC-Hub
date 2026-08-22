"use client";

import { useMemo, useState } from "react";
import { Checkbox } from "@/components/checkbox";
import { PendingButton } from "@/components/pending-button";

export interface VoteOptionChoice {
  id: string;
  label: string;
}

export function VoteBallotForm({
  options,
  allowMultiple,
  initialSelectedOptionIds,
  onSubmit,
}: {
  options: VoteOptionChoice[];
  allowMultiple: boolean;
  initialSelectedOptionIds: string[];
  onSubmit: (optionIds: string[]) => Promise<void>;
}) {
  const [selected, setSelected] = useState<Set<string>>(
    () => new Set(initialSelectedOptionIds)
  );
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const hasVoted = initialSelectedOptionIds.length > 0;
  const isUnchanged = useMemo(() => {
    if (selected.size !== initialSelectedOptionIds.length) return false;
    return initialSelectedOptionIds.every((id) => selected.has(id));
  }, [selected, initialSelectedOptionIds]);

  const toggle = (id: string) => {
    setSelected((prev) => {
      if (allowMultiple) {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }
      return prev.has(id) && prev.size === 1 ? prev : new Set([id]);
    });
  };

  const handleConfirm = async () => {
    setPending(true);
    setError(null);
    try {
      await onSubmit([...selected]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your vote");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {hasVoted && (
        <p className="text-xs text-ink-soft">
          You can change your vote anytime before it closes.
        </p>
      )}
      <div className="flex flex-col gap-2">
        {options.map((option) => (
          <label
            key={option.id}
            className={`flex cursor-pointer items-center gap-3 rounded-lg border p-3 text-sm font-medium transition-colors ${
              selected.has(option.id)
                ? "border-accent/60 bg-bg"
                : "border-line bg-surface hover:border-accent/40"
            }`}
          >
            <Checkbox
              checked={selected.has(option.id)}
              onChange={() => toggle(option.id)}
              disabled={pending}
            />
            {option.label}
          </label>
        ))}
      </div>
      {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
      <PendingButton
        pending={pending}
        type="button"
        onClick={handleConfirm}
        pendingChildren="Saving…"
        className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
        disabled={selected.size === 0 || isUnchanged}
      >
        {hasVoted ? "Update vote" : "Confirm vote"}
      </PendingButton>
    </div>
  );
}
