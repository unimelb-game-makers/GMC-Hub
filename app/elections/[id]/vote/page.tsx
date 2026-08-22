import { createAdminClient } from "@/lib/supabase/admin";
import { ElectionBallotForm } from "@/components/election-ballot-form";
import { voteStatus } from "@/lib/voting";
import { castElectionBallot, checkElectionToken } from "@/app/voting/elections/actions";

interface ElectionRow {
  id: string;
  title: string;
  description: string;
  opens_at: string | null;
  closes_at: string;
  closed_early_at: string | null;
}

interface QuestionRow {
  id: string;
  title: string;
  description: string;
  options: { id: string; label: string; display_order: number }[];
}

// No requireAppUser() anywhere on this page: public voters are authorized
// purely by holding a valid token in the URL, they never sign in. Listed in
// PUBLIC_PATHS (lib/supabase/middleware.ts) so the auth middleware doesn't
// redirect them to /login.
export default async function PublicElectionVotePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ token?: string }>;
}) {
  const { id } = await params;
  const { token } = await searchParams;

  if (!token) {
    return <Shell title="Invalid link">This voting link is missing its access token.</Shell>;
  }

  const admin = createAdminClient();
  const { data } = await admin
    .from("elections")
    .select("id, title, description, opens_at, closes_at, closed_early_at")
    .eq("id", id)
    .maybeSingle();
  if (!data) {
    return <Shell title="Election not found">This election doesn&apos;t exist.</Shell>;
  }
  const election = data as ElectionRow;

  const tokenCheck = await checkElectionToken(id, token);
  if (!tokenCheck.valid) {
    return (
      <Shell title="Invalid link">
        This voting link isn&apos;t recognised. It may have been replaced by a newer invite,
        contact whoever sent it to you for a fresh link.
      </Shell>
    );
  }
  if (tokenCheck.alreadyVoted) {
    return (
      <Shell title="Already voted">You&apos;ve already cast your ballot in this election.</Shell>
    );
  }

  const status = voteStatus({
    opensAt: election.opens_at,
    closesAt: election.closes_at,
    closedEarlyAt: election.closed_early_at,
  });
  if (status === "upcoming") {
    return <Shell title={election.title}>Voting hasn&apos;t opened yet.</Shell>;
  }
  if (status === "closed") {
    return <Shell title={election.title}>This election has closed.</Shell>;
  }

  const { data: questionData } = await admin
    .from("election_questions")
    .select("id, title, description, options:election_options (id, label, display_order)")
    .eq("election_id", id)
    .order("display_order", { ascending: true });
  const questions = ((questionData ?? []) as unknown as QuestionRow[]).map((q) => ({
    id: q.id,
    title: q.title,
    description: q.description,
    options: [...q.options]
      .sort((a, b) => a.display_order - b.display_order)
      .map((o) => ({ id: o.id, label: o.label })),
  }));

  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col p-4 sm:p-6">
      <h1 className="font-display text-xl font-semibold tracking-tight">{election.title}</h1>
      {election.description && (
        <p className="mt-1 text-sm text-ink-soft">{election.description}</p>
      )}
      <p className="mt-2 text-xs text-ink-soft">
        Your vote is anonymous, there&apos;s no record linking this ballot back to you.
      </p>

      <div className="mt-6">
        <ElectionBallotForm
          electionId={id}
          token={token}
          questions={questions}
          onSubmit={castElectionBallot}
        />
      </div>
    </main>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center p-4 text-center sm:p-6">
      <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{children}</p>
    </main>
  );
}
