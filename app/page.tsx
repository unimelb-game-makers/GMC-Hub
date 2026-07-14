import { requireAppUser } from "@/lib/auth";

export default async function Home() {
  const user = await requireAppUser();

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-2xl font-semibold tracking-tight">
        Welcome, {user.display_name || user.discord_username}
      </h1>
      <p className="text-zinc-500">
        Signed in as <span className="font-medium">{user.role}</span>
        {user.is_admin && " · admin"}
      </p>
      <p className="text-sm text-zinc-400">Dashboard coming soon.</p>
      <form action="/auth/signout" method="post">
        <button
          type="submit"
          className="rounded-lg border border-zinc-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          Sign out
        </button>
      </form>
    </main>
  );
}
