import Image from "next/image";
import Link from "next/link";
import type { AppUser } from "@/lib/auth";
import { highestRoleLabel } from "@/lib/format";
import { LiveRefresh } from "@/components/live-refresh";
import { NavLinks } from "@/components/nav-links";

function UserBadge({ user, roleLabel }: { user: AppUser; roleLabel: string | null }) {
  return (
    <span className="flex items-center gap-2">
      <span className="text-nav-ink/70">
        {user.display_name || user.discord_username}
      </span>
      {roleLabel && (
        <span className="rounded-full bg-nav-ink/15 px-2 py-0.5 text-xs font-medium text-nav-ink/80">
          {roleLabel}
        </span>
      )}
    </span>
  );
}

function SignOutButton() {
  return (
    <form action="/auth/signout" method="post">
      <button
        type="submit"
        className="text-nav-ink/70 transition-colors hover:text-nav-ink"
      >
        Sign out
      </button>
    </form>
  );
}

export function Nav({ user }: { user: AppUser }) {
  const roleLabel = highestRoleLabel(user.roles);
  return (
    <header className="p-3 sm:p-4">
      <LiveRefresh />
      <nav className="relative mx-auto max-w-5xl rounded-full bg-nav text-sm text-nav-ink shadow-sm">
        {/* Direct child of nav, so peer-checked below can target the menu
            panel that's also a direct child (Tailwind's peer selector only
            reaches later siblings, not descendants). No JS needed. */}
        <input type="checkbox" id="nav-menu-toggle" className="peer sr-only" />

        <div className="flex items-center gap-4 px-3 py-2">
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
            GMC Hub
          </Link>

          <div className="hidden items-center gap-4 sm:flex">
            <NavLinks />
          </div>

          <div className="ml-auto hidden items-center gap-3 sm:flex">
            <UserBadge user={user} roleLabel={roleLabel} />
            <SignOutButton />
          </div>

          <label
            htmlFor="nav-menu-toggle"
            aria-label="Toggle menu"
            className="ml-auto flex h-8 w-8 flex-none cursor-pointer items-center justify-center rounded-full transition-colors hover:bg-nav-ink/10 sm:hidden"
          >
            <svg viewBox="0 0 20 20" className="h-5 w-5 fill-current" aria-hidden>
              <path d="M3 5.5h14v1.5H3zM3 9.25h14v1.5H3zM3 13h14v1.5H3z" />
            </svg>
          </label>
        </div>

        {/* Grid-rows trick: animates from 0fr to 1fr, a real height reveal
            (slide down/up) rather than a fade, without needing a fixed
            pixel height for content that can vary (long display names). */}
        <div
          className={
            "absolute inset-x-0 top-full z-20 mt-2 grid grid-rows-[0fr] " +
            "transition-[grid-template-rows] duration-200 ease-out " +
            "max-sm:peer-checked:grid-rows-[1fr] sm:hidden"
          }
        >
          <div className="overflow-hidden">
            <div className="flex flex-col gap-1 rounded-2xl bg-nav px-3 py-3 shadow-lg">
              <NavLinks stacked />
              <div className="mt-2 flex items-center justify-between border-t border-nav-ink/15 pt-3">
                <UserBadge user={user} roleLabel={roleLabel} />
                <SignOutButton />
              </div>
            </div>
          </div>
        </div>
      </nav>
    </header>
  );
}
