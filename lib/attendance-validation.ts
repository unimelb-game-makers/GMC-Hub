// Shared by app/attendance/actions.ts (staff-entered check-ins) and
// app/checkin/[eventId]/actions.ts (public self-check-in): both parse the
// same two optional roster fields the same way. Kept out of either "use
// server" actions file since a Server Actions file's exports must all be
// async functions, these plain sync helpers can't live there.

const STUDENT_NUMBER_PATTERN = /^\d{7}$/;

// Null (not a student) is allowed; when given, it must be exactly 7 digits.
export function parseStudentNumber(raw: FormDataEntryValue | null): string | null {
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

export function parseCourse(raw: FormDataEntryValue | null): string | null {
  const value = String(raw ?? "").trim().toUpperCase();
  if (!value) return null;
  if (!COURSE_PATTERN.test(value)) {
    throw new Error("Course must be all caps with a dash, e.g. B-SCI");
  }
  return value;
}

// Stricter than parseStudentNumber, for the two "add a new person to the
// roster" flows (staff quick-add, public self-check-in): rather than a
// blank field silently meaning "not a student", the person entering the
// data has to say so explicitly by ticking "Not a student", so a blank
// field is never ambiguous between "forgot it" and "doesn't have one".
// Editing an already-existing roster row (updateMember) is unaffected,
// that keeps the plain optional parseStudentNumber above.
export function parseStudentNumberRequired(
  raw: FormDataEntryValue | null,
  notAStudent: boolean
): string | null {
  const value = String(raw ?? "").trim();
  if (notAStudent) {
    if (value) {
      throw new Error('Clear the student ID or untick "Not a student", not both');
    }
    return null;
  }
  if (!STUDENT_NUMBER_PATTERN.test(value)) {
    throw new Error('Student ID is required (7 digits), or tick "Not a student"');
  }
  return value;
}

// Used to match a returning attendee by name when they don't have a
// student number handy: case and spacing are the only things people are
// inconsistent about when re-typing their own name, so those are the only
// two things normalised away, nothing fuzzier than that.
export function normalizeName(name: string): string {
  return name.toLowerCase().replace(/\s+/g, "");
}
