// Core domain types — keep in sync with the Supabase schema.

export const ROLES = ["member", "exec", "treasurer"] as const;
export type Role = (typeof ROLES)[number];

export const REQUEST_STATUSES = [
  "pending",
  "approved",
  "paid",
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

export interface AllowlistUser {
  id: string;
  discordId: string;
  discordUsername: string;
  displayName: string;
  role: Role;
  isAdmin: boolean;
  createdAt: string;
}

// amount is AUD; receiptPath points into Supabase Storage
export interface ReimbursementRequest {
  id: string;
  submitterId: string;
  title: string;
  description: string;
  amount: number;
  category: Category;
  eventTag: string;
  receiptPath: string;
  status: RequestStatus;
  createdAt: string;
  updatedAt: string;
}

// note is required for rejections; paidAt only set on paid transitions
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
