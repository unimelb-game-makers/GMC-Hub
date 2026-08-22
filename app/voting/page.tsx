import Link from "next/link";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Nav } from "@/components/nav";
import { VotingTabs, type VoteSummary } from "@/components/voting-tabs";
import { voteStatus } from "@/lib/voting";
import type { Role } from "@/lib/types";

interface VoteRow {
  id: string;
  title: string;
  allowed_roles: Role[];
  opens_at: string | null;
  closes_at: string;
  closed_early_at: string | null;
  created_at: string;
}

interface BallotRow {
  vote_id: string;
  voter_id: string;
}

export default async function VotingPage() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data: voteData }, { data: ballotData }] = await Promise.all([
    supabase
      .from("votes")
      .select("id, title, allowed_roles, opens_at, closes_at, closed_early_at, created_at")
      .order("created_at", { ascending: false }),
    // Ballot rows need every voter's, not just the signed-in user's own
    // (RLS on vote_ballots only exposes your own row), so this reads
    // through the service role purely to compute an aggregate count.
    createAdminClient().from("vote_ballots").select("vote_id, voter_id"),
  ]);
  const votes = (voteData ?? []) as VoteRow[];
  const ballots = (ballotData ?? []) as BallotRow[];

  // Distinct voters, not raw ballot rows: a multi-select vote lets one
  // voter hold several option rows, which shouldn't inflate this count.
  const votersByVote = new Map<string, Set<string>>();
  for (const b of ballots) {
    const set = votersByVote.get(b.vote_id) ?? new Set<string>();
    set.add(b.voter_id);
    votersByVote.set(b.vote_id, set);
  }
  const ballotCounts = new Map<string, number>();
  for (const [voteId, voters] of votersByVote) {
    ballotCounts.set(voteId, voters.size);
  }

  const voteSummaries: VoteSummary[] = votes.map((v) => ({
    id: v.id,
    title: v.title,
    status: voteStatus({
      opensAt: v.opens_at,
      closesAt: v.closes_at,
      closedEarlyAt: v.closed_early_at,
    }),
    ballotCount: ballotCounts.get(v.id) ?? 0,
    opensAt: v.opens_at,
    effectiveClose: v.closed_early_at ?? v.closes_at,
  }));
  const canManage = hasRole(user, "exec");

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h1 className="font-display text-xl font-semibold tracking-tight">
              Voting Booth
            </h1>
            <p className="mt-1 text-sm text-ink-soft">
              Motions and polls, separate from events and reimbursements.
            </p>
          </div>
          {canManage && (
            <Link
              href="/voting/new"
              className="rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
            >
              New booth
            </Link>
          )}
        </div>

        <VotingTabs votes={voteSummaries} />
      </main>
    </>
  );
}
