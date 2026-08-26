"use client";

import { EVENT_DISCOVERY_SOURCES, type EventDiscoverySource } from "@/lib/types";
import { EVENT_DISCOVERY_SOURCE_LABELS } from "@/lib/format";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

// Asked once per check-in (not once per person, on the roster): the same
// returning attendee can hear about different events through different
// channels, so this is never pre-filled or remembered from a prior visit.
export function FoundViaSelect({
  value,
  onChange,
  otherDetails,
  onOtherDetailsChange,
  disabled = false,
}: {
  value: EventDiscoverySource | "";
  onChange: (value: EventDiscoverySource) => void;
  otherDetails: string;
  onOtherDetailsChange: (value: string) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      Where did you find this event?
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as EventDiscoverySource)}
        disabled={disabled}
        className={`${inputClass} disabled:cursor-not-allowed disabled:opacity-50`}
      >
        <option value="" disabled>
          Select one
        </option>
        {EVENT_DISCOVERY_SOURCES.map((s) => (
          <option key={s} value={s}>
            {EVENT_DISCOVERY_SOURCE_LABELS[s]}
          </option>
        ))}
      </select>
      {value === "other" && (
        <input
          value={otherDetails}
          onChange={(e) => onOtherDetailsChange(e.target.value)}
          placeholder="Please specify"
          disabled={disabled}
          className={`${inputClass} mt-1 disabled:cursor-not-allowed disabled:opacity-50`}
        />
      )}
    </div>
  );
}
