import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Role } from "@/lib/types";

export interface AppUser {
  id: string;
  discord_id: string;
  discord_username: string;
  display_name: string;
  role: Role;
  is_admin: boolean;
}

const APP_USER_COLUMNS =
  "id, discord_id, discord_username, display_name, role, is_admin";

// Returns the signed-in user's allowlist row, or null if signed out / not allowlisted.
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

  return data;
}

export async function requireAppUser(): Promise<AppUser> {
  const appUser = await getAppUser();
  if (!appUser) redirect("/access-denied");
  return appUser;
}
