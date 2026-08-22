import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import {
  AttendanceSearch,
  type AttendanceEventSummary,
  type AttendanceSearchEntry,
} from "@/components/attendance-search";

interface EventRow {
  id: string;
  title: string;
  is_open: boolean;
}

interface EntryRow {
  id: string;
  full_name: string;
  student_number: string | null;
  event_id: string;
  created_at: string;
}

export default async function AttendancePage() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data: eventData }, { data: entryData }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title, is_open")
      .order("created_at", { ascending: false }),
    supabase
      .from("attendance_entries")
      .select("id, full_name, student_number, event_id, created_at")
      .order("created_at", { ascending: false }),
  ]);
  const eventRows = (eventData ?? []) as EventRow[];
  const entryRows = (entryData ?? []) as EntryRow[];

  const eventTitles = new Map(eventRows.map((e) => [e.id, e.title]));
  const counts = new Map<string, number>();
  for (const row of entryRows) {
    counts.set(row.event_id, (counts.get(row.event_id) ?? 0) + 1);
  }

  const events: AttendanceEventSummary[] = eventRows.map((e) => ({
    id: e.id,
    title: e.title,
    isOpen: e.is_open,
    count: counts.get(e.id) ?? 0,
  }));
  const entries: AttendanceSearchEntry[] = entryRows.map((e) => ({
    id: e.id,
    fullName: e.full_name,
    studentNumber: e.student_number,
    eventId: e.event_id,
    eventTitle: eventTitles.get(e.event_id) ?? "unknown event",
    createdAt: e.created_at,
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

        <AttendanceSearch events={events} entries={entries} />
      </main>
    </>
  );
}
