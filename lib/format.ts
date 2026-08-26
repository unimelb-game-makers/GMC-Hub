import {
  ROLES,
  type BankDetails,
  type Category,
  type EventDiscoverySource,
  type EventType,
  type RequestStatus,
  type Role,
} from "@/lib/types";

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

export const EVENT_TYPE_LABELS: Record<EventType, string> = {
  function: "Function",
  camp: "Camp",
  excursion: "Excursion",
  other: "Other",
};

export const EVENT_DISCOVERY_SOURCE_LABELS: Record<EventDiscoverySource, string> = {
  discord: "Discord",
  instagram: "Instagram",
  newsletter: "Newsletter",
  another_club: "Another club",
  umsu_website: "UMSU website",
  friend: "A friend",
  other: "Other",
};

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

// starts_at is stored as a plain "timestamp without time zone" and always
// read back verbatim as wall-clock text ("2026-08-29T17:30:00"), parsed
// here by hand rather than through Date — Date would silently reinterpret
// it in whatever timezone the running process is in (UTC on Vercel),
// which is wrong for a value that's just typed-in, displayed-back text.
function parseEventDateTime(value: string) {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if (!match) return { year: 1970, month: 1, day: 1, hour: 0, minute: 0 };
  const [, y, mo, d, h, mi] = match;
  return { year: +y, month: +mo, day: +d, hour: +h, minute: +mi };
}

// "29th August 2025", matching the ordinal-day style UMSU's own paper
// attendance form uses.
export function formatEventDate(value: string): string {
  const { year, month, day } = parseEventDateTime(value);
  const suffix =
    day % 10 === 1 && day !== 11
      ? "st"
      : day % 10 === 2 && day !== 12
        ? "nd"
        : day % 10 === 3 && day !== 13
          ? "rd"
          : "th";
  return `${day}${suffix} ${MONTH_NAMES[month - 1]} ${year}`;
}

// 24-hour "17:30", matching the paper form.
export function formatEventTime(value: string): string {
  const { hour, minute } = parseEventDateTime(value);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

// Trims a stored "2026-08-29T17:30:00" value down to the
// "2026-08-29T17:30" shape a <input type="datetime-local"> expects.
export function toDatetimeLocalValue(value: string | null): string {
  return value ? value.slice(0, 16) : "";
}

export function formatEventTypes(
  types: EventType[],
  otherDetails: string | null
): string {
  if (types.length === 0) return "";
  return types
    .map((t) =>
      t === "other" && otherDetails
        ? `${EVENT_TYPE_LABELS[t]} (${otherDetails})`
        : EVENT_TYPE_LABELS[t]
    )
    .join("; ");
}

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

// Empty allowedRoles means the vote's creator left it open to anyone.
export function formatEligibleRoles(roles: Role[]): string {
  return roles.length === 0 ? "Anyone signed in" : roles.map((r) => ROLE_LABELS[r]).join(", ");
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
