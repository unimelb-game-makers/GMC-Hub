import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Nav } from "@/components/nav";
import { SubmitButton } from "@/components/submit-button";
import { ElectionInviteForm } from "@/components/election-invite-form";
import { IrvResults } from "@/components/irv-results";
import { voteStatus } from "@/lib/voting";
import { runInstantRunoff } from "@/lib/irv";
import { formatMelbourne } from "@/lib/timezone";
import { closeElectionEarly, inviteVoters } from "../actions";

interface ElectionRow {
  id: string;
  title: string;
  description: string;
  opens_at: string | null;
  closes_at: string;
  closed_early_at: string | null;
  tie_break_seed: string;
  creator: { display_name: string } | null;
}

interface QuestionRow {
  id: string;
  title: string;
  description: string;
  options: { id: string; label: string }[];
}

interface VoterRow {
  email: string;
  invited_at: string;
  voted_at: string | null;
}

interface BallotRow {
  question_id: string;
  option_id: string;
  ballot_group: string;
  rank: number;
}

const STATUS_LABEL = { upcoming: "Upcoming", open: "Open", closed: "Closed" };
const STATUS_STYLE = {
  upcoming: "bg-[#4a3a22] text-[#f0c98d]",
  open: "bg-[#26402f] text-[#8fd6ac]",
  closed: "bg-line text-ink-soft",
};

export default async function ElectionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  if (!hasRole(user, "exec")) notFound();

  const admin = createAdminClient();
  const [{ data }, { data: questionData }, { data: voterData }] = await Promise.all([
    admin
      .from("elections")
      .select(
        "id, title, description, opens_at, closes_at, closed_early_at, tie_break_seed, creator:app_users!elections_created_by_fkey (display_name)"
      )
      .eq("id", id)
      .maybeSingle(),
    admin
      .from("election_questions")
      .select("id, title, description, options:election_options (id, label, display_order)")
      .eq("election_id", id)
      .order("display_order", { ascending: true }),
    admin
      .from("election_voters")
      .select("email, invited_at, voted_at")
      .eq("election_id", id)
      .order("invited_at", { ascending: false }),
  ]);
  if (!data) notFound();
  const election = data as unknown as ElectionRow;
  const questions = ((questionData ?? []) as unknown as (QuestionRow & {
    options: (QuestionRow["options"][number] & { display_order: number })[];
  })[]).map((q) => ({
    ...q,
    options: [...q.options].sort((a, b) => a.display_order - b.display_order),
  }));
  const voters = (voterData ?? []) as VoterRow[];
  const votedCount = voters.filter((v) => v.voted_at).length;

  const status = voteStatus({
    opensAt: election.opens_at,
    closesAt: election.closes_at,
    closedEarlyAt: election.closed_early_at,
  });

  let ballotsByQuestion: Map<string, BallotRow[]> | null = null;
  if (status === "closed") {
    const { data: ballotData } = await admin
      .from("election_ballots")
      .select("question_id, option_id, ballot_group, rank")
      .eq("election_id", id)
      .order("rank", { ascending: true });
    ballotsByQuestion = new Map();
    for (const row of (ballotData ?? []) as BallotRow[]) {
      const list = ballotsByQuestion.get(row.question_id) ?? [];
      list.push(row);
      ballotsByQuestion.set(row.question_id, list);
    }
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

        <div className="mt-2 flex flex-wrap items-center gap-2">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {election.title}
          </h1>
          <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[status]}`}>
            {STATUS_LABEL[status]}
          </span>
        </div>
        {election.description && (
          <p className="mt-1 text-sm text-ink-soft">{election.description}</p>
        )}
        <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-xs text-ink-soft">
          <div className="flex gap-1">
            <dt>{status === "closed" ? "Closed:" : "Closes:"}</dt>
            <dd>{formatMelbourne(election.closed_early_at ?? election.closes_at)}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Created by:</dt>
            <dd>{election.creator?.display_name ?? "unknown"}</dd>
          </div>
          <div className="flex gap-1">
            <dt>Turnout:</dt>
            <dd>
              {votedCount} / {voters.length} invited
            </dd>
          </div>
        </dl>

        {status === "open" && (
          <form action={closeElectionEarly.bind(null, election.id)} className="mt-3">
            <SubmitButton className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg">
              Close election now
            </SubmitButton>
          </form>
        )}

        {status !== "closed" && (
          <section className="mt-6">
            <ElectionInviteForm onSubmit={inviteVoters.bind(null, election.id)} />
          </section>
        )}

        <section className="mt-6 flex flex-col gap-4">
          <h2 className="font-display text-base font-semibold tracking-tight">Questions</h2>
          {questions.map((q) => (
            <div key={q.id} className="rounded-lg border border-line bg-surface p-4">
              <h3 className="text-sm font-semibold">{q.title}</h3>
              {q.description && (
                <p className="mt-0.5 text-xs text-ink-soft">{q.description}</p>
              )}
              {status !== "closed" ? (
                <ul className="mt-2 flex flex-col gap-1 text-sm text-ink-soft">
                  {q.options.map((o) => (
                    <li key={o.id}>{o.label}</li>
                  ))}
                </ul>
              ) : (
                <div className="mt-3">
                  <IrvResults
                    options={q.options}
                    result={runInstantRunoff(
                      q.options.map((o) => o.id),
                      groupBallots(ballotsByQuestion?.get(q.id) ?? []),
                      election.tie_break_seed
                    )}
                  />
                </div>
              )}
            </div>
          ))}
        </section>

        <section className="mt-6">
          <h2 className="font-display text-base font-semibold tracking-tight">
            Invited voters
          </h2>
          <ul className="mt-2 flex flex-col gap-1">
            {voters.map((v) => (
              <li
                key={v.email}
                className="flex items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-sm"
              >
                <span className="min-w-0 truncate">{v.email}</span>
                <span
                  className={`flex-none rounded-full px-2 py-0.5 text-xs font-medium ${
                    v.voted_at ? "bg-[#26402f] text-[#8fd6ac]" : "bg-line text-ink-soft"
                  }`}
                >
                  {v.voted_at ? "Voted" : "Invited"}
                </span>
              </li>
            ))}
            {voters.length === 0 && (
              <li className="rounded-md border border-line bg-surface px-3 py-4 text-center text-sm text-ink-soft/70">
                No one invited yet.
              </li>
            )}
          </ul>
        </section>
      </main>
    </>
  );
}

function groupBallots(rows: BallotRow[]): { optionIds: string[] }[] {
  const byGroup = new Map<string, BallotRow[]>();
  for (const row of rows) {
    const list = byGroup.get(row.ballot_group) ?? [];
    list.push(row);
    byGroup.set(row.ballot_group, list);
  }
  return [...byGroup.values()].map((rows) => ({
    optionIds: [...rows].sort((a, b) => a.rank - b.rank).map((r) => r.option_id),
  }));
}
