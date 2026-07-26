import Image from "next/image";
import Link from "next/link";
import type { AppUser } from "@/lib/auth";
import { highestRoleLabel } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";

export function Nav({ user }: { user: AppUser }) {
  const roleLabel = highestRoleLabel(user.roles);
  return (
    <header className="p-3 sm:p-4">
      <LiveRefresh />
      <nav className="mx-auto flex max-w-5xl items-center gap-4 rounded-full bg-nav px-3 py-2 text-sm text-nav-ink shadow-sm">
        <Link
          href="/"
          className="flex items-center gap-2 font-display font-semibold tracking-tight"
        >
          <Image
            src="/assets/gmc-logo.webp"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 flex-none rounded-full bg-[#f0ead6] object-contain p-0.5"
            priority
          />
          GMC Reimbursements
        </Link>
        <Link
          href="/events"
          className="text-nav-ink/70 transition-colors hover:text-nav-ink"
        >
          Events
        </Link>
        <div className="ml-auto flex items-center gap-3">
          <span className="hidden items-center gap-2 sm:flex">
            <span className="text-nav-ink/70">
              {user.display_name || user.discord_username}
            </span>
            {roleLabel && (
              <span className="rounded-full bg-nav-ink/15 px-2 py-0.5 text-xs font-medium text-nav-ink/80">
                {roleLabel}
              </span>
            )}
          </span>
          <form action="/auth/signout" method="post">
            <button
              type="submit"
              className="text-nav-ink/70 transition-colors hover:text-nav-ink"
            >
              Sign out
            </button>
          </form>
        </div>
      </nav>
    </header>
  );
}
