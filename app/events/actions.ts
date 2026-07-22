"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppUser, hasRole, type AppUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// Creating/closing events is an exec or payment_manager job; only
// payment_manager can confirm a reimbursement was paid out (see
// confirmReimbursed in app/requests/actions.ts).
function canManageEvents(user: AppUser): boolean {
  return hasRole(user, "exec") || hasRole(user, "payment_manager");
}

export async function createEvent(formData: FormData) {
  const user = await requireAppUser();
  if (!canManageEvents(user)) throw new Error("Not allowed");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const admin = createAdminClient();
  const { error } = await admin.from("events").insert({
    title,
    description: String(formData.get("description") ?? "").trim(),
    created_by: user.id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/events");
}

export async function setEventOpen(eventId: string, isOpen: boolean) {
  const user = await requireAppUser();
  if (!canManageEvents(user)) throw new Error("Not allowed");

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ is_open: isOpen, closed_at: isOpen ? null : new Date().toISOString() })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

export async function updateEvent(eventId: string, formData: FormData) {
  const user = await requireAppUser();
  if (!canManageEvents(user)) throw new Error("Not allowed");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({
      title,
      description: String(formData.get("description") ?? "").trim(),
    })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  revalidatePath(`/events/${eventId}`);
}

// Only for events created by mistake: refuse to delete once any request
// has been made under it (close it instead, so the history is kept).
export async function deleteEvent(eventId: string) {
  const user = await requireAppUser();
  if (!canManageEvents(user)) throw new Error("Not allowed");

  const admin = createAdminClient();
  const { count, error: countError } = await admin
    .from("requests")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId);
  if (countError) throw new Error(countError.message);
  if (count && count > 0) {
    throw new Error(
      "Can't delete an event with requests under it. Close it instead."
    );
  }

  const { error } = await admin.from("events").delete().eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
  redirect("/events");
}
