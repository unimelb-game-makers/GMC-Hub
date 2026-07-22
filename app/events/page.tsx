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
      <main className="mx-auto w-full max-w-5xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          Events
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Spend requests are made under an open event.
        </p>

        {isPaymentManager && (
          <form
            action={createEvent}
            className="mt-4 flex max-w-lg flex-col gap-2 rounded-lg border border-line bg-surface p-4"
          >
            <h2 className="text-sm font-medium">New event</h2>
            <input
              name="title"
              required
              placeholder="Event title"
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm placeholder:text-ink-soft/60"
            />
            <textarea
              name="description"
              rows={2}
              placeholder="Description (optional)"
              className="rounded-md border border-line bg-bg px-3 py-2 text-sm placeholder:text-ink-soft/60"
            />
            <button
              type="submit"
              className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Create event
            </button>
          </form>
        )}

        <ul className="mt-4 flex flex-col gap-3">
          {events.map((event) => (
            <li
              key={event.id}
              className="rounded-lg border border-line bg-surface p-4"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-medium">{event.title}</span>{" "}
                  <span
                    className={`ml-1 inline-block rounded-full px-2 py-0.5 text-xs font-medium ${
                      event.is_open
                        ? "bg-[#26402f] text-[#8fd6ac]"
                        : "bg-line text-ink-soft"
                    }`}
                  >
                    {event.is_open ? "Open" : "Closed"}
                  </span>
                  {event.description && (
                    <p className="mt-1 text-sm text-ink-soft">
                      {event.description}
                    </p>
                  )}
                  <p className="mt-1 text-xs text-ink-soft/70">
                    Created by {event.creator?.display_name ?? "unknown"}
                  </p>
                </div>
                {isPaymentManager && (
                  <form
                    action={setEventOpen.bind(null, event.id, !event.is_open)}
                  >
                    <button
                      type="submit"
                      className="rounded-md border border-line px-3 py-1.5 text-xs font-medium transition-colors hover:bg-bg"
                    >
                      {event.is_open ? "Close" : "Reopen"}
                    </button>
                  </form>
                )}
              </div>
            </li>
          ))}
          {events.length === 0 && (
            <li className="py-8 text-center text-sm text-ink-soft/70">
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
