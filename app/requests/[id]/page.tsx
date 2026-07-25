import { notFound } from "next/navigation";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  formatAUD,
  formatBankDetails,
  CATEGORY_LABELS,
  STATUS_LABELS,
} from "@/lib/format";
import type { BankDetails, Category, RequestStatus } from "@/lib/types";
import { Nav } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";
import { PaymentMethodFields } from "@/components/payment-method-fields";
import { SubmitButton } from "@/components/submit-button";
import {
  approveSpend,
  rejectRequest,
  submitClaim,
  approveClaim,
  confirmReimbursed,
  resubmitSpend,
  resubmitClaim,
} from "../actions";

interface RequestDetail {
  id: string;
  submitter_id: string;
  title: string;
  description: string;
  amount_estimated: number;
  amount_claimed: number | null;
  category: Category;
  receipt_path: string | null;
  status: RequestStatus;
  created_at: string;
  event: { title: string } | null;
  submitter: { display_name: string } | null;
}

interface HistoryRow {
  id: string;
  from_status: RequestStatus | null;
  to_status: RequestStatus;
  note: string | null;
  created_at: string;
  actor: { display_name: string } | null;
}

const inputClass =
  "rounded-md border border-line bg-bg px-3 py-2 text-sm font-normal placeholder:text-ink-soft/60";
const cardClass = "rounded-lg border border-line bg-surface p-4";
const primaryButton =
  "rounded-md bg-accent px-4 py-2 text-sm font-medium text-accent-ink transition-colors hover:bg-accent-hover";
const dangerButton =
  "rounded-md border border-[#5a3232] px-4 py-2 text-sm font-medium text-[#f0a3a3] transition-colors hover:bg-[#2a1818]";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const supabase = await createClient();

  const [{ data }, { data: historyData }, { data: bank }] = await Promise.all([
    supabase
      .from("requests")
      .select(
        "id, submitter_id, title, description, amount_estimated, amount_claimed, category, receipt_path, status, created_at, event:events (title), submitter:app_users!requests_submitter_id_fkey (display_name)"
      )
      .eq("id", id)
      .maybeSingle(),
    supabase
      .from("status_history")
      .select(
        "id, from_status, to_status, note, created_at, actor:app_users!status_history_actor_id_fkey (display_name)"
      )
      .eq("request_id", id)
      .order("created_at", { ascending: true }),
    // Payout details: RLS only returns this row to the submitter and
    // payment managers, and it is deleted once the request is reimbursed.
    supabase
      .from("request_bank_details")
      .select("payment_method, payid, bsb, account_number")
      .eq("request_id", id)
      .maybeSingle(),
  ]);
  if (!data) notFound();
  const request = data as unknown as RequestDetail;
  const history = (historyData ?? []) as unknown as HistoryRow[];

  // Receipt is behind a short-lived signed URL; anyone who can see the
  // request row is allowed to see its receipt.
  let receiptUrl: string | null = null;
  if (request.receipt_path) {
    const { data: signed } = await createAdminClient()
      .storage.from("receipts")
      .createSignedUrl(request.receipt_path, 60 * 60);
    receiptUrl = signed?.signedUrl ?? null;
  }

  const isSubmitter = request.submitter_id === user.id;
  const isExec = hasRole(user, "exec");
  const isPaymentManager = hasRole(user, "payment_manager");
  const rejectedFrom = [...history]
    .reverse()
    .find((h) => h.to_status === "rejected")?.from_status;

  return (
    <>
      <Nav user={user} />
      <main className="mx-auto w-full max-w-3xl flex-1 p-4 sm:p-6">
        <div className="flex flex-wrap items-center gap-3">
          <h1 className="font-display text-xl font-semibold tracking-tight">
            {request.title}
          </h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-1 text-sm text-ink-soft">
          {request.submitter?.display_name} · {request.event?.title} ·{" "}
          {CATEGORY_LABELS[request.category]}
        </p>
        {request.description && (
          <p className="mt-3 text-sm">{request.description}</p>
        )}

        <dl className={`mt-4 flex gap-8 text-sm ${cardClass}`}>
          <div>
            <dt className="text-ink-soft">Estimated</dt>
            <dd className="font-mono font-medium">
              {formatAUD(request.amount_estimated)}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Claimed</dt>
            <dd className="font-mono font-medium">
              {request.amount_claimed != null
                ? formatAUD(request.amount_claimed)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-ink-soft">Receipt</dt>
            <dd className="font-medium">
              {receiptUrl ? (
                <a
                  href={receiptUrl}
                  target="_blank"
                  className="text-accent underline underline-offset-2"
                  rel="noreferrer"
                >
                  View
                </a>
              ) : (
                "—"
              )}
            </dd>
          </div>
        </dl>

        {bank && (
          <p className={`mt-3 text-sm ${cardClass}`}>
            <span className="text-ink-soft">Reimburse via: </span>
            <span className="font-mono font-medium">
              {formatBankDetails({
                paymentMethod: bank.payment_method,
                payid: bank.payid,
                bsb: bank.bsb,
                accountNumber: bank.account_number,
              } as BankDetails)}
            </span>
          </p>
        )}

        {/* Role- and status-appropriate actions */}
        <section className="mt-6 flex flex-col gap-4">
          {isExec && request.status === "pending_approval" && (
            <div className={cardClass}>
              <p className="text-sm font-medium">Exec approval</p>
              <p className="mt-1 text-sm text-accent">
                Approving lets {request.submitter?.display_name} spend, they
                still need committee approval before making the payment.
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                <form action={approveSpend.bind(null, request.id)}>
                  <SubmitButton className={primaryButton}>
                    Approve spend
                  </SubmitButton>
                </form>
                <form
                  action={rejectRequest.bind(null, request.id)}
                  className="flex flex-1 gap-2"
                >
                  <input
                    name="reason"
                    required
                    placeholder="Rejection reason (required)"
                    className={`${inputClass} flex-1`}
                  />
                  <SubmitButton className={dangerButton}>Reject</SubmitButton>
                </form>
              </div>
            </div>
          )}

          {isSubmitter && request.status === "approved" && (
            <form
              action={submitClaim.bind(null, request.id)}
              className={cardClass}
            >
              <p className="text-sm font-medium">Submit your claim</p>
              <p className="mt-1 text-sm text-ink-soft">
                Once you&apos;ve made the payment, enter what you actually paid
                and attach the receipt.
              </p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-col gap-1 text-sm font-medium">
                  Amount paid (AUD)
                  <input
                    name="amount_claimed"
                    type="number"
                    step="0.01"
                    min="0.01"
                    required
                    defaultValue={request.amount_estimated}
                    className={inputClass}
                  />
                </label>
                <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                  Receipt (PDF or image)
                  <input
                    name="receipt"
                    type="file"
                    accept="application/pdf,image/*"
                    required
                    className="text-sm"
                  />
                </label>
                <SubmitButton className={primaryButton}>
                  Submit claim
                </SubmitButton>
              </div>
            </form>
          )}

          {isExec && request.status === "claim_submitted" && (
            <div className={cardClass}>
              <p className="text-sm font-medium">Claim approval</p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                <form action={approveClaim.bind(null, request.id)}>
                  <SubmitButton className={primaryButton}>
                    Approve claim
                  </SubmitButton>
                </form>
                <form
                  action={rejectRequest.bind(null, request.id)}
                  className="flex flex-1 gap-2"
                >
                  <input
                    name="reason"
                    required
                    placeholder="Rejection reason (required)"
                    className={`${inputClass} flex-1`}
                  />
                  <SubmitButton className={dangerButton}>Reject</SubmitButton>
                </form>
              </div>
            </div>
          )}

          {isPaymentManager && request.status === "claim_approved" && (
            <form
              action={confirmReimbursed.bind(null, request.id)}
              className={cardClass}
            >
              <p className="text-sm font-medium">Confirm reimbursement</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                  Payment note (optional)
                  <input
                    name="note"
                    placeholder="e.g. bank transfer 18/07"
                    className={inputClass}
                  />
                </label>
                <SubmitButton className={primaryButton}>
                  Mark reimbursed
                </SubmitButton>
              </div>
            </form>
          )}

          {isSubmitter &&
            request.status === "rejected" &&
            rejectedFrom === "pending_approval" && (
              <form
                action={resubmitSpend.bind(null, request.id)}
                className={cardClass}
              >
                <p className="text-sm font-medium">Revise &amp; resubmit</p>
                <div className="mt-3 flex flex-col gap-3">
                  <input
                    name="title"
                    required
                    defaultValue={request.title}
                    className={inputClass}
                  />
                  <textarea
                    name="description"
                    rows={2}
                    defaultValue={request.description}
                    className={inputClass}
                  />
                  <label className="flex max-w-xs flex-col gap-1 text-sm font-medium">
                    Estimated amount (AUD)
                    <input
                      name="amount_estimated"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      defaultValue={request.amount_estimated}
                      className={inputClass}
                    />
                  </label>
                  <PaymentMethodFields
                    defaultMethod={bank?.payment_method ?? "bank_transfer"}
                    defaultPayid={bank?.payid ?? ""}
                    defaultBsb={bank?.bsb ?? ""}
                    defaultAccountNumber={bank?.account_number ?? ""}
                    fieldBg="bg-bg"
                  />
                  <SubmitButton className={`${primaryButton} self-start`}>
                    Resubmit
                  </SubmitButton>
                </div>
              </form>
            )}

          {isSubmitter &&
            request.status === "rejected" &&
            rejectedFrom === "claim_submitted" && (
              <form
                action={resubmitClaim.bind(null, request.id)}
                className={cardClass}
              >
                <p className="text-sm font-medium">Revise &amp; resubmit claim</p>
                <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-end">
                  <label className="flex flex-col gap-1 text-sm font-medium">
                    Amount paid (AUD)
                    <input
                      name="amount_claimed"
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      defaultValue={request.amount_claimed ?? undefined}
                      className={inputClass}
                    />
                  </label>
                  <label className="flex flex-1 flex-col gap-1 text-sm font-medium">
                    New receipt (optional)
                    <input
                      name="receipt"
                      type="file"
                      accept="application/pdf,image/*"
                      className="text-sm"
                    />
                  </label>
                  <SubmitButton className={primaryButton}>
                    Resubmit claim
                  </SubmitButton>
                </div>
              </form>
            )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-medium text-ink-soft">History</h2>
          <ol className="mt-2 flex flex-col gap-2 text-sm">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-line pl-3"
              >
                <span className="font-medium">
                  {entry.actor?.display_name ?? "Unknown"}
                </span>
                <span className="text-ink-soft">
                  {entry.from_status
                    ? `${STATUS_LABELS[entry.from_status]} → ${STATUS_LABELS[entry.to_status]}`
                    : `Submitted (${STATUS_LABELS[entry.to_status]})`}
                </span>
                <span className="font-mono text-xs text-ink-soft/70">
                  {new Date(entry.created_at).toLocaleString("en-AU")}
                </span>
                {entry.note && (
                  <span className="w-full text-ink-soft">“{entry.note}”</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
