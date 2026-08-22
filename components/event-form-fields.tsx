"use client";

import { useState } from "react";
import { DatePicker } from "@/components/date-picker";
import { TimePicker } from "@/components/time-picker";
import { Checkbox } from "@/components/checkbox";
import { EVENT_TYPES, type EventType } from "@/lib/types";
import { EVENT_TYPE_LABELS } from "@/lib/format";

export function EventFormFields({
  defaultStartsAt = "",
  defaultVenue = "",
  defaultEventTypes = [],
  defaultOtherDetails = "",
  fieldBg = "bg-bg",
}: {
  defaultStartsAt?: string;
  defaultVenue?: string;
  defaultEventTypes?: EventType[];
  defaultOtherDetails?: string;
  fieldBg?: string;
}) {
  const [types, setTypes] = useState<Set<EventType>>(new Set(defaultEventTypes));
  // Controlled, not defaultValue: React only auto-clears *uncontrolled*
  // fields once a form action settles (including a rejection), so an
  // uncontrolled venue/details field would silently wipe itself the moment
  // a sibling field like "select an event type" fails validation.
  const [venue, setVenue] = useState(defaultVenue);
  const [otherDetails, setOtherDetails] = useState(defaultOtherDetails);
  const inputClass = `rounded-md border border-line ${fieldBg} px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60`;
  const [defaultDate = "", defaultTime = ""] = defaultStartsAt.split("T");

  const toggle = (t: EventType) => {
    setTypes((prev) => {
      const next = new Set(prev);
      if (next.has(t)) next.delete(t);
      else next.add(t);
      return next;
    });
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row">
        <div className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Date and time
          <div className="flex gap-2">
            <div className="flex-1">
              <DatePicker name="starts_at_date" defaultValue={defaultDate} required />
            </div>
            <TimePicker name="starts_at_time" defaultValue={defaultTime.slice(0, 5)} required />
          </div>
        </div>
        <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
          Venue
          <input
            name="venue"
            required
            placeholder="e.g. Room 105, 101 Leicester St"
            value={venue}
            onChange={(e) => setVenue(e.target.value)}
            className={`${inputClass} w-full`}
          />
        </label>
      </div>

      <div className="flex flex-col gap-1 text-sm font-medium">
        Event type
        <div className="flex flex-wrap gap-x-4 gap-y-2 text-sm font-normal">
          {EVENT_TYPES.map((t) => (
            <label key={t} className="flex items-center gap-2">
              <Checkbox
                name={`event_type_${t}`}
                checked={types.has(t)}
                onChange={() => toggle(t)}
              />
              {EVENT_TYPE_LABELS[t]}
            </label>
          ))}
        </div>
        {types.has("other") && (
          <input
            name="event_type_other_details"
            required
            placeholder="Details (e.g. AGM)"
            value={otherDetails}
            onChange={(e) => setOtherDetails(e.target.value)}
            className={`${inputClass} mt-1`}
          />
        )}
      </div>
    </>
  );
}
