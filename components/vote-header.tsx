"use client";

import { useState } from "react";
import { VoteForm } from "@/components/vote-form";
import { formatEligibleRoles } from "@/lib/format";
import { formatMelbourne, toMelbourneParts } from "@/lib/timezone";
import type { Role, VoteStatus } from "@/lib/types";

const STATUS_LABEL: Record<VoteStatus, string> = {
  upcoming: "Upcoming",
  open: "Open",
  closed: "Closed",
};
const STATUS_STYLE: Record<VoteStatus, string> = {
  upcoming: "bg-[#4a3a22] text-[#f0c98d]",
  open: "bg-[#26402f] text-[#8fd6ac]",
  closed: "bg-line text-ink-soft",
};

export function VoteHeader({
  status,
  canEdit,
  optionsLocked,
  vote,
  options,
  onUpdate,
}: {
  status: VoteStatus;
  canEdit: boolean;
  optionsLocked: boolean;
  vote: {
    title: string;
    description: string;
    allowedRoles: Role[];
    opensAt: string | null;
    closesAt: string;
    closedEarlyAt: string | null;
    revealVoters: boolean;
    creatorName: string;
  };
  options: string[];
  onUpdate: (formData: FormData) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const effectiveClose = vote.closedEarlyAt ?? vote.closesAt;

  if (editing) {
    const closesParts = toMelbourneParts(vote.closesAt);
    const opensParts = vote.opensAt ? toMelbourneParts(vote.opensAt) : null;
    return (
      <VoteForm
        onSubmit={async (formData) => {
          await onUpdate(formData);
          setEditing(false);
        }}
        onCancel={() => setEditing(false)}
        submitLabel="Save changes"
        defaultTitle={vote.title}
        defaultDescription={vote.description}
        defaultOptions={options}
        optionsLocked={optionsLocked}
        defaultAllowedRoles={vote.allowedRoles}
        defaultRevealVoters={vote.revealVoters}
        defaultClosesDate={closesParts.date}
        defaultClosesTime={closesParts.time}
        defaultOpensDate={opensParts?.date}
        defaultOpensTime={opensParts?.time}
      />
    );
  }

  return (
    <>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          {vote.title}
        </h1>
        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
          {STATUS_LABEL[status]}
        </span>
        {canEdit && (
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="ml-auto rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
          >
            Edit
          </button>
        )}
      </div>
      {vote.description && (
        <p className="mt-1 text-sm text-ink-soft">{vote.description}</p>
      )}

      <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
        <div className="flex gap-1">
          <dt>Eligible:</dt>
          <dd>{formatEligibleRoles(vote.allowedRoles)}</dd>
        </div>
        {vote.opensAt && status === "upcoming" && (
          <div className="flex gap-1">
            <dt>Opens:</dt>
            <dd>{formatMelbourne(vote.opensAt)}</dd>
          </div>
        )}
        <div className="flex gap-1">
          <dt>{status === "closed" ? "Closed:" : "Closes:"}</dt>
          <dd>{formatMelbourne(effectiveClose)}</dd>
        </div>
        <div className="flex gap-1">
          <dt>Created by:</dt>
          <dd>{vote.creatorName}</dd>
        </div>
      </dl>
    </>
  );
}
