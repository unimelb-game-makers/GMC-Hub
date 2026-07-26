"use client";

// Only fires if the root layout itself throws (very unlikely here since it
// does no data fetching) — Next.js requires this as a separate file since it
// has to replace <html>/<body> entirely when it triggers.
export default function GlobalError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html lang="en">
      <body className="flex min-h-screen flex-col items-center justify-center gap-6 bg-[#141414] p-8 text-center text-[#f0ead6]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">
            Something went wrong
          </h1>
          <p className="mt-2 max-w-md opacity-70">
            An unexpected error occurred loading the app.
          </p>
        </div>
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-[#e0a458] px-5 py-2.5 font-medium text-[#141414]"
        >
          Try again
        </button>
      </body>
    </html>
  );
}
