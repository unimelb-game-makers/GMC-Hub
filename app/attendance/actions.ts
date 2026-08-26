"use server";

import { revalidatePath } from "next/cache";
import { requireAppUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  parseStudentNumber,
  parseStudentNumberRequired,
  parseCourse,
  parseFoundVia,
} from "@/lib/attendance-validation";

function revalidateAttendance(eventId: string) {
  revalidatePath(`/events/${eventId}`);
  revalidatePath("/attendance");
  revalidatePath("/");
}

export type AttendanceActionResult = { ok: true } | { ok: false; error: string };

// Checks in a student already on the roster from a prior event, found via
// the search-and-select box, so their details aren't re-entered. Returns a
// result instead of throwing: Next.js redacts a thrown Error's message to a
// generic placeholder once it crosses back to the client in a production
// build (this doesn't show up in `next dev`), so returning it as ordinary
// data is what actually gets the real message in front of the user.
export async function checkInMember(
  eventId: string,
  memberId: string,
  formData: FormData
): Promise<AttendanceActionResult> {
  const user = await requireAppUser();

  let foundVia, foundViaOtherDetails;
  try {
    ({ foundVia, foundViaOtherDetails } = parseFoundVia(
      formData.get("found_via"),
      formData.get("found_via_other_details")
    ));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid input" };
  }

  const admin = createAdminClient();
  const { error } = await admin.from("attendance_entries").insert({
    event_id: eventId,
    member_id: memberId,
    checked_in_by: user.id,
    found_via: foundVia,
    found_via_other_details: foundViaOtherDetails,
  });
  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "Already checked in to this event" };
    }
    return { ok: false, error: error.message };
  }

  revalidateAttendance(eventId);
  return { ok: true };
}

// Only reached when the search box found no existing match: adds a new
// student to the roster, then checks them in to this event.
export async function addNewMemberAndCheckIn(
  eventId: string,
  formData: FormData
): Promise<AttendanceActionResult> {
  const user = await requireAppUser();

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { ok: false, error: "Name is required" };
  let studentNumber, course, foundVia, foundViaOtherDetails;
  try {
    const notAStudent = !!formData.get("not_a_student");
    studentNumber = parseStudentNumberRequired(formData.get("student_number"), notAStudent);
    course = parseCourse(formData.get("course"));
    ({ foundVia, foundViaOtherDetails } = parseFoundVia(
      formData.get("found_via"),
      formData.get("found_via_other_details")
    ));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid input" };
  }
  const isClubMember = !!formData.get("is_club_member");

  const admin = createAdminClient();
  const { data: member, error: memberError } = await admin
    .from("attendance_members")
    .insert({
      full_name: fullName,
      student_number: studentNumber,
      course,
      is_club_member: isClubMember,
    })
    .select("id")
    .single();
  if (memberError) {
    if (memberError.code === "23505") {
      return {
        ok: false,
        error: "That student ID is already on the roster. Search for their name instead.",
      };
    }
    return { ok: false, error: memberError.message };
  }

  const { error } = await admin.from("attendance_entries").insert({
    event_id: eventId,
    member_id: member.id,
    checked_in_by: user.id,
    found_via: foundVia,
    found_via_other_details: foundViaOtherDetails,
  });
  if (error) return { ok: false, error: error.message };

  revalidateAttendance(eventId);
  return { ok: true };
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

export async function updateMember(memberId: string, formData: FormData) {
  await requireAppUser();

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) throw new Error("Name is required");
  const studentNumber = parseStudentNumber(formData.get("student_number"));
  const course = parseCourse(formData.get("course"));
  const isClubMember = !!formData.get("is_club_member");

  const admin = createAdminClient();
  const { error } = await admin
    .from("attendance_members")
    .update({
      full_name: fullName,
      student_number: studentNumber,
      course,
      is_club_member: isClubMember,
    })
    .eq("id", memberId);
  if (error) {
    if (error.code === "23505") {
      throw new Error("That student ID is already used by someone else on the roster.");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/attendance/students/${memberId}`);
  revalidatePath("/attendance");
}

// Only for students added by mistake: refuse to delete once they've been
// checked in anywhere, so an event's attendance history is never silently
// missing a row. Remove their attendance entries first if that's needed.
export async function deleteMember(memberId: string) {
  await requireAppUser();

  const admin = createAdminClient();
  const { count, error: countError } = await admin
    .from("attendance_entries")
    .select("id", { count: "exact", head: true })
    .eq("member_id", memberId);
  if (countError) throw new Error(countError.message);
  if (count && count > 0) {
    throw new Error(
      "Can't delete a student who's been checked in somewhere. Remove their attendance entries first."
    );
  }

  const { error } = await admin.from("attendance_members").delete().eq("id", memberId);
  if (error) throw new Error(error.message);

  revalidatePath("/attendance/students");
  revalidatePath("/attendance");
}
