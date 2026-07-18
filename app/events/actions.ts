"use server";

import { revalidatePath } from "next/cache";
import { requireAppUser, hasRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createEvent(formData: FormData) {
  const user = await requireAppUser();
  if (!hasRole(user, "payment_manager")) throw new Error("Not allowed");

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
  if (!hasRole(user, "payment_manager")) throw new Error("Not allowed");

  const admin = createAdminClient();
  const { error } = await admin
    .from("events")
    .update({ is_open: isOpen })
    .eq("id", eventId);
  if (error) throw new Error(error.message);
  revalidatePath("/events");
}
