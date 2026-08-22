"use client";

import { useState } from "react";

export interface VoteOptionChoice {
  id: string;
  label: string;
}

export function VoteBallotForm({
  options,
  onCastBallot,
}: {
  options: VoteOptionChoice[];
  onCastBallot: (optionId: string) => Promise<void>;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleVote = async (optionId: string) => {
    setPending(true);
    setError(null);
    try {
      await onCastBallot(optionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't cast your vote");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="flex flex-col gap-2">
      {options.map((option) => (
        <button
          key={option.id}
          type="button"
          disabled={pending}
          onClick={() => handleVote(option.id)}
          className="rounded-lg border border-line bg-surface p-3 text-left text-sm font-medium transition-colors hover:border-accent/60 hover:bg-bg disabled:cursor-not-allowed disabled:opacity-60"
        >
          {option.label}
        </button>
      ))}
      {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
    </div>
  );
}
