import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatEventDate, formatEventTime, formatEventTypes } from "@/lib/format";
import type { EventType } from "@/lib/types";

const CLUB_NAME = "Game Makers' Club";

interface EventRow {
  title: string;
  starts_at: string | null;
  venue: string | null;
  event_types: EventType[];
  event_type_other_details: string | null;
}

interface AttendanceRow {
  created_at: string;
  member: {
    full_name: string;
    student_number: string | null;
    course: string | null;
    is_club_member: boolean;
  } | null;
}

// Wraps a field in quotes and escapes any quotes inside it, only when the
// field actually needs it, so plain values stay readable in the raw file.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function csvRow(fields: string[]): string {
  return fields.map(csvField).join(",");
}

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 80) || "event";
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  await requireAppUser();
  const { id } = await params;

  const supabase = await createClient();
  const [{ data: event }, { data }] = await Promise.all([
    supabase
      .from("events")
      .select("title, starts_at, venue, event_types, event_type_other_details")
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("attendance_entries")
      .select(
        "created_at, member:attendance_members!attendance_entries_member_id_fkey (full_name, student_number, course, is_club_member)"
      )
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const eventRow = event as EventRow;
  if (!eventRow.starts_at || !eventRow.venue || eventRow.event_types.length === 0) {
    return NextResponse.json(
      {
        error:
          "This event is missing its date, venue, or event type. Add them (Edit on the event page) before exporting.",
      },
      { status: 400 }
    );
  }
  const entries = (data ?? []) as unknown as AttendanceRow[];

  // Matches the UMSU paper attendance form: club/date/venue/type header
  // block, then a numbered table. Student Number uses 'N/A' for non-
  // students, matching that form's own convention; the Signature column
  // becomes Timestamp (when they were checked in) since there's no
  // handwritten signature in a digital list.
  const lines = [
    "Event Attendance List",
    "University of Melbourne Security 8344 6666",
    csvRow(["Club Name", CLUB_NAME]),
    csvRow([
      "Date",
      formatEventDate(eventRow.starts_at),
      "Time",
      formatEventTime(eventRow.starts_at),
      "Venue",
      eventRow.venue,
    ]),
    csvRow([
      "Event type",
      formatEventTypes(eventRow.event_types, eventRow.event_type_other_details),
    ]),
    "",
    csvRow(["#", "Name", "Student Number", "Course", "Timestamp", "Club Member?"]),
    ...entries.map((e, i) =>
      csvRow([
        String(i + 1),
        e.member?.full_name ?? "unknown",
        e.member?.student_number ?? "N/A",
        e.member?.course ?? "",
        new Date(e.created_at).toLocaleString("en-AU"),
        e.member?.is_club_member ? "Yes" : "No",
      ])
    ),
  ];

  return new NextResponse(lines.join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(eventRow.title)}-attendance.csv"`,
    },
  });
}
