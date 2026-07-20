import { notFound } from "next/navigation";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { formatAUD, formatBSB, STATUS_LABELS } from "@/lib/format";
import type { RequestStatus } from "@/lib/types";
import { Nav } from "@/components/nav";
import { StatusBadge } from "@/components/status-badge";
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
  category: string;
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
  "rounded-md border border-zinc-300 px-3 py-2 text-sm font-normal dark:border-zinc-700 dark:bg-zinc-900";
const primaryButton =
  "rounded-md bg-zinc-900 px-4 py-2 text-sm font-medium text-white hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300";
const dangerButton =
  "rounded-md border border-red-300 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950";

export default async function RequestPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const user = await requireAppUser();
  const supabase = await createClient();

  const { data } = await supabase
    .from("requests")
    .select(
      "id, submitter_id, title, description, amount_estimated, amount_claimed, category, receipt_path, status, created_at, event:events (title), submitter:app_users!requests_submitter_id_fkey (display_name)"
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) notFound();
  const request = data as unknown as RequestDetail;

  const { data: historyData } = await supabase
    .from("status_history")
    .select(
      "id, from_status, to_status, note, created_at, actor:app_users!status_history_actor_id_fkey (display_name)"
    )
    .eq("request_id", id)
    .order("created_at", { ascending: true });
  const history = (historyData ?? []) as unknown as HistoryRow[];

  // Payout details: RLS only returns this row to the submitter and
  // payment managers, and it is deleted once the request is reimbursed.
  const { data: bank } = await supabase
    .from("request_bank_details")
    .select("bsb, account_number")
    .eq("request_id", id)
    .maybeSingle();

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
          <h1 className="text-xl font-semibold tracking-tight">
            {request.title}
          </h1>
          <StatusBadge status={request.status} />
        </div>
        <p className="mt-1 text-sm text-zinc-500">
          {request.submitter?.display_name} · {request.event?.title} ·{" "}
          <span className="capitalize">{request.category}</span>
        </p>
        {request.description && (
          <p className="mt-3 text-sm">{request.description}</p>
        )}

        <dl className="mt-4 flex gap-8 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
          <div>
            <dt className="text-zinc-500">Estimated</dt>
            <dd className="font-medium">
              {formatAUD(request.amount_estimated)}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Claimed</dt>
            <dd className="font-medium">
              {request.amount_claimed != null
                ? formatAUD(request.amount_claimed)
                : "—"}
            </dd>
          </div>
          <div>
            <dt className="text-zinc-500">Receipt</dt>
            <dd className="font-medium">
              {receiptUrl ? (
                <a
                  href={receiptUrl}
                  target="_blank"
                  className="underline"
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
          <p className="mt-3 rounded-lg border border-zinc-200 p-4 text-sm dark:border-zinc-800">
            <span className="text-zinc-500">Reimburse via EFT: </span>
            <span className="font-medium">
              BSB {formatBSB(bank.bsb)} · Account {bank.account_number}
            </span>
          </p>
        )}

        {/* Role- and status-appropriate actions */}
        <section className="mt-6 flex flex-col gap-4">
          {isExec && request.status === "pending_approval" && (
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-sm font-medium">Exec approval</p>
              <p className="mt-1 text-sm text-amber-700 dark:text-amber-500">
                ⚠ Approving lets {request.submitter?.display_name} spend —
                they still need committee approval before making the payment.
              </p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                <form action={approveSpend.bind(null, request.id)}>
                  <button type="submit" className={primaryButton}>
                    Approve spend
                  </button>
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
                  <button type="submit" className={dangerButton}>
                    Reject
                  </button>
                </form>
              </div>
            </div>
          )}

          {isSubmitter && request.status === "approved" && (
            <form
              action={submitClaim.bind(null, request.id)}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
            >
              <p className="text-sm font-medium">Submit your claim</p>
              <p className="mt-1 text-sm text-zinc-500">
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
                <button type="submit" className={primaryButton}>
                  Submit claim
                </button>
              </div>
            </form>
          )}

          {isExec && request.status === "claim_submitted" && (
            <div className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
              <p className="text-sm font-medium">Claim approval</p>
              <div className="mt-3 flex flex-wrap items-start gap-3">
                <form action={approveClaim.bind(null, request.id)}>
                  <button type="submit" className={primaryButton}>
                    Approve claim
                  </button>
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
                  <button type="submit" className={dangerButton}>
                    Reject
                  </button>
                </form>
              </div>
            </div>
          )}

          {isPaymentManager && request.status === "claim_approved" && (
            <form
              action={confirmReimbursed.bind(null, request.id)}
              className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
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
                <button type="submit" className={primaryButton}>
                  Mark reimbursed
                </button>
              </div>
            </form>
          )}

          {isSubmitter &&
            request.status === "rejected" &&
            rejectedFrom === "pending_approval" && (
              <form
                action={resubmitSpend.bind(null, request.id)}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
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
                  <div className="flex flex-wrap items-end gap-3">
                    <label className="flex flex-col gap-1 text-sm font-medium">
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
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      BSB
                      <input
                        name="bsb"
                        required
                        inputMode="numeric"
                        pattern="\d{3}-?\d{3}"
                        defaultValue={bank?.bsb ?? ""}
                        className={inputClass}
                      />
                    </label>
                    <label className="flex flex-col gap-1 text-sm font-medium">
                      Account number
                      <input
                        name="account_number"
                        required
                        inputMode="numeric"
                        pattern="\d{4,10}"
                        defaultValue={bank?.account_number ?? ""}
                        className={inputClass}
                      />
                    </label>
                    <button type="submit" className={primaryButton}>
                      Resubmit
                    </button>
                  </div>
                </div>
              </form>
            )}

          {isSubmitter &&
            request.status === "rejected" &&
            rejectedFrom === "claim_submitted" && (
              <form
                action={resubmitClaim.bind(null, request.id)}
                className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
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
                  <button type="submit" className={primaryButton}>
                    Resubmit claim
                  </button>
                </div>
              </form>
            )}
        </section>

        <section className="mt-8">
          <h2 className="text-sm font-medium text-zinc-500">History</h2>
          <ol className="mt-2 flex flex-col gap-2 text-sm">
            {history.map((entry) => (
              <li
                key={entry.id}
                className="flex flex-wrap items-baseline gap-x-2 border-l-2 border-zinc-200 pl-3 dark:border-zinc-800"
              >
                <span className="font-medium">
                  {entry.actor?.display_name ?? "Unknown"}
                </span>
                <span className="text-zinc-500">
                  {entry.from_status
                    ? `${STATUS_LABELS[entry.from_status]} → ${STATUS_LABELS[entry.to_status]}`
                    : `Submitted (${STATUS_LABELS[entry.to_status]})`}
                </span>
                <span className="text-xs text-zinc-400">
                  {new Date(entry.created_at).toLocaleString("en-AU")}
                </span>
                {entry.note && (
                  <span className="w-full text-zinc-500">“{entry.note}”</span>
                )}
              </li>
            ))}
          </ol>
        </section>
      </main>
    </>
  );
}
