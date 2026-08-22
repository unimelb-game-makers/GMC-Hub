import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { DEV_BYPASS_AUTH, DEV_BYPASS_DISCORD_ID } from "@/lib/auth";

// Local-dev-only: signs in as a real Supabase Auth user (so RLS and every
// downstream check behave exactly like a real session) without touching
// Discord. Gated on DEV_BYPASS_AUTH, which is never set outside local dev.
const DEV_EMAIL = "dev-bypass@gmc.local";
const DEV_PASSWORD = "dev-bypass-not-a-real-secret";

export async function GET(request: Request) {
  // Defense in depth: even if DEV_BYPASS_AUTH were ever set by mistake in a
  // deployed environment, never grant this on Vercel's production env.
  if (!DEV_BYPASS_AUTH || process.env.VERCEL_ENV === "production") {
    return new NextResponse("Not found", { status: 404 });
  }

  const supabase = await createClient();
  let { data, error } = await supabase.auth.signInWithPassword({
    email: DEV_EMAIL,
    password: DEV_PASSWORD,
  });

  if (error) {
    const admin = createAdminClient();
    await admin.auth.admin.createUser({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
      email_confirm: true,
    });
    ({ data, error } = await supabase.auth.signInWithPassword({
      email: DEV_EMAIL,
      password: DEV_PASSWORD,
    }));
  }
  if (error || !data.user) {
    return NextResponse.redirect(new URL("/login?error=auth", request.url));
  }

  // Every role, so all permission-gated flows are testable from one account.
  await createAdminClient()
    .from("app_users")
    .upsert(
      {
        discord_id: DEV_BYPASS_DISCORD_ID,
        auth_user_id: data.user.id,
        discord_username: "dev",
        display_name: "Dev Tester",
        roles: ["member", "exec", "payment_manager"],
        roles_synced_at: new Date().toISOString(),
      },
      { onConflict: "discord_id" }
    );

  return NextResponse.redirect(new URL("/", request.url));
}
