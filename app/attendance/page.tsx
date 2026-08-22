import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import {
  AttendanceSearch,
  type AttendanceEventSummary,
  type AttendanceMemberSummary,
} from "@/components/attendance-search";

interface EventRow {
  id: string;
  title: string;
  is_open: boolean;
}

interface MemberRow {
  id: string;
  full_name: string;
  student_number: string | null;
}

interface EntryRow {
  event_id: string;
  member_id: string;
}

export default async function AttendancePage() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data: eventData }, { data: memberData }, { data: entryData }] =
    await Promise.all([
      supabase
        .from("events")
        .select("id, title, is_open")
        .order("created_at", { ascending: false }),
      supabase
        .from("attendance_members")
        .select("id, full_name, student_number")
        .order("full_name", { ascending: true }),
      supabase.from("attendance_entries").select("event_id, member_id"),
    ]);
  const eventRows = (eventData ?? []) as EventRow[];
  const memberRows = (memberData ?? []) as MemberRow[];
  const entryRows = (entryData ?? []) as EntryRow[];

  const eventCounts = new Map<string, number>();
  const memberEventCounts = new Map<string, number>();
  for (const row of entryRows) {
    eventCounts.set(row.event_id, (eventCounts.get(row.event_id) ?? 0) + 1);
    memberEventCounts.set(
      row.member_id,
      (memberEventCounts.get(row.member_id) ?? 0) + 1
    );
  }

  const events: AttendanceEventSummary[] = eventRows.map((e) => ({
    id: e.id,
    title: e.title,
    isOpen: e.is_open,
    count: eventCounts.get(e.id) ?? 0,
  }));
  const members: AttendanceMemberSummary[] = memberRows.map((m) => ({
    id: m.id,
    fullName: m.full_name,
    studentNumber: m.student_number,
    eventCount: memberEventCounts.get(m.id) ?? 0,
  }));

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Attendance
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Pick an event to check people in, or search across every event at
          once.
        </p>

        <AttendanceSearch events={events} members={members} />
      </main>
    </>
  );
}
