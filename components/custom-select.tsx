"use client";

import { useEffect, useRef, useState } from "react";

// A real <select>'s closed box can be re-skinned with CSS, but its open
// dropdown is always OS-native and can't be themed. This is a fully custom
// listbox instead — no native <select> involved — so both states match the
// site's palette. A hidden input carries the value so it still posts with
// the form like any other field.
export function CustomSelect({
  name,
  options,
  defaultValue,
  required = false,
  className = "",
}: {
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  required?: boolean;
  className?: string;
}) {
  const [value, setValue] = useState(defaultValue ?? options[0]?.value ?? "");
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: PointerEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  function openList() {
    setActiveIndex(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  }

  function selectOption(optionValue: string) {
    setValue(optionValue);
    setOpen(false);
  }

  function onTriggerKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown" || e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      openList();
    }
  }

  function onListKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Escape") {
      e.preventDefault();
      setOpen(false);
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setActiveIndex((i) => Math.min(options.length - 1, i + 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActiveIndex((i) => Math.max(0, i - 1));
    } else if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      selectOption(options[activeIndex].value);
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} required={required} />
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => (open ? setOpen(false) : openList())}
        onKeyDown={onTriggerKeyDown}
        className="flex w-full items-center justify-between gap-2 rounded-md border border-line bg-surface px-3 py-2 text-left text-sm font-normal text-ink"
      >
        <span className="truncate">{selected?.label ?? "Select…"}</span>
        <svg
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden
          className={`h-4 w-4 flex-none text-ink-soft transition-transform ${open ? "rotate-180" : ""}`}
        >
          <path
            d="M5 7.5 10 12.5 15 7.5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          tabIndex={-1}
          onKeyDown={onListKeyDown}
          ref={(el) => el?.focus()}
          className="thin-scrollbar absolute z-20 mt-1 max-h-60 w-full overflow-y-auto rounded-md border border-line bg-surface py-1 shadow-lg outline-none"
        >
          {options.map((option, i) => (
            <li
              key={option.value}
              role="option"
              aria-selected={option.value === value}
              onMouseEnter={() => setActiveIndex(i)}
              onMouseDown={(e) => {
                // mousedown (not click) + preventDefault: fires before any
                // focus/blur side effects, so selecting an option can't race
                // with the outside-click-close listener and leave the panel
                // open.
                e.preventDefault();
                e.stopPropagation();
                selectOption(option.value);
              }}
              className={`flex cursor-pointer items-center gap-2 px-3 py-[6.8px] text-sm ${
                i === activeIndex ? "bg-bg" : ""
              } ${option.value === value ? "text-accent" : "text-ink"}`}
            >
              <span className="w-4 flex-none">
                {option.value === value && "✓"}
              </span>
              <span className="truncate">{option.label}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
