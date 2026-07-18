import type { RequestStatus } from "@/lib/types";

export function formatAUD(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending_approval: "Pending approval",
  approved: "Approved to pay",
  claim_submitted: "Claim submitted",
  claim_approved: "Claim approved",
  reimbursed: "Reimbursed",
  rejected: "Rejected",
};

export const STATUS_STYLES: Record<RequestStatus, string> = {
  pending_approval: "bg-amber-100 text-amber-800",
  approved: "bg-blue-100 text-blue-800",
  claim_submitted: "bg-amber-100 text-amber-800",
  claim_approved: "bg-violet-100 text-violet-800",
  reimbursed: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
};
