import { ROLES, type BankDetails, type Category, type RequestStatus, type Role } from "@/lib/types";

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
    : `${bank.accountName} · BSB ${formatBSB(bank.bsb!)} · Account ${bank.accountNumber}`;
}

// "food" is stored in the DB (enum value unchanged); F&B is just the label.
export const CATEGORY_LABELS: Record<Category, string> = {
  food: "F&B",
  equipment: "Equipment",
  technical: "Technical",
  venue: "Venue",
  umsu_assets: "UMSU Assets",
  printing: "Printing (UMSU Purchases Other)",
  csm_promotional_material: "C&S Promotional Material",
  other: "Other",
};

export const ROLE_LABELS: Record<Role, string> = {
  member: "Member",
  exec: "Executive",
  payment_manager: "Payment Manager",
};

// Roles are hierarchical (member < exec < payment_manager, matching ROLES
// order), so show the most senior one the user holds.
export function highestRoleLabel(roles: Role[]): string | null {
  for (let i = ROLES.length - 1; i >= 0; i--) {
    if (roles.includes(ROLES[i])) return ROLE_LABELS[ROLES[i]];
  }
  return null;
}

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
