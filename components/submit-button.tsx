"use client";

import { useFormStatus } from "react-dom";

// Drop-in replacement for a plain <button type="submit">: disables itself and
// shows a spinner while its enclosing form's server action is pending, so
// actions never look frozen mid-request.
export function SubmitButton({
  children,
  pendingChildren,
  className = "",
}: {
  children: React.ReactNode;
  pendingChildren?: React.ReactNode;
  className?: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      className={`${className} inline-flex items-center gap-2 disabled:cursor-not-allowed disabled:opacity-60`}
    >
      {pending && (
        <svg
          className="h-3.5 w-3.5 flex-none animate-spin"
          viewBox="0 0 24 24"
          fill="none"
          aria-hidden
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
          />
        </svg>
      )}
      {pending ? (pendingChildren ?? children) : children}
    </button>
  );
}
