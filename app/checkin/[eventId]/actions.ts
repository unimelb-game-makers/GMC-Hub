"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStudentNumberRequired, parseCourse, normalizeName } from "@/lib/attendance-validation";

// No requireAppUser() anywhere in this file: this is the public, no-sign-in
// self-check-in flow reached by scanning an event's QR code. To keep the
// full student roster private (staff-side check-in shows it for
// search-and-select, but that's only ever loaded for a signed-in
// committee/subcommittee member), this never lists or searches the roster
// for the client. It only ever reveals a single matched name back to the
// visitor, for the exact ID or name they themselves just typed in, never a
// browsable list.

async function requireOpenEvent(eventId: string) {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("is_open")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) throw new Error("Event not found");
  if (!event.is_open) throw new Error("This event isn't open for check-in");
}

export interface ExistingMatch {
  matched: boolean;
  memberId?: string;
  matchedName?: string;
}

// Read-only: looks for a single existing roster row for what was typed, so
// the form can ask "is this you?" before deciding whether to reuse it or
// create a new one. Matched by student number when given (exact); by name
// only when no number was given, and only if the normalised name is
// unique on the roster, an ambiguous match is treated as no match rather
// than guessing which of several same-named people this is.
export async function checkExistingMatch(
  eventId: string,
  formData: FormData
): Promise<ExistingMatch> {
  await requireOpenEvent(eventId);

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) throw new Error("Name is required");
  const notAStudent = !!formData.get("not_a_student");
  const studentNumber = parseStudentNumberRequired(formData.get("student_number"), notAStudent);

  const admin = createAdminClient();

  if (studentNumber) {
    const { data } = await admin
      .from("attendance_members")
      .select("id, full_name")
      .eq("student_number", studentNumber)
      .maybeSingle();
    if (data) return { matched: true, memberId: data.id, matchedName: data.full_name };
    return { matched: false };
  }

  const target = normalizeName(fullName);
  const { data } = await admin.from("attendance_members").select("id, full_name");
  const candidates = (data ?? []).filter((m) => normalizeName(m.full_name) === target);
  if (candidates.length === 1) {
    return { matched: true, memberId: candidates[0].id, matchedName: candidates[0].full_name };
  }
  return { matched: false };
}

// Casts the actual check-in. confirmed_member_id, set once the visitor has
// said "yes, that's me" to a checkExistingMatch() result, reuses that exact
// roster row rather than re-running the match. Left unset (a fresh visitor,
// or someone who said "no, that's not me"), this creates a new roster row
// from what was typed, same as before.
export async function publicSelfCheckIn(eventId: string, formData: FormData) {
  await requireOpenEvent(eventId);

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) throw new Error("Name is required");
  const notAStudent = !!formData.get("not_a_student");
  const studentNumber = parseStudentNumberRequired(formData.get("student_number"), notAStudent);
  const course = parseCourse(formData.get("course"));
  const isClubMember = !!formData.get("is_club_member");
  const confirmedMemberId = String(formData.get("confirmed_member_id") ?? "").trim() || null;

  const admin = createAdminClient();
  let memberId: string;

  if (confirmedMemberId) {
    memberId = confirmedMemberId;
  } else {
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
      // A student number that matched no one moments ago in
      // checkExistingMatch() but collides now, someone else claimed it in
      // the meantime (a genuine race), or the visitor was shown a match and
      // insisted "that's not me" while still leaving their real ID in the
      // field. Either way, this ID belongs to an existing row already.
      if (memberError.code === "23505") {
        throw new Error(
          "That student ID is already on the roster under a different name. Double check it."
        );
      }
      throw new Error(memberError.message);
    }
    memberId = member.id;
  }

  // checked_in_by left null: that's what marks this entry as self-submitted
  // rather than entered by a signed-in committee/subcommittee member.
  const { error } = await admin.from("attendance_entries").insert({
    event_id: eventId,
    member_id: memberId,
  });
  if (error) {
    if (error.code === "23505") {
      throw new Error("You're already checked in to this event");
    }
    throw new Error(error.message);
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/attendance");
  revalidatePath("/");
}
