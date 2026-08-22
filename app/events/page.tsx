import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Nav } from "@/components/nav";
import { EventsTabs } from "@/components/events-tabs";
import { SubmitButton } from "@/components/submit-button";
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

export default async function EventsPage() {
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data }, { data: statusData }, { data: attendanceData }] =
    await Promise.all([
      supabase
        .from("events")
        .select(
          "id, title, description, is_open, created_at, closed_at, creator:app_users!events_created_by_fkey (display_name)"
        )
        .order("created_at", { ascending: false }),
      supabase.from("requests").select("event_id, status"),
      supabase.from("attendance_entries").select("event_id"),
    ]);
  const events = (data ?? []) as unknown as EventRow[];
  const statusRows = (statusData ?? []) as RequestStatusRow[];
  const statusCounts = new Map<string, Partial<Record<RequestStatus, number>>>();
  for (const row of statusRows) {
    const counts = statusCounts.get(row.event_id) ?? {};
    counts[row.status] = (counts[row.status] ?? 0) + 1;
    statusCounts.set(row.event_id, counts);
  }
  const attendanceCounts = new Map<string, number>();
  for (const row of (attendanceData ?? []) as { event_id: string }[]) {
    attendanceCounts.set(row.event_id, (attendanceCounts.get(row.event_id) ?? 0) + 1);
  }

  const canManage = hasRole(user, "exec") || hasRole(user, "payment_manager");
  const toEntry = (event: EventRow) => ({
    event: {
      id: event.id,
      title: event.title,
      description: event.description,
      is_open: event.is_open,
      created_at: event.created_at,
      closed_at: event.closed_at,
      creatorName: event.creator?.display_name ?? "unknown",
    },
    counts: statusCounts.get(event.id) ?? {},
    attendanceCount: attendanceCounts.get(event.id) ?? 0,
    onToggleOpen: setEventOpen.bind(null, event.id, !event.is_open),
    onUpdate: updateEvent.bind(null, event.id),
    onDelete: deleteEvent.bind(null, event.id),
  });
  const openEvents = events.filter((e) => e.is_open).map(toEntry);
  const previousEvents = events.filter((e) => !e.is_open).map(toEntry);

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
              className="max-h-40 overflow-y-auto rounded-md border border-line bg-bg px-3 py-2 text-sm placeholder:text-ink-soft/60"
            />
            <SubmitButton className="self-start rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover">
              Create event
            </SubmitButton>
          </form>
        )}

        <EventsTabs
          openEvents={openEvents}
          previousEvents={previousEvents}
          canManage={canManage}
        />
      </main>
    </>
  );
}
