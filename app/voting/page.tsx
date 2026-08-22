import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Nav } from "@/components/nav";
import { VotingModeTabs } from "@/components/voting-mode-tabs";
import type { VoteSummary } from "@/components/voting-tabs";
import type { ElectionSummary } from "@/components/elections-list";
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
  const canManage = hasRole(user, "exec");

  const [{ data: voteData }, { data: ballotData }, electionSummaries] = await Promise.all([
    supabase
      .from("votes")
      .select("id, title, allowed_roles, opens_at, closes_at, closed_early_at, created_at")
      .order("created_at", { ascending: false }),
    // Ballot rows need every voter's, not just the signed-in user's own
    // (RLS on vote_ballots only exposes your own row), so this reads
    // through the service role purely to compute an aggregate count.
    createAdminClient().from("vote_ballots").select("vote_id, voter_id"),
    // Elections are exec-only end to end (public voters never see this
    // page, they vote from their emailed link instead), so the tab and its
    // data are hidden from every other role rather than shown read-only.
    canManage ? fetchElectionSummaries() : Promise.resolve([]),
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

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <div>
          <h1 className="font-display text-xl font-semibold tracking-tight">
            Voting Booth
          </h1>
          <p className="mt-1 text-sm text-ink-soft">
            Motions and polls, separate from events and reimbursements.
          </p>
        </div>

        <VotingModeTabs
          votes={voteSummaries}
          elections={electionSummaries as ElectionSummary[]}
          canManage={canManage}
        />
      </main>
    </>
  );
}

interface ElectionRow {
  id: string;
  title: string;
  opens_at: string | null;
  closes_at: string;
  closed_early_at: string | null;
}

interface ElectionVoterRow {
  election_id: string;
  voted_at: string | null;
}

async function fetchElectionSummaries(): Promise<ElectionSummary[]> {
  const admin = createAdminClient();
  const [{ data: electionData }, { data: voterData }] = await Promise.all([
    admin
      .from("elections")
      .select("id, title, opens_at, closes_at, closed_early_at")
      .order("closes_at", { ascending: false }),
    admin.from("election_voters").select("election_id, voted_at"),
  ]);
  const elections = (electionData ?? []) as ElectionRow[];
  const voters = (voterData ?? []) as ElectionVoterRow[];

  const invitedCounts = new Map<string, number>();
  const votedCounts = new Map<string, number>();
  for (const v of voters) {
    invitedCounts.set(v.election_id, (invitedCounts.get(v.election_id) ?? 0) + 1);
    if (v.voted_at) votedCounts.set(v.election_id, (votedCounts.get(v.election_id) ?? 0) + 1);
  }

  return elections.map((e) => ({
    id: e.id,
    title: e.title,
    status: voteStatus({
      opensAt: e.opens_at,
      closesAt: e.closes_at,
      closedEarlyAt: e.closed_early_at,
    }),
    votedCount: votedCounts.get(e.id) ?? 0,
    invitedCount: invitedCounts.get(e.id) ?? 0,
    opensAt: e.opens_at,
    effectiveClose: e.closed_early_at ?? e.closes_at,
  }));
}
