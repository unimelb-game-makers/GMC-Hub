"use client";

import { useState } from "react";
import { PendingButton } from "@/components/pending-button";
import { DragRankList } from "@/components/drag-rank-list";
import type { BallotAnswer } from "@/app/voting/elections/actions";
import { seededShuffle } from "@/lib/shuffle";

interface OptionInput {
  id: string;
  label: string;
}

interface QuestionInput {
  id: string;
  title: string;
  description: string;
  options: OptionInput[];
}

export function ElectionBallotForm({
  electionId,
  token,
  questions,
  onSubmit,
}: {
  electionId: string;
  token: string;
  questions: QuestionInput[];
  onSubmit: (electionId: string, token: string, answers: BallotAnswer[]) => Promise<void>;
}) {
  // Seeded by the voter's own token, not Math.random(): the shuffle needs
  // to come out identically on the server render and the client's
  // hydration pass, or React flags a hydration mismatch. Seeding by token
  // still varies the order per voter (and per question) without needing a
  // post-mount effect to re-shuffle.
  const [order, setOrder] = useState<Record<string, string[]>>(() =>
    Object.fromEntries(
      questions.map((q) => [
        q.id,
        seededShuffle(q.options, `${token}:${q.id}`).map((o) => o.id),
      ])
    )
  );
  const [step, setStep] = useState<"rank" | "review">("rank");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const optionsById = Object.fromEntries(
    questions.flatMap((q) => q.options.map((o) => [o.id, o] as const))
  );

  if (submitted) {
    return (
      <div className="rounded-lg border border-line bg-surface p-6 text-center">
        <h2 className="font-display text-lg font-semibold tracking-tight">Thanks for voting</h2>
        <p className="mt-2 text-sm text-ink-soft">
          Your ballot has been recorded. You can close this page.
        </p>
      </div>
    );
  }

  if (step === "review") {
    return (
      <div className="flex flex-col gap-6">
        <p className="text-sm text-ink-soft">
          Check your rankings below, they&apos;re final once you cast your vote.
        </p>
        {questions.map((q) => (
          <div key={q.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
            <h3 className="px-1 text-sm font-semibold">{q.title}</h3>
            <ol className="mt-1 flex flex-col gap-1.5">
              {order[q.id].map((optionId, i) => (
                <li
                  key={optionId}
                  className="flex items-center gap-2 rounded-md border border-line bg-bg px-3 py-2.5 text-sm"
                >
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full bg-accent text-xs font-semibold text-accent-ink">
                    {i + 1}
                  </span>
                  <span className="flex-1 truncate">{optionsById[optionId].label}</span>
                </li>
              ))}
            </ol>
          </div>
        ))}

        {error && <p className="text-sm text-[#f0a3a3]">{error}</p>}
        <div className="flex gap-2">
          <PendingButton
            pending={pending}
            onClick={async () => {
              setError(null);
              setPending(true);
              try {
                const answers: BallotAnswer[] = questions.map((q) => ({
                  questionId: q.id,
                  optionIds: order[q.id],
                }));
                await onSubmit(electionId, token, answers);
                setSubmitted(true);
              } catch (err) {
                setError(err instanceof Error ? err.message : "Couldn't submit your ballot");
              } finally {
                setPending(false);
              }
            }}
            className="rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
          >
            Cast your vote
          </PendingButton>
          <button
            type="button"
            onClick={() => setStep("rank")}
            disabled={pending}
            className="rounded-md border border-line px-5 py-2.5 text-sm font-medium transition-colors hover:bg-bg disabled:cursor-not-allowed disabled:opacity-60"
          >
            Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      {questions.map((q) => (
        <div key={q.id} className="flex flex-col gap-2 rounded-lg border border-line bg-surface p-4">
          <h3 className="text-sm font-semibold">{q.title}</h3>
          {q.description && <p className="text-xs text-ink-soft">{q.description}</p>}
          <p className="text-xs text-ink-soft">
            Drag to rank in order of preference, your first choice at the top.
          </p>
          <div className="mt-1">
            <DragRankList
              items={order[q.id].map((id) => optionsById[id])}
              onReorder={(newOrderIds) =>
                setOrder((prev) => ({ ...prev, [q.id]: newOrderIds }))
              }
            />
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setStep("review")}
        className="self-start rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
      >
        Review
      </button>
    </div>
  );
}
