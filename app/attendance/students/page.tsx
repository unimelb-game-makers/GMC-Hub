import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { StudentsList, type StudentSummary } from "@/components/students-list";

interface MemberRow {
  id: string;
  full_name: string;
  student_number: string | null;
  course: string | null;
  is_club_member: boolean;
}

interface EntryRow {
  member_id: string;
}

export default async function AttendanceStudentsPage() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data: memberData }, { data: entryData }] = await Promise.all([
    supabase
      .from("attendance_members")
      .select("id, full_name, student_number, course, is_club_member")
      .order("full_name", { ascending: true }),
    supabase.from("attendance_entries").select("member_id"),
  ]);
  const memberRows = (memberData ?? []) as MemberRow[];
  const entryRows = (entryData ?? []) as EntryRow[];

  const eventCounts = new Map<string, number>();
  for (const row of entryRows) {
    eventCounts.set(row.member_id, (eventCounts.get(row.member_id) ?? 0) + 1);
  }

  const students: StudentSummary[] = memberRows.map((m) => ({
    id: m.id,
    fullName: m.full_name,
    studentNumber: m.student_number,
    course: m.course,
    isClubMember: m.is_club_member,
    eventCount: eventCounts.get(m.id) ?? 0,
  }));

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          All students
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          The full roster. Open a student to edit their details or delete
          them.
        </p>

        <StudentsList students={students} />
      </main>
    </>
  );
}
