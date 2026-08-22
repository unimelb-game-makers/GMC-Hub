import { notFound } from "next/navigation";
import { requireAppUser, hasRole } from "@/lib/auth";
import { Nav } from "@/components/nav";
import { VoteForm } from "@/components/vote-form";
import { createVote } from "../actions";

export default async function NewVotePage() {
  const user = await requireAppUser();
  if (!hasRole(user, "exec")) notFound();

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          New vote
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Times are entered in Melbourne local time.
        </p>

        <VoteForm onCreate={createVote} />
      </main>
    </>
  );
}
