"use client";

import { useEffect, useRef, useState } from "react";

const HOURS_12 = Array.from({ length: 12 }, (_, i) => i + 1);
const MINUTES = Array.from({ length: 60 }, (_, i) => i);

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

// value/onChange use 24h "HH:mm"; the columns display 12h for readability.
function parse24h(value: string): { hour24: number; minute: number } | null {
  const match = value.match(/^(\d{2}):(\d{2})$/);
  if (!match) return null;
  return { hour24: +match[1], minute: +match[2] };
}

function to24h(hour12: number, minute: number, isPm: boolean): string {
  const hour24 = isPm
    ? hour12 === 12
      ? 12
      : hour12 + 12
    : hour12 === 12
      ? 0
      : hour12;
  return `${pad(hour24)}:${pad(minute)}`;
}

export function TimePicker({
  name,
  defaultValue = "",
  required = false,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const hourColRef = useRef<HTMLDivElement>(null);
  const minuteColRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  // Scrolls each column to the selected value, or to the current time when
  // nothing's picked yet, so opening an empty picker starts near "now"
  // instead of the top of a 12/60-row list.
  useEffect(() => {
    if (!open) return;
    for (const ref of [hourColRef, minuteColRef]) {
      const target = ref.current?.querySelector('[data-scroll-target="true"]');
      target?.scrollIntoView({ block: "center" });
    }
  }, [open]);

  const now = new Date();
  const nowHour24 = now.getHours();
  const nowHour12 = nowHour24 % 12 === 0 ? 12 : nowHour24 % 12;
  const nowMinute = now.getMinutes();
  const nowIsPm = nowHour24 >= 12;

  const current = parse24h(value);
  const hour12 = current ? (current.hour24 % 12 === 0 ? 12 : current.hour24 % 12) : null;
  const minute = current?.minute ?? null;
  const isPm = current ? current.hour24 >= 12 : null;

  const display = current
    ? `${pad(hour12 ?? 0)}:${pad(minute ?? 0)} ${isPm ? "pm" : "am"}`
    : "--:-- --";

  const setHour = (h: number) => setValue(to24h(h, minute ?? nowMinute, isPm ?? nowIsPm));
  const setMinute = (m: number) => setValue(to24h(hour12 ?? nowHour12, m, isPm ?? nowIsPm));
  const setPeriod = (pm: boolean) => setValue(to24h(hour12 ?? nowHour12, minute ?? nowMinute, pm));

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex items-center justify-between gap-2 rounded-md border border-line bg-bg px-3 py-2 text-left text-sm ${
          current ? "text-ink" : "text-ink-soft/60"
        }`}
      >
        {display}
        <svg viewBox="0 0 16 16" className="h-4 w-4 flex-none fill-current text-ink-soft" aria-hidden>
          <path d="M8 1.5a6.5 6.5 0 1 0 0 13 6.5 6.5 0 0 0 0-13ZM2.5 8a5.5 5.5 0 1 1 11 0 5.5 5.5 0 0 1-11 0Zm6-3a.5.5 0 0 0-1 0v3c0 .13.05.26.15.35l2 2a.5.5 0 0 0 .7-.7L8.5 7.79Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute right-0 z-30 mt-1 flex w-40 gap-1 rounded-lg border border-line bg-surface p-2 shadow-lg">
          {[
            { items: HOURS_12, selected: hour12, nowValue: nowHour12, onSelect: setHour, ref: hourColRef },
            { items: MINUTES, selected: minute, nowValue: nowMinute, onSelect: setMinute, ref: minuteColRef },
          ].map((col, colIndex) => (
            <div
              key={colIndex}
              ref={col.ref}
              className="h-40 flex-1 overflow-y-auto [scrollbar-width:thin] [scrollbar-color:var(--line)_transparent] [&::-webkit-scrollbar]:w-1.5 [&::-webkit-scrollbar-track]:bg-transparent [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-line"
            >
              {col.items.map((n) => {
                const isSelected = col.selected === n;
                const isNow = col.selected === null && n === col.nowValue;
                return (
                  <button
                    key={n}
                    type="button"
                    data-scroll-target={isSelected || isNow ? "true" : undefined}
                    onClick={() => col.onSelect(n)}
                    className={`block w-full rounded-md px-2 py-1 text-center text-sm transition-colors ${
                      isSelected
                        ? "bg-accent text-accent-ink font-medium"
                        : isNow
                          ? "text-ink ring-1 ring-inset ring-accent/50 hover:bg-bg"
                          : "text-ink hover:bg-bg"
                    }`}
                  >
                    {pad(n)}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="flex flex-none flex-col gap-1">
            {[
              { label: "am", pm: false },
              { label: "pm", pm: true },
            ].map((p) => (
              <button
                key={p.label}
                type="button"
                onClick={() => setPeriod(p.pm)}
                className={`rounded-md px-2 py-1 text-sm transition-colors ${
                  (isPm ?? nowIsPm) === p.pm
                    ? isPm === null
                      ? "text-ink ring-1 ring-inset ring-accent/50"
                      : "bg-accent text-accent-ink font-medium"
                    : "text-ink hover:bg-bg"
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
