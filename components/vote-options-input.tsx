"use client";

import { useState } from "react";

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

export function VoteOptionsInput({
  defaultOptions = ["", ""],
}: {
  defaultOptions?: string[];
}) {
  const [options, setOptions] = useState<string[]>(defaultOptions);

  const update = (i: number, value: string) => {
    setOptions((prev) => prev.map((o, idx) => (idx === i ? value : o)));
  };
  const remove = (i: number) => {
    setOptions((prev) => prev.filter((_, idx) => idx !== i));
  };
  const add = () => setOptions((prev) => [...prev, ""]);

  return (
    <div className="flex flex-col gap-1 text-sm font-medium">
      Options
      <div className="flex flex-col gap-2">
        {options.map((value, i) => (
          <div key={i} className="flex gap-2">
            <input
              name="option"
              required
              placeholder={`Option ${i + 1}`}
              value={value}
              onChange={(e) => update(i, e.target.value)}
              className={`${inputClass} flex-1`}
            />
            {options.length > 2 && (
              <button
                type="button"
                onClick={() => remove(i)}
                aria-label={`Remove option ${i + 1}`}
                className="flex-none rounded-md border border-line px-3 text-sm text-ink-soft transition-colors hover:bg-bg hover:text-ink"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={add}
        className="mt-1 self-start text-xs font-medium text-accent underline-offset-2 hover:underline"
      >
        + Add option
      </button>
    </div>
  );
}
