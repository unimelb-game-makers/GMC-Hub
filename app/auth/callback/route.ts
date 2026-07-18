import { NextResponse } from "next/server";
import type { User } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { syncDiscordRoles } from "@/lib/auth";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  if (code) {
    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error && data.user) {
      await syncFromDiscord(data.user);
      return NextResponse.redirect(`${origin}/`);
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth`);
}

// Upsert the app user from their Discord guild roles. Users with no mapped
// roles still get a row (empty roles) and hit the access-denied gate.
async function syncFromDiscord(user: User) {
  const discordId = user.identities?.find((i) => i.provider === "discord")?.id;
  if (!discordId) return;
  await syncDiscordRoles(user.id, discordId);
}
