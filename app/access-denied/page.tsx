export default function AccessDeniedPage() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Access denied</h1>
        <p className="mt-2 max-w-md text-zinc-500">
          Your Discord account isn&apos;t on the committee allowlist. If you
          think this is a mistake, ask a committee admin to add you.
        </p>
      </div>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
