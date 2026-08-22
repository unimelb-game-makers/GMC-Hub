"use server";

import { revalidatePath } from "next/cache";
import { requireAppUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const STUDENT_NUMBER_PATTERN = /^\d{7}$/;

// Null (not a student) is allowed; when given, it must be exactly 7 digits.
function parseStudentNumber(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim();
  if (!value) return null;
  if (!STUDENT_NUMBER_PATTERN.test(value)) {
    throw new Error("Student ID must be exactly 7 digits");
  }
  return value;
}

function revalidateAttendance(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/attendance");
  revalidatePath("/");
}

// Checks in a student already on the roster from a prior event, found via
// the search-and-select box, so their details aren't re-entered.
export async function checkInMember(eventId: string, memberId: string) {
  const user = await requireAppUser();

  const admin = createAdminClient();
  const { error } = await admin.from("attendance_entries").insert({
    event_id: eventId,
    member_id: memberId,
    checked_in_by: user.id,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("Already checked in to this event");
    }
    throw new Error(error.message);
  }

  revalidateAttendance(eventId);
}

// Only reached when the search box found no existing match: adds a new
// student to the roster, then checks them in to this event.
export async function addNewMemberAndCheckIn(
  eventId: string,
  formData: FormData
) {
  const user = await requireAppUser();

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) throw new Error("Name is required");
  const studentNumber = parseStudentNumber(formData.get("student_number"));

  const admin = createAdminClient();
  const { data: member, error: memberError } = await admin
    .from("attendance_members")
    .insert({ full_name: fullName, student_number: studentNumber })
    .select("id")
    .single();
  if (memberError) {
    if (memberError.code === "23505") {
      throw new Error(
        "That student ID is already on the roster. Search for their name instead."
      );
    }
    throw new Error(memberError.message);
  }

  const { error } = await admin.from("attendance_entries").insert({
    event_id: eventId,
    member_id: member.id,
    checked_in_by: user.id,
  });
  if (error) throw new Error(error.message);

  revalidateAttendance(eventId);
}

export async function removeAttendanceEntry(eventId: string, entryId: string) {
  await requireAppUser();

  const admin = createAdminClient();
  const { error } = await admin
    .from("attendance_entries")
    .delete()
    .eq("id", entryId);
  if (error) throw new Error(error.message);

  revalidateAttendance(eventId);
}
