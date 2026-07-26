import Link from "next/link";
import { requireAppUser } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { CATEGORIES } from "@/lib/types";
import { CATEGORY_LABELS } from "@/lib/format";
import { Nav } from "@/components/nav";
import { PaymentMethodFields } from "@/components/payment-method-fields";
import { SubmitButton } from "@/components/submit-button";
import { CustomSelect } from "@/components/custom-select";
import { createRequest } from "../actions";

const inputClass =
  "rounded-md border border-line bg-surface px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";

export default async function NewRequestPage() {
  const user = await requireAppUser();
  const supabase = await createClient();
  const [{ data: events }, { data: savedBank }] = await Promise.all([
    supabase
      .from("events")
      .select("id, title")
      .eq("is_open", true)
      .order("created_at", { ascending: false }),
    // Saved payout details for prefill (RLS: own row only).
    supabase
      .from("bank_details")
      .select("payment_method, payid, bsb, account_number")
      .maybeSingle(),
  ]);

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
              <CustomSelect
                name="event_id"
                required
                defaultValue={events[0].id}
                options={events.map((event) => ({
                  value: event.id,
                  label: event.title,
                }))}
              />
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
                className={`${inputClass} max-h-40 overflow-y-auto`}
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
                <CustomSelect
                  name="category"
                  required
                  defaultValue={CATEGORIES[0]}
                  options={CATEGORIES.map((c) => ({
                    value: c,
                    label: CATEGORY_LABELS[c],
                  }))}
                />
              </label>
            </div>
            <PaymentMethodFields
              defaultMethod={savedBank?.payment_method ?? "bank_transfer"}
              defaultPayid={savedBank?.payid ?? ""}
              defaultBsb={savedBank?.bsb ?? ""}
              defaultAccountNumber={savedBank?.account_number ?? ""}
              showSaveCheckbox
              defaultSave={!!savedBank}
            />
            <SubmitButton className="mt-1 self-start rounded-md bg-accent px-5 py-2.5 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover">
              Submit request
            </SubmitButton>
          </form>
        )}
      </main>
    </>
  );
}
