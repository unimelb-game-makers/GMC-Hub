"use client";

import { createClient } from "@/lib/supabase/client";

export function SignInButton() {
  const signIn = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "discord",
      options: { redirectTo: `${window.location.origin}/auth/callback` },
    });
  };

  return (
    <button
      onClick={signIn}
      className="rounded-lg bg-[#5865F2] px-6 py-3 font-medium text-white transition-colors hover:bg-[#4752c4]"
    >
      Sign in with Discord
    </button>
  );
}
