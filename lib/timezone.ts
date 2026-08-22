// Voting windows are compared against the real current instant (unlike an
// event's start time, which is just typed-in, read-back-verbatim text), so
// this needs a real local-time <-> UTC conversion for the club's timezone,
// handling Melbourne's AEST/AEDT daylight-saving switch correctly.
const CLUB_TIMEZONE = "Australia/Melbourne";

function offsetMinutesAt(utcMs: number): number {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: CLUB_TIMEZONE,
    timeZoneName: "longOffset",
  }).formatToParts(new Date(utcMs));
  const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? "GMT+10:00";
  const match = tzName.match(/GMT([+-])(\d{2}):(\d{2})/);
  if (!match) return 600;
  const sign = match[1] === "-" ? -1 : 1;
  return sign * (parseInt(match[2], 10) * 60 + parseInt(match[3], 10));
}

// Converts a "YYYY-MM-DDTHH:mm" wall-clock string, meant as Melbourne local
// time, into the real UTC instant it refers to.
export function melbourneToUtc(wallClock: string): Date {
  const naiveMs = new Date(`${wallClock}:00Z`).getTime();
  const offsetMin = offsetMinutesAt(naiveMs);
  return new Date(naiveMs - offsetMin * 60000);
}

// The reverse direction is a normal, well-supported Intl operation.
export function formatMelbourne(iso: string): string {
  return new Intl.DateTimeFormat("en-AU", {
    timeZone: CLUB_TIMEZONE,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}
