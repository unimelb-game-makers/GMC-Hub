"use server";

import { revalidatePath } from "next/cache";
import { requireAppUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Attendance is open to any signed-in committee or subcommittee member,
// not just the event's creator or execs, unlike requests/events.
export async function addAttendanceEntry(eventId: string, formData: FormData) {
  const user = await requireAppUser();

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) throw new Error("Name is required");
  const studentNumber = String(formData.get("student_number") ?? "").trim();

  const admin = createAdminClient();
  const { error } = await admin.from("attendance_entries").insert({
    event_id: eventId,
    full_name: fullName,
    student_number: studentNumber || null,
    checked_in_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/attendance");
  revalidatePath("/");
}

export async function removeAttendanceEntry(eventId: string, entryId: string) {
  await requireAppUser();

  const admin = createAdminClient();
  const { error } = await admin
    .from("attendance_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw new Error(error.message);

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/attendance");
  revalidatePath("/");
}
