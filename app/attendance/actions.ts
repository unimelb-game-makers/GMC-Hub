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

// Degree codes, e.g. B-SCI, BH-ARTS, MC-IT, DR-PHILSCI: letters only, all
// caps, at least one dash. Optional field, so empty stays empty.
const COURSE_PATTERN = /^[A-Z]+-[A-Z]+$/;

function parseCourse(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!value) return null;
  if (!COURSE_PATTERN.test(value)) {
    throw new Error("Course must be all caps with a dash, e.g. B-SCI");
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
  const course = parseCourse(formData.get("course"));
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
