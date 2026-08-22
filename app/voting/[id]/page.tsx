import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Nav } from "@/components/nav";
import { SubmitButton } from "@/components/submit-button";
import { VoteHeader } from "@/components/vote-header";
import { VoteBallotForm } from "@/components/vote-ballot-form";
import { VoteTally } from "@/components/vote-tally";
import { VoteVoterList } from "@/components/vote-voter-list";
import { voteStatus, canVote, resolveVote } from "@/lib/voting";
import type { Role } from "@/lib/types";
import { castBallot, closeVoteEarly, updateVote } from "../actions";

interface VoteDetail {
  id: string;
  title: string;
  description: string;
  allowed_roles: Role[];
  opens_at: string | null;
  closes_at: string;
  closed_early_at: string | null;
  reveal_voters: boolean;
  created_at: string;
  creator: { display_name: string } | null;
}

interface OptionRow {
  id: string;
  label: string;
  display_order: number;
}

interface OwnBallotRow {
  option_id: string;
}

interface BallotRow {
  option_id: string;
}

export default async function VoteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data }, { data: optionData }, { data: ownBallotData }] = await Promise.all([
    supabase
      .from("votes")
      .select(
        "id, title, description, allowed_roles, opens_at, closes_at, closed_early_at, reveal_voters, created_at, creator:app_users!votes_created_by_fkey (display_name)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("vote_options")
      .select("id, label, display_order")
      .eq("vote_id", id)
      .order("display_order", { ascending: true }),
    supabase
      .from("vote_ballots")
      .select("option_id")
      .eq("vote_id", id)
      .eq("voter_id", user.id)
      .maybeSingle(),
  ]);
  if (!data) notFound();
  const vote = data as unknown as VoteDetail;
  const options = (optionData ?? []) as OptionRow[];
  const ownBallot = ownBallotData as OwnBallotRow | null;

  const status = voteStatus({
    opensAt: vote.opens_at,
    closesAt: vote.closes_at,
    closedEarlyAt: vote.closed_early_at,
  });
  const eligible = canVote(vote.allowed_roles, user.roles);
  const canManage = hasRole(user, "exec");

  // Every voter's ballots, not just this user's own (RLS on vote_ballots
  // only exposes your own row), read through the service role purely to
  // compute aggregates: a total count regardless of status, and the full
  // per-option tally only once the vote is closed (ballot secrecy while
  // it's still open).
  const { data: allBallotData } = await createAdminClient()
    .from("vote_ballots")
    .select("option_id")
    .eq("vote_id", id);
  const allBallots = (allBallotData ?? []) as BallotRow[];
  const ballotCount = allBallots.length;
  const result = resolveVote(
    options.map((o) => o.id),
    allBallots.map((b) => ({ optionId: b.option_id }))
  );

  const votedOptionLabel = ownBallot
    ? options.find((o) => o.id === ownBallot.option_id)?.label
    : null;

  let voterBallots: { voterName: string; optionLabel: string }[] = [];
  if (status === "closed" && vote.reveal_voters) {
    const { data: namedBallotData } = await createAdminClient()
      .from("vote_ballots")
      .select(
        "option_id, voter:app_users!vote_ballots_voter_id_fkey (display_name)"
      )
      .eq("vote_id", id);
    const optionLabelById = new Map(options.map((o) => [o.id, o.label]));
    voterBallots = (
      (namedBallotData ?? []) as unknown as {
        option_id: string;
        voter: { display_name: string } | null;
      }[]
    ).map((b) => ({
      voterName: b.voter?.display_name ?? "unknown",
      optionLabel: optionLabelById.get(b.option_id) ?? "unknown",
    }));
  }

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        <Link
          href="/voting"
          className="text-sm text-ink-soft underline-offset-2 hover:underline"
        >
          ← Voting Booth
        </Link>

        <VoteHeader
          status={status}
          canEdit={canManage && status !== "closed"}
          optionsLocked={ballotCount > 0}
          vote={{
            title: vote.title,
            description: vote.description,
            allowedRoles: vote.allowed_roles,
            opensAt: vote.opens_at,
            closesAt: vote.closes_at,
            closedEarlyAt: vote.closed_early_at,
            revealVoters: vote.reveal_voters,
            creatorName: vote.creator?.display_name ?? "unknown",
          }}
          options={options.map((o) => o.label)}
          onUpdate={updateVote.bind(null, vote.id)}
        />

        <section className="mt-6">
          {status === "upcoming" && (
            <>
              <p className="text-sm text-ink-soft">
                Voting hasn&apos;t opened yet. Options:
              </p>
              <ul className="mt-2 flex flex-col gap-2">
                {options.map((o) => (
                  <li
                    key={o.id}
                    className="rounded-lg border border-line bg-surface p-3 text-sm"
                  >
                    {o.label}
                  </li>
                ))}
              </ul>
            </>
          )}

          {status === "open" && (
            <>
              {!eligible ? (
                <p className="rounded-lg border border-line bg-surface p-3 text-sm text-ink-soft">
                  You&apos;re not eligible to vote in this one.
                </p>
              ) : ownBallot ? (
                <p className="rounded-lg border border-line bg-surface p-3 text-sm">
                  You voted for <span className="font-medium">{votedOptionLabel}</span>.
                  Results are revealed once voting closes.
                </p>
              ) : (
                <VoteBallotForm
                  options={options.map((o) => ({ id: o.id, label: o.label }))}
                  onCastBallot={castBallot.bind(null, vote.id)}
                />
              )}
              <p className="mt-3 text-xs text-ink-soft">
                {ballotCount === 1 ? "1 ballot cast so far." : `${ballotCount} ballots cast so far.`}
              </p>
              {canManage && (
                <form action={closeVoteEarly.bind(null, vote.id)} className="mt-3">
                  <SubmitButton className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg">
                    Close voting now
                  </SubmitButton>
                </form>
              )}
            </>
          )}

          {status === "closed" && (
            <>
              <div
                className={`mb-3 inline-block rounded-full px-3 py-1 text-sm font-medium ${
                  result.totalBallots === 0
                    ? "bg-line text-ink-soft"
                    : result.isTie
                      ? "bg-[#4a2222] text-[#f0a3a3]"
                      : result.passed
                        ? "bg-[#26402f] text-[#8fd6ac]"
                        : "bg-[#4a2222] text-[#f0a3a3]"
                }`}
              >
                {result.totalBallots === 0
                  ? "No votes cast"
                  : result.isTie
                    ? "Tied — failed"
                    : result.passed
                      ? "Passed"
                      : "Failed"}
              </div>
              <VoteTally options={options} result={result} />
              {vote.reveal_voters && <VoteVoterList ballots={voterBallots} />}
            </>
          )}
        </section>
      </main>
    </>
  );
}
