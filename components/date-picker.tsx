"use client";

import { useEffect, useRef, useState } from "react";

const WEEKDAYS = ["M", "T", "W", "T", "F", "S", "S"];
const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

function pad(n: number): string {
  return String(n).padStart(2, "0");
}

function toISODate(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseISODate(value: string): { year: number; month: number; day: number } | null {
  const match = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return null;
  return { year: +match[1], month: +match[2] - 1, day: +match[3] };
}

// Number of leading blanks (Monday-first week) before the 1st of the month.
function leadingBlanks(year: number, month: number): number {
  const weekday = new Date(year, month, 1).getDay();
  return (weekday + 6) % 7;
}

function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function DatePicker({
  name,
  defaultValue = "",
  required = false,
}: {
  name: string;
  defaultValue?: string;
  required?: boolean;
}) {
  const initial = parseISODate(defaultValue);
  const today = new Date();
  const [open, setOpen] = useState(false);
  const [value, setValue] = useState(defaultValue);
  const [viewYear, setViewYear] = useState(initial?.year ?? today.getFullYear());
  const [viewMonth, setViewMonth] = useState(initial?.month ?? today.getMonth());
  const containerRef = useRef<HTMLDivElement>(null);

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

  const selected = parseISODate(value);
  const blanks = leadingBlanks(viewYear, viewMonth);
  const totalDays = daysInMonth(viewYear, viewMonth);
  const cells: (number | null)[] = [
    ...Array(blanks).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];

  const goToPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  };
  const goToNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  };

  const display = selected
    ? `${selected.day} ${MONTH_NAMES[selected.month].slice(0, 3)} ${selected.year}`
    : "Select a date";

  return (
    <div ref={containerRef} className="relative">
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-md border border-line bg-bg px-3 py-2 text-left text-sm ${
          selected ? "text-ink" : "text-ink-soft/60"
        }`}
      >
        {display}
        <svg viewBox="0 0 16 16" className="h-4 w-4 flex-none fill-current text-ink-soft" aria-hidden>
          <path d="M4 1.5a.5.5 0 0 1 .5.5v1h7V2a.5.5 0 0 1 1 0v1h1a1.5 1.5 0 0 1 1.5 1.5v9A1.5 1.5 0 0 1 13.5 15h-11A1.5 1.5 0 0 1 1 13.5v-9A1.5 1.5 0 0 1 2.5 3h1V2a.5.5 0 0 1 .5-.5ZM2 6.5v7a.5.5 0 0 0 .5.5h11a.5.5 0 0 0 .5-.5v-7Z" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-30 mt-1 w-64 rounded-lg border border-line bg-surface p-3 shadow-lg">
          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={goToPrevMonth}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-bg hover:text-ink"
              aria-label="Previous month"
            >
              ‹
            </button>
            <span className="text-sm font-medium">
              {MONTH_NAMES[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={goToNextMonth}
              className="flex h-7 w-7 items-center justify-center rounded-md text-ink-soft transition-colors hover:bg-bg hover:text-ink"
              aria-label="Next month"
            >
              ›
            </button>
          </div>

          <div className="mt-2 grid grid-cols-7 gap-1 text-center text-xs text-ink-soft">
            {WEEKDAYS.map((w, i) => (
              <span key={i}>{w}</span>
            ))}
          </div>
          <div className="mt-1 grid grid-cols-7 gap-1">
            {cells.map((day, i) => {
              if (day === null) return <span key={i} />;
              const iso = toISODate(viewYear, viewMonth, day);
              const isSelected = value === iso;
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    setValue(iso);
                    setOpen(false);
                  }}
                  className={`flex h-7 w-7 items-center justify-center rounded-full text-xs transition-colors ${
                    isSelected
                      ? "bg-accent text-accent-ink font-medium"
                      : "text-ink hover:bg-bg"
                  }`}
                >
                  {day}
                </button>
              );
            })}
          </div>

          <div className="mt-2 flex items-center justify-between border-t border-line pt-2 text-xs">
            <button
              type="button"
              onClick={() => setValue("")}
              className="text-ink-soft transition-colors hover:text-ink"
            >
              Clear
            </button>
            <button
              type="button"
              onClick={() => {
                const now = new Date();
                setViewYear(now.getFullYear());
                setViewMonth(now.getMonth());
                setValue(toISODate(now.getFullYear(), now.getMonth(), now.getDate()));
                setOpen(false);
              }}
              className="text-accent transition-colors hover:underline"
            >
              Today
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
