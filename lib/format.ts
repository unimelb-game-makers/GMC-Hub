import type { BankDetails, Category, RequestStatus } from "@/lib/types";

export function formatAUD(amount: number): string {
  return new Intl.NumberFormat("en-AU", {
    style: "currency",
    currency: "AUD",
  }).format(amount);
}

export function formatBSB(bsb: string): string {
  return `${bsb.slice(0, 3)}-${bsb.slice(3)}`;
}

export function formatBankDetails(bank: BankDetails): string {
  return bank.paymentMethod === "payid"
    ? `PayID ${bank.payid}`
    : `BSB ${formatBSB(bank.bsb!)} · Account ${bank.accountNumber}`;
}

// "food" is stored in the DB (enum value unchanged); F&B is just the label.
export const CATEGORY_LABELS: Record<Category, string> = {
  food: "F&B",
  equipment: "Equipment",
  venue: "Venue",
  printing: "Printing",
  other: "Other",
};

export const STATUS_LABELS: Record<RequestStatus, string> = {
  pending_approval: "Pending approval",
  approved: "Approved to pay",
  claim_submitted: "Claim submitted",
  claim_approved: "Claim approved",
  reimbursed: "Reimbursed",
  rejected: "Rejected",
};

// Kept as its own scale, distinct from the teal/peach brand colors, so
// status meaning never gets tangled up with the app's accent color.
export const STATUS_STYLES: Record<RequestStatus, string> = {
  pending_approval: "bg-[#4a3a22] text-[#f0c98d]",
  approved: "bg-[#2c4650] text-[#a9d3dc]",
  claim_submitted: "bg-[#4a3a22] text-[#f0c98d]",
  claim_approved: "bg-[#3a2c4a] text-[#cbb3e0]",
  reimbursed: "bg-[#26402f] text-[#8fd6ac]",
  rejected: "bg-[#4a2222] text-[#f0a3a3]",
};
