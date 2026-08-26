import type { AttendanceStats } from "@/lib/attendance-stats";
import { EVENT_DISCOVERY_SOURCE_LABELS } from "@/lib/format";
import { StatBar } from "@/components/stat-bar";

export function AttendanceStatsPanel({
  stats,
  totalLabel = "Total check-ins",
}: {
  stats: AttendanceStats;
  totalLabel?: string;
}) {
  if (stats.total === 0) {
    return <p className="text-sm text-ink-soft">No attendance recorded yet.</p>;
  }

  return (
    <div className="flex flex-col gap-4">
      <dl>
        <dt className="text-xs text-ink-soft">{totalLabel}</dt>
        <dd className="font-mono text-2xl font-semibold">{stats.total}</dd>
      </dl>

      <div className="rounded-lg border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold">Club membership</h3>
        <div className="mt-3 flex flex-col gap-3">
          <StatBar label="Club members" count={stats.members} pct={stats.memberPct} accent />
          <StatBar label="Non-members" count={stats.nonMembers} pct={100 - stats.memberPct} />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold">Student status</h3>
        <div className="mt-3 flex flex-col gap-3">
          <StatBar label="Students" count={stats.students} pct={stats.studentPct} accent />
          <StatBar label="Non-students" count={stats.nonStudents} pct={100 - stats.studentPct} />
        </div>
      </div>

      <div className="rounded-lg border border-line bg-surface p-4">
        <h3 className="text-sm font-semibold">Where they found out</h3>
        {stats.foundVia.length === 0 ? (
          <p className="mt-2 text-xs text-ink-soft">No data recorded yet.</p>
        ) : (
          <div className="mt-3 flex flex-col gap-3">
            {stats.foundVia.map((f) => (
              <StatBar
                key={f.source}
                label={EVENT_DISCOVERY_SOURCE_LABELS[f.source]}
                count={f.count}
                pct={f.pct}
              />
            ))}
          </div>
        )}
        {stats.unspecifiedFoundVia > 0 && (
          <p className="mt-2 text-xs text-ink-soft">
            {stats.unspecifiedFoundVia} check-in{stats.unspecifiedFoundVia === 1 ? "" : "s"} from
            before this was tracked.
          </p>
        )}
      </div>
    </div>
  );
}
