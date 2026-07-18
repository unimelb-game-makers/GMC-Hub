import Link from "next/link";
import type { AppUser } from "@/lib/auth";

export function Nav({ user }: { user: AppUser }) {
  return (
    <header className="border-b border-zinc-200 dark:border-zinc-800">
      <nav className="mx-auto flex max-w-3xl items-center gap-4 px-4 py-3 text-sm">
        <Link href="/" className="font-semibold tracking-tight">
          GMC Reimbursements
        </Link>
        <Link href="/events" className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
          Events
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden text-zinc-500 sm:inline">
            {user.display_name || user.discord_username}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
