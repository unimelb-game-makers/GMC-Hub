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
const ROLE_SYNC_TTL_MS = 10 * 60 * 1000;

// Fetch current guild roles for a Discord user and upsert their app row.
// Not in the guild (or bot failure treated as unknown) -> roles cleared.
export async function syncDiscordRoles(authUserId: string, discordId: string) {
  const member = await fetchGuildMember(discordId);
  const admin = createAdminClient();
  await admin.from("app_users").upsert(
    {
      discord_id: discordId,
      auth_user_id: authUserId,
      roles: member ? mapDiscordRoles(member.roleIds) : [],
      roles_synced_at: new Date().toISOString(),
      ...(member && {
        discord_username: member.username,
        display_name: member.displayName || member.username,
      }),
    },
    { onConflict: "discord_id" }
  );
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
