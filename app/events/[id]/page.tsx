import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";
import { EventHeader } from "@/components/event-header";
import { EventDetailTabs } from "@/components/event-detail-tabs";
import {
  AttendanceList,
  type AttendanceEntryRow,
  type AttendanceMemberOption,
} from "@/components/attendance-list";
import { formatAUD, CATEGORY_LABELS } from "@/lib/format";
import { REQUEST_STATUSES, type Category, type EventType, type RequestStatus } from "@/lib/types";
import { setEventOpen, updateEvent, deleteEvent } from "../actions";
import {
  checkInMember,
  addNewMemberAndCheckIn,
  removeAttendanceEntry,
} from "@/app/attendance/actions";

interface EventDetail {
  id: string;
  title: string;
  description: string;
  is_open: boolean;
  created_at: string;
  closed_at: string | null;
  starts_at: string | null;
  venue: string | null;
  event_types: EventType[];
  event_type_other_details: string | null;
  creator: { display_name: string } | null;
}

interface RequestRow {
  id: string;
  title: string;
  category: Category;
  amount_estimated: number;
  amount_claimed: number | null;
  status: RequestStatus;
  created_at: string;
  submitter: { display_name: string } | null;
}

interface AttendanceRow {
  id: string;
  member_id: string;
  created_at: string;
  member: {
    full_name: string;
    student_number: string | null;
    course: string | null;
    is_club_member: boolean;
  } | null;
  checked_in_by_user: { display_name: string } | null;
}

interface MemberRow {
  id: string;
  full_name: string;
  student_number: string | null;
  course: string | null;
  is_club_member: boolean;
}

const cardClass = "rounded-lg border border-line bg-surface p-4";
const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function EventDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const { id } = await params;
  const { tab } = await searchParams;
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data }, { data: requestData }, { data: attendanceData }, { data: memberData }] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, title, description, is_open, created_at, closed_at, starts_at, venue, event_types, event_type_other_details, creator:app_users!events_created_by_fkey (display_name)"
        )
        .eq("id", id)
        .maybeSingle(),
      supabase
        .from("requests")
        .select(
          "id, title, category, amount_estimated, amount_claimed, status, created_at, submitter:app_users!requests_submitter_id_fkey (display_name)"
        )
        .eq("event_id", id)
        .order("created_at", { ascending: true }),
      supabase
        .from("attendance_entries")
        .select(
          "id, member_id, created_at, member:attendance_members!attendance_entries_member_id_fkey (full_name, student_number, course, is_club_member), checked_in_by_user:app_users!attendance_entries_checked_in_by_fkey (display_name)"
        )
        .eq("event_id", id)
        .order("created_at", { ascending: false }),
      // Full roster, for the check-in search box (search-and-select instead
      // of re-entering a returning student's details).
      supabase
        .from("attendance_members")
        .select("id, full_name, student_number, course, is_club_member")
        .order("full_name", { ascending: true }),
    ]);
  if (!data) notFound();
  const event = data as unknown as EventDetail;
  const requests = (requestData ?? []) as unknown as RequestRow[];
  const attendance = (attendanceData ?? []) as unknown as AttendanceRow[];
  const attendanceEntries: AttendanceEntryRow[] = attendance.map((a) => ({
    id: a.id,
    memberId: a.member_id,
    fullName: a.member?.full_name ?? "unknown",
    studentNumber: a.member?.student_number ?? null,
    course: a.member?.course ?? null,
    isClubMember: a.member?.is_club_member ?? false,
    createdAt: a.created_at,
    checkedInByName: a.checked_in_by_user?.display_name ?? "unknown",
  }));
  const members: AttendanceMemberOption[] = (
    (memberData ?? []) as MemberRow[]
  ).map((m) => ({
    id: m.id,
    fullName: m.full_name,
    course: m.course,
    isClubMember: m.is_club_member,
    studentNumber: m.student_number,
  }));

  const canManage = hasRole(user, "exec") || hasRole(user, "payment_manager");
  const counts: Partial<Record<RequestStatus, number>> = {};
  let totalEstimated = 0;
  let totalReimbursed = 0;
  for (const r of requests) {
    counts[r.status] = (counts[r.status] ?? 0) + 1;
    totalEstimated += r.amount_estimated;
    if (r.status === "reimbursed") totalReimbursed += r.amount_claimed ?? 0;
  }

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <Link
          href="/events"
          className="text-sm text-ink-soft underline-offset-2 hover:underline"
        >
          ← Events
        </Link>

        <EventHeader
          event={{
            id: event.id,
            title: event.title,
            description: event.description,
            is_open: event.is_open,
            created_at: event.created_at,
            closed_at: event.closed_at,
            startsAt: event.starts_at,
            venue: event.venue,
            eventTypes: event.event_types,
            eventTypeOtherDetails: event.event_type_other_details,
            creatorName: event.creator?.display_name ?? "unknown",
          }}
          canManage={canManage}
          deleteBlocked={requests.length > 0 || attendanceEntries.length > 0}
          onToggleOpen={setEventOpen.bind(null, event.id, !event.is_open)}
          onUpdate={updateEvent.bind(null, event.id)}
          onDelete={deleteEvent.bind(null, event.id)}
        />

        <EventDetailTabs
          defaultTab={tab === "attendance" ? "attendance" : "requests"}
          requestsLabel={`Requests (${requests.length})`}
          attendanceLabel={`Attendance (${attendanceEntries.length})`}
          requests={
            <>
              <dl className={`mt-4 flex flex-wrap gap-8 text-sm ${cardClass}`}>
                <div>
                  <dt className="text-ink-soft">Requests</dt>
                  <dd className="font-mono font-medium">{requests.length}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Estimated total</dt>
                  <dd className="font-mono font-medium">{formatAUD(totalEstimated)}</dd>
                </div>
                <div>
                  <dt className="text-ink-soft">Reimbursed total</dt>
                  <dd className="font-mono font-medium">{formatAUD(totalReimbursed)}</dd>
                </div>
              </dl>

              {Object.keys(counts).length > 0 && (
                <div className="mt-3 flex flex-wrap gap-2">
                  {REQUEST_STATUSES.filter((s) => counts[s]).map((s) => (
                    <span
                      key={s}
                      className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-2.5 py-1 text-xs"
                    >
                      <StatusBadge status={s} />
                      <span className="text-ink-soft">{counts[s]}</span>
                    </span>
                  ))}
                </div>
              )}

              <section className="mt-6">
                <h2 className="text-sm font-medium text-ink-soft">
                  Activity history
                </h2>
                <ul className="mt-2 flex flex-col gap-2">
                  {requests.map((r) => (
                    <li key={r.id}>
                      <Link
                        href={`/requests/${r.id}`}
                        className={`flex flex-wrap items-center justify-between gap-2 text-sm transition-colors hover:bg-bg ${cardClass}`}
                      >
                        <span className="min-w-0">
                          <span className="font-medium">{r.title}</span>{" "}
                          <span className="text-ink-soft">
                            {r.submitter?.display_name} ·{" "}
                            {CATEGORY_LABELS[r.category]} ·{" "}
                            {dateFormatter.format(new Date(r.created_at))}
                          </span>
                        </span>
                        <span className="flex flex-none items-center gap-2">
                          <span className="font-mono text-xs text-ink-soft">
                            {formatAUD(r.amount_claimed ?? r.amount_estimated)}
                          </span>
                          <StatusBadge status={r.status} />
                        </span>
                      </Link>
                    </li>
                  ))}
                  {requests.length === 0 && (
                    <li className="py-6 text-center text-sm text-ink-soft/70">
                      No requests under this event yet.
                    </li>
                  )}
                </ul>
              </section>
            </>
          }
          attendance={
            <AttendanceList
              entries={attendanceEntries}
              members={members}
              onCheckInExisting={checkInMember.bind(null, event.id)}
              onAddNew={addNewMemberAndCheckIn.bind(null, event.id)}
              onRemove={removeAttendanceEntry.bind(null, event.id)}
              exportHref={`/events/${event.id}/attendance/export`}
              canExport={!!event.starts_at && !!event.venue && event.event_types.length > 0}
            />
          }
        />
      </main>
    </>
  );
}
