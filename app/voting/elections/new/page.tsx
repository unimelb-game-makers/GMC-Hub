import { notFound } from "next/navigation";
import { requireAppUser, hasRole } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { ElectionForm } from "@/components/election-form";
import { createElection } from "../actions";

export default async function NewElectionPage() {
  const user = await requireAppUser();
  if (!hasRole(user, "exec")) notFound();

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          New election
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Open to anyone you invite by email, no committee sign-in needed. Each question is
          counted as its own instant-runoff race once the election closes. Times are entered
          in Melbourne local time.
        </p>

        <ElectionForm onSubmit={createElection} />
      </main>
    </>
  );
}
