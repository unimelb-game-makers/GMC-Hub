import Link from "next/link";
import { notFound } from "next/navigation";
import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { StudentActions } from "@/components/student-actions";
import { updateMember, deleteMember } from "@/app/attendance/actions";

interface MemberDetail {
  id: string;
  full_name: string;
  student_number: string | null;
  course: string | null;
  is_club_member: boolean;
}

interface EntryRow {
  id: string;
  created_at: string;
  event: { id: string; title: string; is_open: boolean } | null;
}

const dateFormatter = new Intl.DateTimeFormat("en-AU", {
  timeZone: "Australia/Melbourne",
  day: "numeric",
  month: "short",
  year: "numeric",
});

export default async function AttendanceStudentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data }, { data: entryData }] = await Promise.all([
    supabase
      .from("attendance_members")
      .select("id, full_name, student_number, course, is_club_member")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("attendance_entries")
      .select("id, created_at, event:events (id, title, is_open)")
      .eq("member_id", id)
      .order("created_at", { ascending: false }),
  ]);
  if (!data) notFound();
  const member = data as unknown as MemberDetail;
  const entries = (entryData ?? []) as unknown as EntryRow[];

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <Link
          href="/attendance/students"
          className="text-sm text-ink-soft underline-offset-2 hover:underline"
        >
          ← All students
        </Link>

        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {member.full_name}
          </h1>
          {member.student_number && (
            <span className="rounded-full border border-line px-2 py-0.5 font-mono text-xs text-ink-soft">
              {member.student_number}
            </span>
          )}
          {member.course && (
            <span className="rounded-full border border-line px-2 py-0.5 text-xs text-ink-soft">
              {member.course}
            </span>
          )}
          {member.is_club_member && (
            <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent">
              Club member
            </span>
          )}
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {entries.length === 1
            ? "Checked in to 1 event"
            : `Checked in to ${entries.length} events`}
        </p>

        <StudentActions
          member={{
            id: member.id,
            fullName: member.full_name,
            studentNumber: member.student_number,
            course: member.course,
            isClubMember: member.is_club_member,
          }}
          hasHistory={entries.length > 0}
          onUpdate={updateMember.bind(null, member.id)}
          onDelete={deleteMember.bind(null, member.id)}
        />

        <ul className="mt-4 flex flex-col gap-2">
          {entries.map((entry) => (
            <li key={entry.id}>
              <Link
                href={`/events/${entry.event?.id}?tab=attendance`}
                className="flex items-center justify-between gap-3 rounded-lg border border-line bg-surface p-3 text-sm transition-colors hover:border-accent/40"
              >
                <span className="min-w-0 truncate font-medium">
                  {entry.event?.title ?? "unknown event"}
                </span>
                <span className="flex-none text-ink-soft">
                  {dateFormatter.format(new Date(entry.created_at))}
                </span>
              </Link>
            </li>
          ))}
          {entries.length === 0 && (
            <li className="py-8 text-center text-sm text-ink-soft/70">
              No events yet.
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
