import Link from "next/link";
import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import { Nav } from "@/components/nav";
import { createRequest } from "../actions";

const inputClass =
  "rounded-md border border-line bg-surface px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

export default async function NewRequestPage() {
  const user = await requireAppUser();
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("id, title")
    .eq("is_open", true)
    .order("created_at", { ascending: false });

  // Saved payout details for prefill (RLS: own row only).
  const { data: savedBank } = await supabase
    .from("bank_details")
    .select("bsb, account_number")
    .maybeSingle();

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-2xl flex-1 p-4 sm:p-6">
        <h1 className="font-display text-xl font-semibold tracking-tight">
          New spend request
        </h1>
        <p className="mt-1 text-sm text-ink-soft">
          Ask for approval before you spend. Submit your claim with the receipt
          after you&apos;ve paid.
        </p>

        {!events?.length ? (
          <p className="mt-6 rounded-lg border border-line bg-surface p-4 text-sm text-ink-soft">
            There are no open events to request under. Ask a payment manager to
            create one on the{" "}
            <Link href="/events" className="text-accent underline underline-offset-2">
              events page
            </Link>
            .
          </p>
        ) : (
          <form action={createRequest} className="mt-4 flex flex-col gap-3">
            <label className="flex flex-col gap-1 text-sm font-medium">
              Event
              <select name="event_id" required className={inputClass}>
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
                className={inputClass}
              />
            </label>
            <label className="flex flex-col gap-1 text-sm font-medium">
              Details
              <textarea
                name="description"
                rows={3}
                placeholder="Anything the execs should know (optional)"
                className={inputClass}
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
                  className={`${inputClass} font-mono`}
                />
              </label>
              <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                Category
                <select name="category" required className={`${inputClass} capitalize`}>
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c} className="capitalize">
                      {c}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset className="mt-1 rounded-lg border border-line bg-surface p-4">
              <legend className="px-1 text-sm font-medium">
                Reimbursement account (EFT)
              </legend>
              <p className="text-sm text-ink-soft">
                Where we&apos;ll send the money once your claim is approved.
                Only you and the payment manager can see this.
              </p>
              <div className="mt-3 flex gap-3">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  BSB
                  <input
                    name="bsb"
                    required
                    inputMode="numeric"
                    pattern="\d{3}-?\d{3}"
                    placeholder="e.g. 063-000"
                    defaultValue={savedBank?.bsb ?? ""}
                    className={`${inputClass} font-mono`}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                  Account number
                  <input
                    name="account_number"
                    required
                    inputMode="numeric"
                    pattern="\d{4,10}"
                    placeholder="4 to 10 digits"
                    defaultValue={savedBank?.account_number ?? ""}
                    className={`${inputClass} font-mono`}
                  />
                </label>
              </div>
              <label className="mt-3 flex items-center gap-2 text-sm text-ink-soft">
                <input
                  type="checkbox"
                  name="save_bank_details"
                  defaultChecked={!!savedBank}
                  className="accent-accent"
                />
                Save these details for next time
              </label>
            </fieldset>
            <button
              type="submit"
              className="mt-1 self-start rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover"
            >
              Submit request
            </button>
          </form>
        )}
      </main>
    </>
  );
}
