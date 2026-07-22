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
