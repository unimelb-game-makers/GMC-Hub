import Link from "next/link";
import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import { Nav } from "@/components/nav";
import { createRequest } from "../actions";

export default async function NewRequestPage() {
  const user = await requireAppUser();
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .eq("is_open", true)
    .order("created_at", { ascending: false });

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <h1 className="text-xl font-semibold tracking-tight">
          New spend request
        </h1>
        <p className="mt-1 text-sm text-zinc-500">
          Ask for approval before you spend. Submit your claim with the receipt
          after you&apos;ve paid.
        </p>

        {!events?.length ? (
          <p className="mt-6 rounded-lg border border-zinc-200 p-4 text-sm text-zinc-500 dark:border-zinc-800">
            There are no open events to request under. Ask a payment manager to
            create one on the <Link href="/events" className="underline">events page</Link>.
          </p>
        ) : (
          <form action={createRequest} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Event
              <select
                name="event_id"
                required
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
              >
                {events.map((event) => (
                  <option key={event.id} value={event.id}>
                    {event.title}
                  </option>
                ))}
              </select>
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              What are you buying?
              <input
                name="title"
                required
                placeholder="e.g. Pizza for game jam"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Details
              <textarea
                name="description"
                rows={3}
                placeholder="Anything the execs should know (optional)"
                className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
              />
            </label>
            <div className="flex gap-3">
              <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                Estimated amount (AUD)
                <input
                  name="amount_estimated"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900"
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                Category
                <select
                  name="category"
                  required
                  className="rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal capitalize dark:border-zinc-700 dark:bg-zinc-900"
                >
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <button
              type="submit"
              className="mt-1 self-start rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Submit request
            </button>
          </form>
        )}
      </main>
    </>
  );
}
