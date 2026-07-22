import Link from "next/link";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { EventCard } from "@/components/event-card";
import type { RequestStatus } from "@/lib/types";
import { createEvent, setEventOpen, updateEvent, deleteEvent } from "./actions";

interface EventRow {
  id: string;
  title: string;
  description: string;
  is_open: boolean;
  created_at: string;
  closed_at: string | null;
  creator: { display_name: string } | null;
}

interface RequestStatusRow {
  event_id: string;
  status: RequestStatus;
}

export default async function EventsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const { tab } = await searchParams;
  const activeTab = tab === "previous" ? "previous" : "open";

  const user = await requireAppUser();
  const supabase = await createClient();
  const { data } = await supabase
    .from("events")
    .select(
      "id, title, description, is_open, created_at, closed_at, creator:app_users!events_created_by_fkey (display_name)"
    )
    .order("created_at", { ascending: false });
  const events = (data ?? []) as unknown as EventRow[];

  const { data: statusData } = await supabase
    .from("requests")
    .select("event_id, status");
  const statusRows = (statusData ?? []) as RequestStatusRow[];
  const statusCounts = new Map<string, Partial<Record<RequestStatus, number>>>();
  for (const row of statusRows) {
    const counts = statusCounts.get(row.event_id) ?? {};
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    statusCounts.set(row.event_id, counts);
  }

  const canManage = hasRole(user, "exec") || hasRole(user, "payment_manager");
  const openEvents = events.filter((e) => e.is_open);
  const previousEvents = events.filter((e) => !e.is_open);
  const shown = activeTab === "open" ? openEvents : previousEvents;

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

        {canManage && (
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

        <div className="mt-6 flex gap-1 border-b border-line text-sm font-medium">
          <Link
            href="/events?tab=open"
            className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
              activeTab === "open"
                ? "border-accent text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            Open ({openEvents.length})
          </Link>
          <Link
            href="/events?tab=previous"
            className={`-mb-px border-b-2 px-3 py-2 transition-colors ${
              activeTab === "previous"
                ? "border-accent text-ink"
                : "border-transparent text-ink-soft hover:text-ink"
            }`}
          >
            Previous ({previousEvents.length})
          </Link>
        </div>

        <ul className="mt-4 flex flex-col gap-3">
          {shown.map((event) => (
            <EventCard
              key={event.id}
              event={{
                id: event.id,
                title: event.title,
                description: event.description,
                is_open: event.is_open,
                created_at: event.created_at,
                closed_at: event.closed_at,
                creatorName: event.creator?.display_name ?? "unknown",
              }}
              counts={statusCounts.get(event.id) ?? {}}
              canManage={canManage}
              onToggleOpen={setEventOpen.bind(null, event.id, !event.is_open)}
              onUpdate={updateEvent.bind(null, event.id)}
              onDelete={deleteEvent.bind(null, event.id)}
            />
          ))}
          {shown.length === 0 && (
            <li className="py-8 text-center text-sm text-ink-soft/70">
              {activeTab === "open"
                ? canManage
                  ? "No open events. Create one above."
                  : "No open events. An exec or payment manager needs to create one first."
                : "No previous events yet."}
            </li>
          )}
        </ul>
      </main>
    </>
  );
}
