import Link from "next/link";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatAUD } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";
import { Nav } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";

interface RequestListRow {
  id: string;
  submitter_id: string;
  title: string;
  amount_estimated: number;
  amount_claimed: number | null;
  status: RequestStatus;
  created_at: string;
  event: { title: string } | null;
  submitter: { display_name: string } | null;
}

function RequestList({ requests }: { requests: RequestListRow[] }) {
  return (
    <ul className="mt-2 flex flex-col gap-2">
      {requests.map((r) => (
        <li key={r.id}>
          <Link
            href={`/requests/${r.id}`}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 rounded-lg border border-zinc-200 p-3 text-sm hover:bg-zinc-50 dark:border-zinc-800 dark:hover:bg-zinc-900"
          >
            <span className="font-medium">{r.title}</span>
            <StatusBadge status={r.status} />
            <span className="ml-auto text-zinc-500">
              {formatAUD(r.amount_claimed ?? r.amount_estimated)}
            </span>
            <span className="w-full text-xs text-zinc-400">
              {r.submitter?.display_name} · {r.event?.title}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

export default async function Home() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("requests")
    .select(
      "id, submitter_id, title, amount_estimated, amount_claimed, status, created_at, event:events (title), submitter:app_users!requests_submitter_id_fkey (display_name)"
    )
    .order("created_at", { ascending: false });
  const requests = (data ?? []) as unknown as RequestListRow[];

  const needsAction: RequestListRow[] = [];
  if (hasRole(user, "exec")) {
    needsAction.push(
      ...requests.filter((r) =>
        ["pending_approval", "claim_submitted"].includes(r.status)
      )
    );
  }
  if (hasRole(user, "payment_manager")) {
    needsAction.push(...requests.filter((r) => r.status === "claim_approved"));
  }
  needsAction.push(
    ...requests.filter(
      (r) =>
        r.submitter_id === user.id &&
        ["approved", "rejected"].includes(r.status) &&
        !needsAction.includes(r)
    )
  );

  const mine = requests.filter((r) => r.submitter_id === user.id);

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-xl font-semibold tracking-tight">Dashboard</h1>
          <Link
            href="/requests/new"
            className="rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            New spend request
          </Link>
        </div>

        <section className="mt-6">
          <h2 className="text-sm font-medium text-zinc-500">
            Needs your action
          </h2>
          {needsAction.length > 0 ? (
            <RequestList requests={needsAction} />
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              Nothing needs your action right now. 🎉
            </p>
          )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-500">Your requests</h2>
          {mine.length > 0 ? (
            <RequestList requests={mine} />
          ) : (
            <p className="mt-2 text-sm text-zinc-400">
              You haven&apos;t made any requests yet.
            </p>
          )}
        </section>

        {(hasRole(user, "exec") || hasRole(user, "payment_manager")) && (
          <section className="mt-8">
            <h2 className="text-sm font-medium text-zinc-500">All requests</h2>
            {requests.length > 0 ? (
              <RequestList requests={requests} />
            ) : (
              <p className="mt-2 text-sm text-zinc-400">No requests yet.</p>
            )}
          </section>
        )}
      </main>
    </>
  );
}
