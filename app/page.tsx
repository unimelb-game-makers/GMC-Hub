import Link from "next/link";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RequestStatus } from "@/lib/types";
import { Nav } from "@/components/nav";

interface RequestRow {
  submitter_id: string;
  status: RequestStatus;
}

export default async function HubHome() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data }, { count: attendanceCount }] = await Promise.all([
    supabase.from("requests").select("submitter_id, status"),
    supabase
      .from("attendance_entries")
      .select("id", { count: "exact", head: true }),
  ]);
  const requests = (data ?? []) as unknown as RequestRow[];

  let needsAction = 0;
  if (hasRole(user, "exec")) {
    needsAction += requests.filter((r) => r.status === "pending_approval").length;
  }
  if (hasRole(user, "payment_manager")) {
    needsAction += requests.filter((r) =>
      ["claim_submitted", "claim_approved"].includes(r.status)
    ).length;
  }
  needsAction += requests.filter(
    (r) =>
      r.submitter_id === user.id && ["approved", "rejected"].includes(r.status)
  ).length;

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          GMC Hub
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          All GMC committee essentials.
        </p>

        <div className="mt-6 grid gap-4 sm:grid-cols-3">
          <Link
            href="/reimbursements"
            className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/40"
          >
            <span className="font-display text-sm font-semibold tracking-tight">
              Reimbursements
            </span>
            <p className="text-sm text-ink-soft">
              Spend requests, claims, and payouts.
            </p>
            <span className="mt-auto text-2xl font-semibold text-accent">
              {needsAction}
            </span>
            <span className="text-xs text-ink-soft">
              {needsAction === 1 ? "item needs your action" : "items need your action"}
            </span>
          </Link>

          <Link
            href="/attendance"
            className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 transition-colors hover:border-accent/40"
          >
            <span className="font-display text-sm font-semibold tracking-tight">
              Attendance
            </span>
            <p className="text-sm text-ink-soft">
              Check members in at events and export the list for UMSU.
            </p>
            <span className="mt-auto text-2xl font-semibold text-accent">
              {attendanceCount ?? 0}
            </span>
            <span className="text-xs text-ink-soft">
              {attendanceCount === 1 ? "person checked in" : "people checked in"}
            </span>
          </Link>

          <div className="flex flex-col gap-2 rounded-xl border border-line bg-surface p-4 opacity-60">
            <span className="font-display text-sm font-semibold tracking-tight">
              Voting Booth
            </span>
            <p className="text-sm text-ink-soft">
              Timed motions with role-gated eligibility.
            </p>
            <span className="mt-auto text-xs font-medium uppercase tracking-wide text-ink-soft">
              Coming soon
            </span>
          </div>
        </div>
      </main>
    </>
  );
}
