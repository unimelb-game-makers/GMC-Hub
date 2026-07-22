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

// EFT only: BSB and account number, digits normalised (spaces/dashes ok).
function parseBankDetails(formData: FormData) {
  const bsb = String(formData.get("bsb") ?? "").replace(/\D/g, "");
  const account = String(formData.get("account_number") ?? "").replace(/\D/g, "");
  if (!/^\d{6}$/.test(bsb)) throw new Error("BSB must be 6 digits");
  if (!/^\d{4,10}$/.test(account)) {
    throw new Error("Account number must be 4 to 10 digits");
  }
  return { bsb, account_number: account };
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
  const receipt = formData.get("receipt");
  if (!(receipt instanceof File) || receipt.size === 0) {
    throw new Error("A receipt is required");
  }

  const admin = createAdminClient();
  const path = `${user.id}/${request.id}/${Date.now()}-${receipt.name}`;
  const { error: uploadError } = await admin.storage
    .from("receipts")
    .upload(path, Buffer.from(await receipt.arrayBuffer()), {
      contentType: receipt.type || "application/octet-stream",
    });
  if (uploadError) throw new Error(uploadError.message);

  await transition(request, user, "claim_submitted", {
    amount_claimed: amount,
    receipt_path: path,
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
    `You've been reimbursed ${formatAUD(request.amount_claimed ?? 0)} for **${request.title}**. 🎉`
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
  const fields: Record<string, unknown> = { amount_claimed: amount };

  const receipt = formData.get("receipt");
  if (receipt instanceof File && receipt.size > 0) {
    const admin = createAdminClient();
    const path = `${user.id}/${request.id}/${Date.now()}-${receipt.name}`;
    const { error } = await admin.storage
      .from("receipts")
      .upload(path, Buffer.from(await receipt.arrayBuffer()), {
        contentType: receipt.type || "application/octet-stream",
      });
    if (error) throw new Error(error.message);
    fields.receipt_path = path;
  }

  await transition(request, user, "claim_submitted", fields);
  await sendChannelMessage(
    `${committeeMention()} **${user.display_name}** resubmitted their claim for ` +
      `**${request.title}** (${formatAUD(amount)}), needs exec approval.`
  );
}
