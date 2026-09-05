import { requireAppUser, hasRole } from "@/lib/auth";
import { Nav } from "@/components/nav";

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <details
      open
      className="group rounded-xl border border-line bg-surface p-4 [&_summary::-webkit-details-marker]:hidden"
    >
      <summary className="cursor-pointer list-none font-display text-sm font-semibold tracking-tight">
        {title}
      </summary>
      <div className="mt-3 space-y-2 text-sm text-ink-soft">{children}</div>
    </details>
  );
}

export default async function HelpPage() {
  const user = await requireAppUser();
  const isExec = hasRole(user, "exec");
  const isPaymentManager = hasRole(user, "payment_manager");

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">Help</h1>
        <p className="mt-1 text-sm text-ink-soft">Quick reference for each part of the Hub.</p>

        <div className="mt-6 space-y-4">
          <Section title="Roles">
            <p>
              Sign in with <strong>Discord</strong>. Your Discord roles decide your access:
              <strong> Member</strong>, <strong>Exec</strong>, or <strong>Payment Manager</strong>.
              You can hold more than one at once.
            </p>
            <p>Roles re-sync from Discord every few minutes, no need to sign out and back in.</p>
          </Section>

          <Section title="Reimbursements">
            <ol className="list-decimal space-y-1 pl-5">
              <li>Submit a <strong>spend request</strong> for the event.</li>
              <li>An <strong>exec approves or rejects</strong> it (rejection needs a reason).</li>
              <li>Pay for it yourself, then submit a <strong>claim</strong> with your receipt.</li>
              <li>An exec approves the claim.</li>
              <li>A <strong>payment manager</strong> pays you and marks it <strong>reimbursed</strong>.</li>
            </ol>
            <p>Track status and full history on the request&apos;s own page.</p>
            {isExec && (
              <p>
                <strong>As exec:</strong>{" "}
                approve/reject spend requests and claims from the Reimbursements list.
              </p>
            )}
            {isPaymentManager && (
              <p>
                <strong>As payment manager:</strong>{" "}
                mark a claim as paid once you&apos;ve actually sent the money.
              </p>
            )}
          </Section>

          <Section title="Events">
            <p>
              Every request and every attendance record belongs to an <strong>event</strong>
              &nbsp;(title, date/time, venue, type).
            </p>
            {(isExec || isPaymentManager) && (
              <p>
                <strong>As exec/payment manager:</strong>{" "}
                create and close events. Closing just hides it from open sign-ups, nothing is deleted.
              </p>
            )}
          </Section>

          <Section title="Attendance">
            <ul className="list-disc space-y-1 pl-5">
              <li>Anyone signed in can <strong>check people in</strong> at any event.</li>
              <li>Search the shared roster or add a new student on the spot.</li>
              <li>Export a <strong>UMSU-formatted CSV</strong> once the event is done.</li>
              <li>Events can also have a <strong>public self check-in</strong> link/QR code, no Hub sign-in needed.</li>
            </ul>
          </Section>

          <Section title="Voting Booth">
            <ul className="list-disc space-y-1 pl-5">
              <li>Execs create a vote: title, eligible roles, open/close time.</li>
              <li>Vote or change your ballot any time while it&apos;s open.</li>
              <li>Ballots are <strong>secret by default</strong>. Results show once closed.</li>
            </ul>
          </Section>

          <Section title="Elections (alpha)">
            <ul className="list-disc space-y-1 pl-5">
              <li>Open to anyone invited by email, <strong>no Discord needed</strong>.</li>
              <li>Each invite = a single-use voting link.</li>
              <li>Counted by <strong>instant runoff</strong>: last place is eliminated each round until someone has a majority.</li>
              <li>Fully anonymous, no link is stored between voter and vote.</li>
            </ul>
          </Section>
        </div>
      </main>
    </>
  );
}
