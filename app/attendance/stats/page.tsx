import Link from "next/link";
import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { AttendanceStatsPanel } from "@/components/attendance-stats-panel";
import { computeAttendanceStats, type AttendanceStatsEntry } from "@/lib/attendance-stats";
import { formatEventDate } from "@/lib/format";
import type { EventDiscoverySource } from "@/lib/types";

interface EntryRow {
  event_id: string;
  found_via: EventDiscoverySource | null;
  member: { student_number: string | null; is_club_member: boolean } | null;
}

interface EventRow {
  id: string;
  title: string;
  starts_at: string | null;
  is_open: boolean;
}

export default async function AttendanceStatsPage() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data: entryData }, { data: eventData }] = await Promise.all([
    supabase
      .from("attendance_entries")
      .select(
        "event_id, found_via, member:attendance_members!attendance_entries_member_id_fkey (student_number, is_club_member)"
      ),
    supabase
      .from("events")
      .select("id, title, starts_at, is_open")
      .order("created_at", { ascending: false }),
  ]);
  const entries = (entryData ?? []) as unknown as EntryRow[];
  const events = (eventData ?? []) as EventRow[];

  const statsEntries: AttendanceStatsEntry[] = entries.map((e) => ({
    isClubMember: e.member?.is_club_member ?? false,
    studentNumber: e.member?.student_number ?? null,
    foundVia: e.found_via,
  }));
  const overall = computeAttendanceStats(statsEntries);

  const countsByEvent = new Map<string, number>();
  for (const e of entries) {
    countsByEvent.set(e.event_id, (countsByEvent.get(e.event_id) ?? 0) + 1);
  }
  const eventBreakdown = events
    .map((e) => ({ ...e, count: countsByEvent.get(e.id) ?? 0 }))
    .sort((a, b) => b.count - a.count);

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <Link
          href="/attendance"
          className="text-sm text-ink-soft underline-offset-2 hover:underline"
        >
          ← Attendance
        </Link>
        <h1 className="mt-2 font-display text-xl font-semibold tracking-tight">
          Attendance stats
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Combined across every event.
        </p>

        <div className="mt-6">
          <AttendanceStatsPanel stats={overall} totalLabel="Total check-ins, all events" />
        </div>

        <section className="mt-6 rounded-lg border border-line bg-surface p-4">
          <h2 className="text-sm font-semibold">By event</h2>
          <ul className="mt-3 flex flex-col gap-2">
            {eventBreakdown.map((e) => (
              <li key={e.id}>
                <Link
                  href={`/events/${e.id}?tab=stats`}
                  className="flex items-center justify-between gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-bg"
                >
                  <span className="min-w-0 truncate">
                    <span className="font-medium">{e.title}</span>{" "}
                    {e.starts_at && (
                      <span className="text-ink-soft">{formatEventDate(e.starts_at)}</span>
                    )}
                  </span>
                  <span className="flex-none font-mono text-xs text-ink-soft">{e.count}</span>
                </Link>
              </li>
            ))}
            {eventBreakdown.length === 0 && (
              <li className="py-6 text-center text-sm text-ink-soft/70">No events yet.</li>
            )}
          </ul>
        </section>
      </main>
    </>
  );
}
