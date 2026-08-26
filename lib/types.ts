// Core domain types — keep in sync with the Supabase schema.

export const ROLES = ["member", "exec", "payment_manager"] as const;
export type Role = (typeof ROLES)[number];

export const REQUEST_STATUSES = [
  "pending_approval",
  "approved",
  "claim_submitted",
  "claim_approved",
  "reimbursed",
  "rejected",
] as const;
export type RequestStatus = (typeof REQUEST_STATUSES)[number];

export const CATEGORIES = [
  "food",
  "equipment",
  "technical",
  "venue",
  "umsu_assets",
  "printing",
  "csm_promotional_material",
  "other",
] as const;
export type Category = (typeof CATEGORIES)[number];

// Roles are derived from Discord guild roles and re-synced periodically.
export interface AppUser {
  id: string;
  discordId: string;
  discordUsername: string;
  displayName: string;
  roles: Role[];
  rolesSyncedAt: string;
  createdAt: string;
}

export const PAYMENT_METHODS = ["payid", "bank_transfer"] as const;
export type PaymentMethod = (typeof PAYMENT_METHODS)[number];

// Payout details: PayID, or BSB + account number (AU bank transfer). Saved
// per user for prefill and snapshotted per request; deleted once reimbursed,
// and the saved copy is deleted when a role sync finds the user holds no
// committee role. Exactly one method's fields are set, per the DB check.
export interface BankDetails {
  paymentMethod: PaymentMethod;
  payid: string | null;
  bsb: string | null;
  accountNumber: string | null;
  accountName: string | null;
}

export const EVENT_TYPES = ["function", "camp", "excursion", "other"] as const;
export type EventType = (typeof EVENT_TYPES)[number];

// How an attendee heard about the event, captured per check-in for the
// committee's own outreach tracking.
export const EVENT_DISCOVERY_SOURCES = [
  "discord",
  "instagram",
  "newsletter",
  "another_club",
  "umsu_website",
  "friend",
  "other",
] as const;
export type EventDiscoverySource = (typeof EVENT_DISCOVERY_SOURCES)[number];

// startsAt/venue/eventTypes are required for new events (UMSU attendance
// CSV export needs them) but nullable/empty on events created before this
// existed — those can be edited to backfill them if the committee wants to
// export their attendance too.
export interface Event {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  isOpen: boolean;
  startsAt: string | null;
  venue: string | null;
  eventTypes: EventType[];
  eventTypeOtherDetails: string | null;
  createdAt: string;
}

// Amounts are AUD. amountClaimed and receiptPaths are set at claim stage;
// receiptPaths point into Supabase Storage, max 3 (DB check constraint).
// receiptInDrive is an alternative to receiptPaths: submitter confirms the
// receipt is in the shared Drive folder instead of attaching it,
// receiptPaths stays empty in that case.
export interface ReimbursementRequest {
  id: string;
  eventId: string;
  submitterId: string;
  title: string;
  description: string;
  amountEstimated: number;
  amountClaimed: number | null;
  category: Category;
  receiptPaths: string[];
  receiptInDrive: boolean;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

// note is required for rejections; paidAt only set on reimbursed transitions
export interface StatusHistoryEntry {
  id: string;
  requestId: string;
  actorId: string;
  fromStatus: RequestStatus | null;
  toStatus: RequestStatus;
  note: string | null;
  paidAt: string | null;
  createdAt: string;
}

// A student (or other attendee) recorded once and reused across every
// event they attend. studentNumber is a University of Melbourne student
// number (exactly 7 digits) when the member is a student, null otherwise
// (rendered as 'N/A' on CSV export, matching UMSU's own attendance form).
export interface AttendanceMember {
  id: string;
  fullName: string;
  studentNumber: string | null;
  course: string | null;
  isClubMember: boolean;
  createdAt: string;
}

// One row per member checked in at an event. Any signed-in committee or
// subcommittee member can add or remove entries on any event, not just the
// event's creator. A member can only appear once per event (DB unique
// constraint on event_id + member_id).
export interface AttendanceEntry {
  id: string;
  eventId: string;
  memberId: string;
  checkedInBy: string;
  foundVia: EventDiscoverySource | null;
  foundViaOtherDetails: string | null;
  createdAt: string;
}

// Computed at read time from opens_at/closes_at/closed_early_at, never
// stored: there's no scheduler in this project to flip a stored status.
export type VoteStatus = "upcoming" | "open" | "closed";

// allowedRoles empty means any signed-in member (any role) can vote.
export interface Vote {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  allowedRoles: Role[];
  // Fixed at creation, never edited afterwards.
  allowMultipleChoices: boolean;
  opensAt: string | null;
  closesAt: string;
  closedEarlyAt: string | null;
  // Off by default (secret ballot): whether individual voters' choices are
  // shown once this vote closes. Locked once the first ballot is cast.
  revealVoters: boolean;
  createdAt: string;
}

export interface VoteOption {
  id: string;
  voteId: string;
  label: string;
  displayOrder: number;
}

// One per person per vote (DB unique constraint on vote_id + voter_id).
export interface VoteBallot {
  id: string;
  voteId: string;
  optionId: string;
  voterId: string;
  createdAt: string;
}

// Public elections: open to anyone with an emailed invite link, no Discord
// sign-in. Computed at read time from opens_at/closes_at/closed_early_at,
// same as VoteStatus.
export type ElectionStatus = "upcoming" | "open" | "closed";

export interface Election {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  opensAt: string | null;
  closesAt: string;
  closedEarlyAt: string | null;
  createdAt: string;
}

// A single IRV race within an election, e.g. "President". An election can
// hold several, each counted independently.
export interface ElectionQuestion {
  id: string;
  electionId: string;
  title: string;
  description: string;
  displayOrder: number;
}

export interface ElectionOption {
  id: string;
  questionId: string;
  label: string;
  displayOrder: number;
}

// One row per invited email. voted_at (null until cast) is the only signal
// of participation, never linked to what they voted for, see
// supabase/migrations/0018_elections.sql.
export interface ElectionVoter {
  id: string;
  electionId: string;
  email: string;
  invitedAt: string;
  votedAt: string | null;
}
