import { NextResponse } from "next/server";
import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

interface AttendanceRow {
  full_name: string;
  student_number: string | null;
  created_at: string;
}

// Wraps a field in quotes and escapes any quotes inside it, only when the
// field actually needs it, so plain values stay readable in the raw file.
function csvField(value: string): string {
  if (/[",\n]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
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
    supabase.from("events").select("title").eq("id", id).maybeSingle(),
    supabase
      .from("attendance_entries")
      .select("full_name, student_number, created_at")
      .eq("event_id", id)
      .order("created_at", { ascending: true }),
  ]);
  if (!event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }
  const entries = (data ?? []) as AttendanceRow[];

  const rows = [
    ["Name", "Student number", "Checked in at"],
    ...entries.map((e) => [
      e.full_name,
      e.student_number ?? "",
      new Date(e.created_at).toLocaleString("en-AU"),
    ]),
  ];
  const csv = rows.map((row) => row.map(csvField).join(",")).join("\n");

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${sanitizeFilename(event.title)}-attendance.csv"`,
    },
  });
}
