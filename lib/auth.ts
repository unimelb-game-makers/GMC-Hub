import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchGuildMember, mapDiscordRoles } from "@/lib/discord";
import type { Role } from "@/lib/types";

export interface AppUser {
  id: string;
  discord_id: string;
  discord_username: string;
  display_name: string;
  roles: Role[];
  roles_synced_at: string;
}

const APP_USER_COLUMNS =
  "id, discord_id, discord_username, display_name, roles, roles_synced_at";

// Re-fetch Discord roles when the cached copy is older than this, so
// committee changes propagate without users signing out and back in.
// 5 min balances freshness against the Discord API round-trip a stale page
// load pays. Truly instant would need the gateway bot to push
// GUILD_MEMBER_UPDATE events, which isn't worth the infra for this club.
const ROLE_SYNC_TTL_MS = 5 * 60 * 1000;

// Local-dev-only sign-in bypass (see app/auth/dev-bypass/route.ts), so
// testing doesn't need real Discord bot/guild credentials. Never set in
// any deployed environment.
export const DEV_BYPASS_AUTH = process.env.DEV_BYPASS_AUTH === "true";
export const DEV_BYPASS_DISCORD_ID = "dev-bypass";

// Fetch current guild roles for a Discord user and upsert their app row.
// Not in the guild (or bot failure treated as unknown) -> roles cleared.
// Users who end up with no roles have their saved bank details deleted:
// people who leave the committee should not keep payout data in the app.
export async function syncDiscordRoles(authUserId: string, discordId: string) {
  const member = await fetchGuildMember(discordId);
  const roles = member ? mapDiscordRoles(member.roleIds) : [];
  const admin = createAdminClient();
  const { data } = await admin
    .from("app_users")
    .upsert(
      {
        discord_id: discordId,
        auth_user_id: authUserId,
        roles,
        roles_synced_at: new Date().toISOString(),
        ...(member && {
          discord_username: member.username,
          display_name: member.displayName || member.username,
        }),
      },
      { onConflict: "discord_id" }
    )
    .select("id")
    .single();

  if (roles.length === 0 && data) {
    await admin.from("bank_details").delete().eq("app_user_id", data.id);
  }
}

// Returns the signed-in user's app row (roles freshly synced if stale),
// or null if signed out. A row with empty roles means access denied.
export async function getAppUser(): Promise<AppUser | null> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("app_users")
    .select(APP_USER_COLUMNS)
    .eq("auth_user_id", user.id)
    .maybeSingle();

  // Dev-only bypass user (see /auth/dev-bypass): has no real Discord
  // account, so it's excluded from the sync below, which would otherwise
  // find no guild member and wipe its roles.
  if (DEV_BYPASS_AUTH && data?.discord_id === DEV_BYPASS_DISCORD_ID) {
    return data;
  }

  const stale =
    !data ||
    Date.now() - new Date(data.roles_synced_at).getTime() > ROLE_SYNC_TTL_MS;
  if (!stale) return data;

  const discordId =
    data?.discord_id ??
    user.identities?.find((i) => i.provider === "discord")?.id;
  if (!discordId) return data;

  await syncDiscordRoles(user.id, discordId);
  const { data: fresh } = await createAdminClient()
    .from("app_users")
    .select(APP_USER_COLUMNS)
    .eq("auth_user_id", user.id)
    .maybeSingle();
  return fresh;
}

export async function requireAppUser(): Promise<AppUser> {
  const appUser = await getAppUser();
  if (!appUser || appUser.roles.length === 0) redirect("/access-denied");
  return appUser;
}

export function hasRole(user: AppUser, role: Role): boolean {
  return user.roles.includes(role);
}
