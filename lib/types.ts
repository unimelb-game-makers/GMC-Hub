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
  "venue",
  "printing",
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

// EFT payout details (AU bank transfer only). Saved per user for prefill
// and snapshotted per request; deleted once reimbursed, and the saved copy
// is deleted when a role sync finds the user holds no committee role.
export interface BankDetails {
  bsb: string;
  accountNumber: string;
}

export interface Event {
  id: string;
  title: string;
  description: string;
  createdBy: string;
  isOpen: boolean;
  createdAt: string;
}

// Amounts are AUD. amountClaimed and receiptPath are set at claim stage;
// receiptPath points into Supabase Storage.
export interface ReimbursementRequest {
  id: string;
  eventId: string;
  submitterId: string;
  title: string;
  description: string;
  amountEstimated: number;
  amountClaimed: number | null;
  category: Category;
  receiptPath: string | null;
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
