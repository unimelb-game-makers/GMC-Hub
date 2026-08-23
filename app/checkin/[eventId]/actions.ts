"use server";

import { revalidatePath } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseStudentNumberRequired, parseCourse, normalizeName } from "@/lib/attendance-validation";

// No requireAppUser() anywhere in this file: this is the public, no-sign-in
// self-check-in flow reached by scanning an event's QR code. To keep the
// full student roster private (staff-side check-in shows it for
// search-and-select, but that's only ever loaded for a signed-in
// committee/subcommittee member), this never lists or searches the roster
// for the client. It only ever reveals a single matched record back to the
// visitor, for the exact ID or name they themselves just typed in, never a
// browsable list.
//
// Every action here returns a plain { ok, error } result instead of
// throwing: Next.js redacts a thrown Error's message to a generic "omitted
// in production builds" string once it crosses back to the client in a
// production build (this doesn't show up in `next dev`, only a real build,
// which is what caught it here). Returning the message as ordinary data
// sidesteps that entirely.

interface EventCheck {
  ok: boolean;
  error?: string;
}

async function checkOpenEvent(eventId: string): Promise<EventCheck> {
  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("is_open")
    .eq("id", eventId)
    .maybeSingle();
  if (!event) return { ok: false, error: "Event not found" };
  if (!event.is_open) return { ok: false, error: "This event isn't open for check-in" };
  return { ok: true };
}

export interface MatchedMember {
  memberId: string;
  fullName: string;
  studentNumber: string | null;
  course: string | null;
  isClubMember: boolean;
}

async function findMatch(fullName: string, studentNumber: string | null): Promise<MatchedMember | null> {
  const admin = createAdminClient();
  const columns = "id, full_name, student_number, course, is_club_member";

  if (studentNumber) {
    const { data } = await admin
      .from("attendance_members")
      .select(columns)
      .eq("student_number", studentNumber)
      .maybeSingle();
    return data
      ? {
          memberId: data.id,
          fullName: data.full_name,
          studentNumber: data.student_number,
          course: data.course,
          isClubMember: data.is_club_member,
        }
      : null;
  }

  const target = normalizeName(fullName);
  const { data } = await admin.from("attendance_members").select(columns);
  const candidates = (data ?? []).filter((m) => normalizeName(m.full_name) === target);
  if (candidates.length !== 1) return null;
  const m = candidates[0];
  return {
    memberId: m.id,
    fullName: m.full_name,
    studentNumber: m.student_number,
    course: m.course,
    isClubMember: m.is_club_member,
  };
}

export type CheckMatchResult =
  | { ok: true; matched: true; member: MatchedMember }
  | { ok: true; matched: false }
  | { ok: false; error: string };

// Read-only: looks for a single existing roster row for what was typed, so
// the form can ask "is this you?" (showing the record on file, so the
// question is actually answerable) before deciding whether to reuse it or
// create a new one. Matched by student number when given (exact); by name
// only when no number was given, and only if the normalised name is
// unique on the roster, an ambiguous match is treated as no match rather
// than guessing which of several same-named people this is.
export async function checkExistingMatch(
  eventId: string,
  formData: FormData
): Promise<CheckMatchResult> {
  const eventCheck = await checkOpenEvent(eventId);
  if (!eventCheck.ok) return { ok: false, error: eventCheck.error! };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { ok: false, error: "Name is required" };
  const notAStudent = !!formData.get("not_a_student");
  let studentNumber: string | null;
  try {
    studentNumber = parseStudentNumberRequired(formData.get("student_number"), notAStudent);
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid student ID" };
  }

  const member = await findMatch(fullName, studentNumber);
  return member ? { ok: true, matched: true, member } : { ok: true, matched: false };
}

export type CheckInResult = { ok: true } | { ok: false; error: string };

// Casts the actual check-in. confirmed_member_id, set once the visitor has
// said "yes, that's me" to a checkExistingMatch() result, is re-verified
// here against a fresh match lookup rather than trusted outright, so a
// crafted request can't claim an arbitrary roster id that this visitor
// never actually matched against. Left unset (a fresh visitor, or someone
// who said "no, that's not me"), this creates a new roster row from what
// was typed instead.
export async function publicSelfCheckIn(eventId: string, formData: FormData): Promise<CheckInResult> {
  const eventCheck = await checkOpenEvent(eventId);
  if (!eventCheck.ok) return { ok: false, error: eventCheck.error! };

  const fullName = String(formData.get("full_name") ?? "").trim();
  if (!fullName) return { ok: false, error: "Name is required" };
  const notAStudent = !!formData.get("not_a_student");
  let studentNumber: string | null;
  let course: string | null;
  try {
    studentNumber = parseStudentNumberRequired(formData.get("student_number"), notAStudent);
    course = parseCourse(formData.get("course"));
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Invalid input" };
  }
  const isClubMember = !!formData.get("is_club_member");
  const claimedMemberId = String(formData.get("confirmed_member_id") ?? "").trim() || null;

  const admin = createAdminClient();
  let memberId: string;

  if (claimedMemberId) {
    const verified = await findMatch(fullName, studentNumber);
    if (!verified || verified.memberId !== claimedMemberId) {
      return { ok: false, error: "That match is no longer valid, please try again." };
    }
    memberId = claimedMemberId;
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
        return {
          ok: false,
          error: "That student ID is already on the roster under a different name. Double check it.",
        };
      }
      return { ok: false, error: memberError.message };
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
      return { ok: false, error: "You're already checked in to this event" };
    }
    return { ok: false, error: error.message };
  }

  revalidatePath(`/events/${eventId}`);
  revalidatePath("/attendance");
  revalidatePath("/");
  return { ok: true };
}
