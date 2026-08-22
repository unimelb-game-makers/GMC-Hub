import Link from "next/link";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { RequestStatus } from "@/lib/types";
import { Nav } from "@/components/nav";
import { HomeEventsTabs, type HomeEventSummary } from "@/components/home-events-tabs";

interface RequestRow {
  event_id: string;
  submitter_id: string;
  status: RequestStatus;
}

interface AttendanceRow {
  event_id: string;
}

interface EventRow {
  id: string;
  title: string;
  is_open: boolean;
  created_at: string;
}

export default async function HubHome() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data }, { data: attendanceData }, { data: eventData }] =
    await Promise.all([
      supabase.from("requests").select("event_id, submitter_id, status"),
      supabase.from("attendance_entries").select("event_id"),
      supabase
        .from("events")
        .select("id, title, is_open, created_at")
        .order("created_at", { ascending: false }),
    ]);
  const requests = (data ?? []) as unknown as RequestRow[];
  const attendance = (attendanceData ?? []) as AttendanceRow[];
  const events = (eventData ?? []) as EventRow[];

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

  const requestCounts = new Map<string, number>();
  for (const r of requests) {
    requestCounts.set(r.event_id, (requestCounts.get(r.event_id) ?? 0) + 1);
  }
  const attendanceCounts = new Map<string, number>();
  for (const a of attendance) {
    attendanceCounts.set(a.event_id, (attendanceCounts.get(a.event_id) ?? 0) + 1);
  }

  const canManageEvents = hasRole(user, "exec") || hasRole(user, "payment_manager");
  const eventSummaries: HomeEventSummary[] = events.map((event) => ({
    id: event.id,
    title: event.title,
    isOpen: event.is_open,
    createdAt: event.created_at,
    requestCount: requestCounts.get(event.id) ?? 0,
    attendanceCount: attendanceCounts.get(event.id) ?? 0,
  }));

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
              {attendance.length}
            </span>
            <span className="text-xs text-ink-soft">
              {attendance.length === 1 ? "person checked in" : "people checked in"}
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

        <section className="mt-8">
          <div className="flex items-center justify-between gap-3">
            <h2 className="font-display text-base font-semibold tracking-tight">
              Events
            </h2>
            <div className="flex items-center gap-3">
              {canManageEvents && (
                <Link
                  href="/events"
                  className="text-xs font-medium text-accent underline-offset-2 hover:underline"
                >
                  New event
                </Link>
              )}
              <Link
                href="/events"
                className="text-xs text-ink-soft underline-offset-2 hover:underline"
              >
                View all
              </Link>
            </div>
          </div>

          {events.length === 0 ? (
            <p className="mt-3 rounded-lg border border-line bg-surface p-4 text-sm text-ink-soft/70">
              No events yet.{" "}
              {canManageEvents && (
                <Link
                  href="/events"
                  className="text-accent underline-offset-2 hover:underline"
                >
                  Create one
                </Link>
              )}
            </p>
          ) : (
            <HomeEventsTabs events={eventSummaries} />
          )}
        </section>
      </main>
    </>
  );
}
