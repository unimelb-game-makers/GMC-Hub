import { EVENT_DISCOVERY_SOURCES, type EventDiscoverySource } from "@/lib/types";

export interface AttendanceStatsEntry {
  isClubMember: boolean;
  studentNumber: string | null;
  foundVia: EventDiscoverySource | null;
}

export interface FoundViaBreakdown {
  source: EventDiscoverySource;
  count: number;
  pct: number;
}

export interface AttendanceStats {
  total: number;
  members: number;
  nonMembers: number;
  memberPct: number;
  students: number;
  nonStudents: number;
  studentPct: number;
  // Entries with no found_via at all (only possible for historical rows
  // recorded before that field existed): excluded from the breakdown's
  // percentages, shown separately instead of silently skewing the split.
  unspecifiedFoundVia: number;
  foundVia: FoundViaBreakdown[];
}

export function computeAttendanceStats(entries: AttendanceStatsEntry[]): AttendanceStats {
  const total = entries.length;
  const members = entries.filter((e) => e.isClubMember).length;
  const students = entries.filter((e) => e.studentNumber !== null).length;

  const foundViaCounts = new Map<EventDiscoverySource, number>();
  let unspecifiedFoundVia = 0;
  for (const e of entries) {
    if (e.foundVia) {
      foundViaCounts.set(e.foundVia, (foundViaCounts.get(e.foundVia) ?? 0) + 1);
    } else {
      unspecifiedFoundVia++;
    }
  }
  const knownFoundVia = total - unspecifiedFoundVia;
  const foundVia: FoundViaBreakdown[] = EVENT_DISCOVERY_SOURCES.map((source) => ({
    source,
    count: foundViaCounts.get(source) ?? 0,
    pct: knownFoundVia > 0 ? ((foundViaCounts.get(source) ?? 0) / knownFoundVia) * 100 : 0,
  }))
    .filter((f) => f.count > 0)
    .sort((a, b) => b.count - a.count);

  return {
    total,
    members,
    nonMembers: total - members,
    memberPct: total > 0 ? (members / total) * 100 : 0,
    students,
    nonStudents: total - students,
    studentPct: total > 0 ? (students / total) * 100 : 0,
    unspecifiedFoundVia,
    foundVia,
  };
}
