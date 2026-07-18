import { STATUS_LABELS, STATUS_STYLES } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";

export function StatusBadge({ status }: { status: RequestStatus }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLES[status]}`}
    >
      {STATUS_LABELS[status]}
    </span>
  );
}
