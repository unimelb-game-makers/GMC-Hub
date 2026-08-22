// Same look as SubmitButton, but pending is passed in explicitly instead of
// read via useFormStatus — for forms driven by a manual onSubmit handler
// rather than the <form action> mechanism (which resets the DOM directly
// after the action settles, even for controlled fields like checkboxes).
// Also usable as a plain standalone button (via onClick) outside any form.
export function PendingButton({
  pending,
  children,
  pendingChildren,
  className = "",
  type = "submit",
  onClick,
  disabled = false,
}: {
  pending: boolean;
  children: React.ReactNode;
  pendingChildren?: React.ReactNode;
  className?: string;
  type?: "submit" | "button";
  onClick?: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type={type}
      onClick={onClick}
      disabled={pending || disabled}
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
