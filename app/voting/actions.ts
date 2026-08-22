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

// Shared by create and update: title, eligibility, and schedule. Options
// are handled separately by the caller since an update may need to leave
// them untouched once ballots exist.
function parseVoteFields(formData: FormData) {
  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const description = String(formData.get("description") ?? "").trim();
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

  const revealVoters = !!formData.get("reveal_voters");

  return { title, description, allowedRoles, opensAt, closesAt, revealVoters };
}

function parseOptions(formData: FormData): string[] {
  const options = formData
    .getAll("option")
    .map((o) => String(o).trim())
    .filter(Boolean);
  if (options.length < 2) throw new Error("Add at least 2 options");
  if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
    throw new Error("Options must be unique");
  }
  return options;
}

export async function createVote(formData: FormData) {
  const user = await requireAppUser();
  if (!canManageVotes(user)) throw new Error("Not allowed");

  const { title, description, allowedRoles, opensAt, closesAt, revealVoters } =
    parseVoteFields(formData);
  const options = parseOptions(formData);
  const allowMultipleChoices = !!formData.get("allow_multiple_choices");

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
      reveal_voters: revealVoters,
      allow_multiple_choices: allowMultipleChoices,
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

// Amendable up until it closes (naturally at closes_at, or manually via
// closeVoteEarly). Options and the reveal-voters toggle can only be
// changed while no one has voted yet: renaming/removing an option, or
// switching ballot secrecy on someone after they voted under the original
// terms, would misrepresent what people actually voted for or agreed to.
// Both are left untouched instead once a ballot exists (silently ignoring
// whatever the client submitted for them, not trusting it to have
// correctly locked its own form).
export async function updateVote(voteId: string, formData: FormData) {
  const user = await requireAppUser();
  if (!canManageVotes(user)) throw new Error("Not allowed");

  const admin = createAdminClient();
  const { data: existing } = await admin
    .from("votes")
    .select("opens_at, closes_at, closed_early_at")
    .eq("id", voteId)
    .maybeSingle();
  if (!existing) throw new Error("Vote not found");
  if (
    voteStatus({
      opensAt: existing.opens_at,
      closesAt: existing.closes_at,
      closedEarlyAt: existing.closed_early_at,
    }) === "closed"
  ) {
    throw new Error("This vote has closed and can no longer be edited");
  }

  const { title, description, allowedRoles, opensAt, closesAt, revealVoters } =
    parseVoteFields(formData);

  const { count: ballotCount } = await admin
    .from("vote_ballots")
    .select("id", { count: "exact", head: true })
    .eq("vote_id", voteId);

  const { error } = await admin
    .from("votes")
    .update({
      title,
      description,
      allowed_roles: allowedRoles,
      opens_at: opensAt ? opensAt.toISOString() : null,
      closes_at: closesAt.toISOString(),
      ...(ballotCount ? {} : { reveal_voters: revealVoters }),
    })
    .eq("id", voteId);
  if (error) throw new Error(error.message);

  if (!ballotCount) {
    const options = parseOptions(formData);
    const { error: deleteError } = await admin
      .from("vote_options")
      .delete()
      .eq("vote_id", voteId);
    if (deleteError) throw new Error(deleteError.message);
    const { error: optionsError } = await admin.from("vote_options").insert(
      options.map((label, i) => ({ vote_id: voteId, label, display_order: i }))
    );
    if (optionsError) throw new Error(optionsError.message);
  }

  revalidatePath(`/voting/${voteId}`);
  revalidatePath("/voting");
}

// Amendable up until the vote closes: replaces the voter's previous
// choice(s) with the new selection rather than adding to them, so casting
// again is how you change your vote.
export async function setBallots(voteId: string, optionIds: string[]) {
  const user = await requireAppUser();

  const supabase = await createClient();
  const { data: vote } = await supabase
    .from("votes")
    .select("allowed_roles, allow_multiple_choices, opens_at, closes_at, closed_early_at")
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

  const uniqueOptionIds = [...new Set(optionIds)];
  if (uniqueOptionIds.length === 0) throw new Error("Select at least one option");
  if (!vote.allow_multiple_choices && uniqueOptionIds.length > 1) {
    throw new Error("This vote only allows one choice");
  }

  const admin = createAdminClient();
  const { error: deleteError } = await admin
    .from("vote_ballots")
    .delete()
    .eq("vote_id", voteId)
    .eq("voter_id", user.id);
  if (deleteError) throw new Error(deleteError.message);

  const { error } = await admin.from("vote_ballots").insert(
    uniqueOptionIds.map((optionId) => ({
      vote_id: voteId,
      option_id: optionId,
      voter_id: user.id,
    }))
  );
  if (error) throw new Error(error.message);

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
