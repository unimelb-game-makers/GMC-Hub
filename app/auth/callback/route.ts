import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await linkAllowlistRow(data.user);
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

// First sign-in: attach the auth account to the pre-created allowlist row
// matching their Discord ID. No matching row means they stay unlinked and
// hit the access-denied gate.
async function linkAllowlistRow(user: User) {
  const discordId = user.identities?.find((i) => i.provider === "discord")?.id;
  if (!discordId) return;

  const admin = createAdminClient();
  await admin
    .from("app_users")
    .update({
      auth_user_id: user.id,
      discord_username: user.user_metadata?.name ?? "",
    })
    .eq("discord_id", discordId)
    .is("auth_user_id", null);
}
