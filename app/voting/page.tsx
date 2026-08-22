import Link from "next/link";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { Nav } from "@/components/nav";
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
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Melbourne",
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

const STATUS_LABEL: Record<string, string> = {
  upcoming: "Upcoming",
  open: "Open",
  closed: "Closed",
};
const STATUS_STYLE: Record<string, string> = {
  upcoming: "bg-[#4a3a22] text-[#f0c98d]",
  open: "bg-[#26402f] text-[#8fd6ac]",
  closed: "bg-line text-ink-soft",
};

export default async function VotingPage() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data: voteData }, { data: ballotData }] = await Promise.all([
    supabase
      .from("votes")
      .select("id, title, allowed_roles, opens_at, closes_at, closed_early_at, created_at")
      .order("created_at", { ascending: false }),
    // Ballot counts need every voter's rows, not just the signed-in user's
    // own (RLS on vote_ballots only exposes your own row), so this reads
    // through the service role purely to compute an aggregate count.
    createAdminClient().from("vote_ballots").select("vote_id"),
  ]);
  const votes = (voteData ?? []) as VoteRow[];
  const ballots = (ballotData ?? []) as BallotRow[];

  const ballotCounts = new Map<string, number>();
  for (const b of ballots) {
    ballotCounts.set(b.vote_id, (ballotCounts.get(b.vote_id) ?? 0) + 1);
  }

  const withStatus = votes.map((v) => ({
    ...v,
    status: voteStatus({
      opensAt: v.opens_at,
      closesAt: v.closes_at,
      closedEarlyAt: v.closed_early_at,
    }),
  }));
  const active = withStatus.filter((v) => v.status !== "closed");
  const closed = withStatus.filter((v) => v.status === "closed");
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
              New vote
            </Link>
          )}
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-ink-soft">
            Open &amp; upcoming
          </h2>
          <ul className="mt-2 flex flex-col gap-2">
            {active.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/voting/${v.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/40"
                >
                  <span className="font-medium">{v.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[v.status]}`}>
                    {STATUS_LABEL[v.status]}
                  </span>
                  <span className="ml-auto text-xs text-ink-soft">
                    {ballotCounts.get(v.id) ?? 0} ballots cast
                  </span>
                  <span className="w-full text-xs text-ink-soft/70">
                    {v.status === "upcoming"
                      ? `Opens ${dateFormatter.format(new Date(v.opens_at!))}`
                      : `Closes ${dateFormatter.format(new Date(v.closed_early_at ?? v.closes_at))}`}
                  </span>
                </Link>
              </li>
            ))}
            {active.length === 0 && (
              <li className="rounded-lg border border-line bg-surface p-4 text-center text-sm text-ink-soft/70">
                Nothing open right now.
              </li>
            )}
          </ul>
        </section>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-ink-soft">Closed</h2>
          <ul className="mt-2 flex flex-col gap-2">
            {closed.map((v) => (
              <li key={v.id}>
                <Link
                  href={`/voting/${v.id}`}
                  className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/40"
                >
                  <span className="font-medium">{v.title}</span>
                  <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${STATUS_STYLE[v.status]}`}>
                    {STATUS_LABEL[v.status]}
                  </span>
                  <span className="ml-auto text-xs text-ink-soft">
                    {ballotCounts.get(v.id) ?? 0} ballots cast
                  </span>
                </Link>
              </li>
            ))}
            {closed.length === 0 && (
              <li className="rounded-lg border border-line bg-surface p-4 text-center text-sm text-ink-soft/70">
                No closed votes yet.
              </li>
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
