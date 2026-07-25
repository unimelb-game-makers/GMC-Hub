import Image from "next/image";
import { SignInButton } from "@/components/sign-in-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="relative flex flex-1 flex-col items-center justify-center gap-7 overflow-hidden p-8 text-center">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(60% 50% at 50% 30%, color-mix(in srgb, var(--nav) 30%, transparent), transparent)",
        }}
      />

      <div className="rounded-3xl bg-[#f0ead6] p-3 shadow-lg">
        <Image
          src="/assets/gmc-logo.webp"
          alt="Game Maker's Club"
          width={112}
          height={112}
          className="h-24 w-24 object-contain sm:h-28 sm:w-28"
          priority
        />
      </div>

      <div>
        <h1
          className="font-display text-4xl font-bold uppercase tracking-tight text-accent sm:text-5xl"
          style={{ textShadow: "3px 3px 0 var(--nav)" }}
        >
          Reimbursements
        </h1>
        <p className="mt-3 text-ink-soft">
          Committee access only, sign in with your club Discord account.
        </p>
      </div>

      <SignInButton />

      {error && (
        <p className="text-sm text-[#f0a3a3]">
          Something went wrong signing in. Please try again.
        </p>
      )}
    </main>
  );
}
