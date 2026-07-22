export default function AccessDeniedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="font-display text-2xl font-semibold tracking-tight">
          Access denied
        </h1>
        <p className="mt-2 max-w-md text-ink-soft">
          Your Discord account doesn&apos;t have a committee role in the club
          server. If you think this is a mistake, ask a committee member to
          check your Discord roles.
        </p>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-lg border border-line px-5 py-2.5 font-medium transition-colors hover:bg-surface"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
