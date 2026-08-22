import type { InputHTMLAttributes } from "react";

// A drop-in <input type="checkbox">: `accent-color` alone only tints the
// checked fill, the unchecked box still renders as the browser/OS default
// (white square), which clashes with a dark theme. This draws both states
// from our own tokens instead.
export function Checkbox({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className="relative inline-flex h-4 w-4 flex-none items-center justify-center">
      <input
        type="checkbox"
        className={`peer h-4 w-4 flex-none appearance-none rounded border border-line bg-bg transition-colors checked:border-accent checked:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
        {...props}
      />
      <svg
        viewBox="0 0 16 16"
        aria-hidden
        className="pointer-events-none absolute h-3 w-3 stroke-accent-ink stroke-[2.5] opacity-0 peer-checked:opacity-100"
        fill="none"
      >
        <path d="M3.5 8.5 6.5 11.5 12.5 4.5" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </span>
  );
}
