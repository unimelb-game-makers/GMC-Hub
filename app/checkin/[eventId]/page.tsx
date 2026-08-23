import { createAdminClient } from "@/lib/supabase/admin";
import { SelfCheckinForm } from "@/components/self-checkin-form";
import { checkExistingMatch, publicSelfCheckIn } from "./actions";

interface EventRow {
  title: string;
  venue: string | null;
  is_open: boolean;
}

// No requireAppUser() anywhere on this page: reached by scanning an
// event's QR code, no Discord sign-in at all. Listed in PUBLIC_PATHS
// (lib/supabase/middleware.ts) so the auth middleware doesn't redirect
// visitors to /login.
export default async function PublicCheckinPage({
  params,
}: {
  params: Promise<{ eventId: string }>;
}) {
  const { eventId } = await params;

  const admin = createAdminClient();
  const { data } = await admin
    .from("events")
    .select("title, venue, is_open")
    .eq("id", eventId)
    .maybeSingle();

  if (!data) {
    return <Shell title="Event not found">This check-in link doesn&apos;t exist.</Shell>;
  }
  const event = data as EventRow;

  if (!event.is_open) {
    return (
      <Shell title={event.title}>This event isn&apos;t currently open for check-in.</Shell>
    );
  }

  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col p-4 sm:p-6">
      <h1 className="font-display text-xl font-semibold tracking-tight">{event.title}</h1>
      {event.venue && <p className="mt-1 text-sm text-ink-soft">{event.venue}</p>}
      <p className="mt-2 text-xs text-ink-soft">
        Check yourself in below, no sign-in needed.
      </p>

      <div className="mt-6">
        <SelfCheckinForm
          onCheckMatch={checkExistingMatch.bind(null, eventId)}
          onSubmit={publicSelfCheckIn.bind(null, eventId)}
        />
      </div>
    </main>
  );
}

function Shell({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <main className="mx-auto flex w-full max-w-md flex-1 flex-col items-center justify-center p-4 text-center sm:p-6">
      <h1 className="font-display text-lg font-semibold tracking-tight">{title}</h1>
      <p className="mt-2 text-sm text-ink-soft">{children}</p>
    </main>
  );
}
