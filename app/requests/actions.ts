"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppUser, hasRole, type AppUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  sendChannelMessage,
  sendDirectMessage,
  committeeMention,
  paymentManagerMention,
} from "@/lib/discord";
import { formatAUD } from "@/lib/format";
import { CATEGORIES, type Category, type RequestStatus } from "@/lib/types";

interface RequestRow {
  id: string;
  event_id: string;
  submitter_id: string;
  title: string;
  status: RequestStatus;
  amount_estimated: number;
  amount_claimed: number | null;
  submitter: { discord_id: string; display_name: string };
}

async function getRequest(requestId: string): Promise<RequestRow> {
  const admin = createAdminClient();
  const { data, error } = await admin
    .from("requests")
    .select(
      "id, event_id, submitter_id, title, status, amount_estimated, amount_claimed, submitter:app_users!requests_submitter_id_fkey (discord_id, display_name)"
    )
    .eq("id", requestId)
    .single();
  if (error) throw new Error(error.message);
  return data as unknown as RequestRow;
}

async function transition(
  request: RequestRow,
  actor: AppUser,
  to: RequestStatus,
  fields: Record<string, unknown> = {},
  note: string | null = null,
  paidAt: string | null = null
) {
  const admin = createAdminClient();
  const { error } = await admin
    .from("requests")
    .update({ status: to, ...fields })
    .eq("id", request.id)
    .eq("status", request.status);
  if (error) throw new Error(error.message);

  await admin.from("status_history").insert({
    request_id: request.id,
    actor_id: actor.id,
    from_status: request.status,
    to_status: to,
    note,
    paid_at: paidAt,
  });

  revalidatePath("/");
  revalidatePath(`/requests/${request.id}`);
}

function parseAmount(value: FormDataEntryValue | null): number {
  const amount = Number(value);
  if (!Number.isFinite(amount) || amount <= 0) {
    throw new Error("Amount must be a positive number");
  }
  return Math.round(amount * 100) / 100;
}

const MAX_RECEIPT_FILES = 3;
const MAX_RECEIPT_SIZE_BYTES = 8 * 1024 * 1024;

// Real filenames (camera/screenshot defaults especially) routinely contain
// spaces and other characters Supabase Storage's object keys reject outright
// ("Invalid key"). Keep only what's safe, preserving the extension.
function sanitizeFilename(name: string): string {
  const lastDot = name.lastIndexOf(".");
  const base = lastDot > 0 ? name.slice(0, lastDot) : name;
  const ext = lastDot > 0 ? name.slice(lastDot) : "";
  const safeBase = base.replace(/[^a-zA-Z0-9._-]+/g, "-").slice(0, 100);
  const safeExt = ext.replace(/[^a-zA-Z0-9.]+/g, "");
  return `${safeBase || "file"}${safeExt}`;
}

// Uploads up to MAX_RECEIPT_FILES receipt files to Supabase Storage and
// returns their paths. Mirrors the client-side cap in receipt-field.tsx —
// enforced again here since the client check is only a UX convenience, not
// a security/consistency boundary.
async function uploadReceipts(
  formData: FormData,
  userId: string,
  requestId: string
): Promise<string[]> {
  const files = formData
    .getAll("receipt")
    .filter((f): f is File => f instanceof File && f.size > 0);
  if (files.length > MAX_RECEIPT_FILES) {
    throw new Error(`Up to ${MAX_RECEIPT_FILES} receipt files allowed`);
  }
  for (const file of files) {
    if (file.size > MAX_RECEIPT_SIZE_BYTES) {
      throw new Error(`"${file.name}" is too large (max 8 MB per file)`);
    }
  }

  const admin = createAdminClient();
  const paths: string[] = [];
  for (const file of files) {
    const path = `${userId}/${requestId}/${Date.now()}-${sanitizeFilename(file.name)}`;
    const { error } = await admin.storage
      .from("receipts")
      .upload(path, Buffer.from(await file.arrayBuffer()), {
        contentType: file.type || "application/octet-stream",
      });
    if (error) throw new Error(error.message);
    paths.push(path);
  }
  return paths;
}

// One of two payout methods: PayID, or BSB + account number (digits
// normalised, spaces/dashes ok). Exactly one method's fields are stored,
// matching the DB check constraint.
function parseBankDetails(formData: FormData) {
  const method = String(formData.get("payment_method") ?? "");
  if (method === "payid") {
    const payid = String(formData.get("payid") ?? "").trim();
    if (!payid) throw new Error("PayID is required");
    return {
      payment_method: "payid" as const,
      payid,
      bsb: null,
      account_number: null,
    };
  }
  if (method === "bank_transfer") {
    const bsb = String(formData.get("bsb") ?? "").replace(/\D/g, "");
    const account = String(formData.get("account_number") ?? "").replace(/\D/g, "");
    if (!/^\d{6}$/.test(bsb)) throw new Error("BSB must be 6 digits");
    if (!/^\d{4,10}$/.test(account)) {
      throw new Error("Account number must be 4 to 10 digits");
    }
    return {
      payment_method: "bank_transfer" as const,
      payid: null,
      bsb,
      account_number: account,
    };
  }
  throw new Error("Select a payment method");
}

export async function createRequest(formData: FormData) {
  const user = await requireAppUser();
  if (!hasRole(user, "member")) throw new Error("Not allowed");

  const eventId = String(formData.get("event_id") ?? "");
  const title = String(formData.get("title") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;
  const amount = parseAmount(formData.get("amount_estimated"));
  const bank = parseBankDetails(formData);
  if (!title) throw new Error("Title is required");
  if (!CATEGORIES.includes(category)) throw new Error("Invalid category");

  const admin = createAdminClient();
  const { data: event } = await admin
    .from("events")
    .select("id, title, is_open")
    .eq("id", eventId)
    .single();
  if (!event?.is_open) throw new Error("Event is not open for requests");

  const { data: request, error } = await admin
    .from("requests")
    .insert({
      event_id: eventId,
      submitter_id: user.id,
      title,
      description: String(formData.get("description") ?? "").trim(),
      amount_estimated: amount,
      category,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  // Snapshot payout details on the request; optionally save for next time.
  const { error: bankError } = await admin
    .from("request_bank_details")
    .insert({ request_id: request.id, ...bank });
  if (bankError) throw new Error(bankError.message);
  if (formData.get("save_bank_details")) {
    await admin
      .from("bank_details")
      .upsert({ app_user_id: user.id, ...bank }, { onConflict: "app_user_id" });
  }

  await admin.from("status_history").insert({
    request_id: request.id,
    actor_id: user.id,
    from_status: null,
    to_status: "pending_approval",
  });

  await sendChannelMessage(
    `${committeeMention()} New spend request from **${user.display_name}**: ` +
      `**${title}** (${formatAUD(amount)}) under *${event.title}*, needs exec approval.`
  );

  revalidatePath("/");
  redirect(`/requests/${request.id}`);
}

export async function approveSpend(requestId: string) {
  const user = await requireAppUser();
  if (!hasRole(user, "exec")) throw new Error("Not allowed");

  const request = await getRequest(requestId);
  if (request.status !== "pending_approval") throw new Error("Wrong status");

  await transition(request, user, "approved");
  await sendDirectMessage(
    request.submitter.discord_id,
    `Your spend request **${request.title}** (${formatAUD(request.amount_estimated)}) was approved. ` +
      `Reminder: you need committee approval before making the payment. ` +
      `Once you've paid, submit your claim with the receipt.`
  );
}

export async function rejectRequest(requestId: string, formData: FormData) {
  const user = await requireAppUser();
  if (!hasRole(user, "exec")) throw new Error("Not allowed");

  const reason = String(formData.get("reason") ?? "").trim();
  if (!reason) throw new Error("A rejection reason is required");

  const request = await getRequest(requestId);
  if (!["pending_approval", "claim_submitted"].includes(request.status)) {
    throw new Error("Wrong status");
  }

  await transition(request, user, "rejected", {}, reason);
  await sendDirectMessage(
    request.submitter.discord_id,
    `Your request **${request.title}** was rejected: ${reason}\n` +
      `You can revise and resubmit it in the app.`
  );
}

export async function submitClaim(requestId: string, formData: FormData) {
  const user = await requireAppUser();

  const request = await getRequest(requestId);
  if (request.submitter_id !== user.id) throw new Error("Not allowed");
  if (request.status !== "approved") throw new Error("Wrong status");

  const amount = parseAmount(formData.get("amount_claimed"));
  const receiptInDrive = !!formData.get("receipt_in_drive");

  let receiptPaths: string[] = [];
  if (!receiptInDrive) {
    receiptPaths = await uploadReceipts(formData, user.id, request.id);
    if (receiptPaths.length === 0) {
      throw new Error(
        "A receipt is required (attach a file, or confirm it's in the Drive folder)"
      );
    }
  }

  await transition(request, user, "claim_submitted", {
    amount_claimed: amount,
    receipt_paths: receiptPaths,
    receipt_in_drive: receiptInDrive,
  });

  await sendChannelMessage(
    `${committeeMention()} **${user.display_name}** submitted a claim for ` +
      `**${request.title}** (${formatAUD(amount)}), needs exec approval.`
  );
}

export async function approveClaim(requestId: string) {
  const user = await requireAppUser();
  if (!hasRole(user, "exec")) throw new Error("Not allowed");

  const request = await getRequest(requestId);
  if (request.status !== "claim_submitted") throw new Error("Wrong status");

  await transition(request, user, "claim_approved");
  await sendChannelMessage(
    `${paymentManagerMention()} Claim approved for **${request.title}** ` +
      `(${formatAUD(request.amount_claimed ?? 0)}, ${request.submitter.display_name}), ready to reimburse.`
  );
}

export async function confirmReimbursed(requestId: string, formData: FormData) {
  const user = await requireAppUser();
  if (!hasRole(user, "payment_manager")) throw new Error("Not allowed");

  const request = await getRequest(requestId);
  if (request.status !== "claim_approved") throw new Error("Wrong status");

  const note = String(formData.get("note") ?? "").trim() || null;
  await transition(request, user, "reimbursed", {}, note, new Date().toISOString());

  // Payout done: the bank snapshot has served its purpose, drop it.
  await createAdminClient()
    .from("request_bank_details")
    .delete()
    .eq("request_id", request.id);

  await sendDirectMessage(
    request.submitter.discord_id,
    `You've been reimbursed ${formatAUD(request.amount_claimed ?? 0)} for **${request.title}**.`
  );
}

// Rejected requests return to the stage they were rejected from: spend
// rejections re-enter pending_approval (with edited details); claim
// rejections re-enter claim_submitted (with a fresh claim).
export async function resubmitSpend(requestId: string, formData: FormData) {
  const user = await requireAppUser();

  const request = await getRequest(requestId);
  if (request.submitter_id !== user.id) throw new Error("Not allowed");
  if (request.status !== "rejected") throw new Error("Wrong status");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const amount = parseAmount(formData.get("amount_estimated"));
  const bank = parseBankDetails(formData);

  await transition(request, user, "pending_approval", {
    title,
    description: String(formData.get("description") ?? "").trim(),
    amount_estimated: amount,
  });

  await createAdminClient()
    .from("request_bank_details")
    .upsert({ request_id: request.id, ...bank }, { onConflict: "request_id" });

  await sendChannelMessage(
    `${committeeMention()} **${user.display_name}** resubmitted spend request ` +
      `**${title}** (${formatAUD(amount)}), needs exec approval.`
  );
}

export async function resubmitClaim(requestId: string, formData: FormData) {
  const user = await requireAppUser();

  const request = await getRequest(requestId);
  if (request.submitter_id !== user.id) throw new Error("Not allowed");
  if (request.status !== "rejected") throw new Error("Wrong status");

  const amount = parseAmount(formData.get("amount_claimed"));
  const receiptInDrive = !!formData.get("receipt_in_drive");

  let receiptPaths: string[] = [];
  if (!receiptInDrive) {
    receiptPaths = await uploadReceipts(formData, user.id, request.id);
    if (receiptPaths.length === 0) {
      throw new Error(
        "A receipt is required (attach a file, or confirm it's in the Drive folder)"
      );
    }
  }

  await transition(request, user, "claim_submitted", {
    amount_claimed: amount,
    receipt_paths: receiptPaths,
    receipt_in_drive: receiptInDrive,
  });
  await sendChannelMessage(
    `${committeeMention()} **${user.display_name}** resubmitted their claim for ` +
      `**${request.title}** (${formatAUD(amount)}), needs exec approval.`
  );
}
