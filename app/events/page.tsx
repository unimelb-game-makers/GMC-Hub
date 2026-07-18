import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { createEvent, setEventOpen } from "./actions";

interface EventRow {
  id: string;
  title: string;
  description: string;
  is_open: boolean;
  created_at: string;
  creator: { display_name: string } | null;
}

export default async function EventsPage() {
  const user = await requireAppUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(
      "id, title, description, is_open, created_at, creator:app_users!events_created_by_fkey (display_name)"
    )
    .order("created_at", { ascending: false });
  const events = (data ?? []) as unknown as EventRow[];
  const isPaymentManager = hasRole(user, "payment_manager");

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <h1 className="text-xl font-semibold tracking-tight">Events</h1>
        <p className="mt-1 text-sm text-zinc-500">
          Spend requests are made under an open event.
        </p>

        {isPaymentManager && (
          <form
            action={createEvent}
            className="mt-4 flex flex-col gap-2 rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="text-sm font-medium">New event</h2>
            <input
              name="title"
              required
              placeholder="Event title"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <textarea
              name="description"
              rows={2}
              placeholder="Description (optional)"
              className="rounded-md border border-zinc-300 px-3 py-2 text-sm dark:border-zinc-700 dark:bg-zinc-900"
            />
            <button
              type="submit"
              className="self-start rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              Create event
            </button>
          </form>
        )}

        <ul className="mt-4 flex flex-col gap-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-medium">{event.title}</span>{" "}
                  <span
                    className={`ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      event.is_open
                        ? "bg-green-100 text-green-800"
                        : "bg-zinc-200 text-zinc-600"
                    }`}
                  >
                    {event.is_open ? "Open" : "Closed"}
                  </span>
                  {event.description && (
                    <p className="mt-1 text-sm text-zinc-500">
                      {event.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-zinc-400">
                    Created by {event.creator?.display_name ?? "unknown"}
                  </p>
                </div>
                {isPaymentManager && (
                  <form
                    action={setEventOpen.bind(null, event.id, !event.is_open)}
                  >
                    <button
                      type="submit"
                      className="rounded-md border border-zinc-300 px-3 py-1.5 text-xs font-medium hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
                    >
                      {event.is_open ? "Close" : "Reopen"}
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <li className="py-8 text-center text-sm text-zinc-400">
              No events yet.
              {isPaymentManager
                ? " Create one above."
                : " A payment manager needs to create one first."}
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
