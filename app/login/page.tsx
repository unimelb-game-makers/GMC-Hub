import { SignInButton } from "@/components/sign-in-button";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-6 p-8 text-center">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">
          GMC Reimbursement Tracker
        </h1>
        <p className="mt-1 text-zinc-500">Committee access only</p>
      </div>
      <SignInButton />
      {error && (
        <p className="text-sm text-red-600">
          Something went wrong signing in. Please try again.
        </p>
      )}
    </main>
  );
}
