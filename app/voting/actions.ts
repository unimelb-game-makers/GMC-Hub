"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppUser, hasRole, type AppUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { ROLES } from "@/lib/types";
import { melbourneToUtc } from "@/lib/timezone";
import { voteStatus, canVote } from "@/lib/voting";

// "Only committee role on Discord can make voting booths" — Committee
// maps to the exec app role in the current Discord role mapping.
function canManageVotes(user: AppUser): boolean {
  return hasRole(user, "exec");
}

export async function createVote(formData: FormData) {
  const user = await requireAppUser();
  if (!canManageVotes(user)) throw new Error("Not allowed");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const description = String(formData.get("description") ?? "").trim();

  const options = formData
    .getAll("option")
    .map((o) => String(o).trim())
    .filter(Boolean);
  if (options.length < 2) throw new Error("Add at least 2 options");
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    throw new Error("Options must be unique");
  }

  const allowedRoles = ROLES.filter((r) => formData.get(`role_${r}`));

  const closesDate = String(formData.get("closes_at_date") ?? "").trim();
  const closesTime = String(formData.get("closes_at_time") ?? "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(closesDate) || !/^\d{2}:\d{2}$/.test(closesTime)) {
    throw new Error("Closing date and time are required");
  }
  const closesAt = melbourneToUtc(`${closesDate}T${closesTime}`);
  if (closesAt.getTime() <= Date.now()) {
    throw new Error("Closing time must be in the future");
  }

  const opensDate = String(formData.get("opens_at_date") ?? "").trim();
  const opensTime = String(formData.get("opens_at_time") ?? "").trim();
  let opensAt: Date | null = null;
  if (opensDate && opensTime) {
    opensAt = melbourneToUtc(`${opensDate}T${opensTime}`);
    if (opensAt.getTime() >= closesAt.getTime()) {
      throw new Error("Opening time must be before closing time");
    }
  }

  const admin = createAdminClient();
  const { data: vote, error } = await admin
    .from("votes")
    .insert({
      title,
      description,
      created_by: user.id,
      allowed_roles: allowedRoles,
      opens_at: opensAt ? opensAt.toISOString() : null,
      closes_at: closesAt.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  const { error: optionsError } = await admin.from("vote_options").insert(
    options.map((label, i) => ({ vote_id: vote.id, label, display_order: i }))
  );
  if (optionsError) throw new Error(optionsError.message);

  revalidatePath("/voting");
  revalidatePath("/");
  redirect(`/voting/${vote.id}`);
}

export async function castBallot(voteId: string, optionId: string) {
  const user = await requireAppUser();

  const supabase = await createClient();
  const { data: vote } = await supabase
    .from("votes")
    .select("allowed_roles, opens_at, closes_at, closed_early_at")
    .eq("id", voteId)
    .maybeSingle();
  if (!vote) throw new Error("Vote not found");

  const status = voteStatus({
    opensAt: vote.opens_at,
    closesAt: vote.closes_at,
    closedEarlyAt: vote.closed_early_at,
  });
  if (status === "upcoming") throw new Error("This vote hasn't opened yet");
  if (status === "closed") throw new Error("This vote has closed");
  if (!canVote(vote.allowed_roles, user.roles)) {
    throw new Error("You're not eligible to vote in this one");
  }

  const admin = createAdminClient();
  const { error } = await admin.from("vote_ballots").insert({
    vote_id: voteId,
    option_id: optionId,
    voter_id: user.id,
  });
  if (error) {
    if (error.code === "23505") throw new Error("You've already voted in this one");
    throw new Error(error.message);
  }

  revalidatePath(`/voting/${voteId}`);
  revalidatePath("/voting");
}

export async function closeVoteEarly(voteId: string) {
  const user = await requireAppUser();
  if (!canManageVotes(user)) throw new Error("Not allowed");

  const admin = createAdminClient();
  const { error } = await admin
    .from("votes")
    .update({ closed_early_at: new Date().toISOString() })
    .eq("id", voteId)
    .is("closed_early_at", null);
  if (error) throw new Error(error.message);

  revalidatePath(`/voting/${voteId}`);
  revalidatePath("/voting");
}
