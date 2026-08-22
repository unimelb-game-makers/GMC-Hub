"use server";

import { randomBytes, createHash } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAppUser, hasRole, type AppUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { melbourneToUtc } from "@/lib/timezone";
import { sendElectionInvites } from "@/lib/email";

// Same as Voting Booth: only exec (Committee) can create/manage elections.
// Voting itself needs no app role at all, since public voters never sign in.
function canManageElections(user: AppUser): boolean {
  return hasRole(user, "exec");
}

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

export interface QuestionInput {
  title: string;
  description: string;
  options: string[];
}

function parseStructure(formData: FormData): QuestionInput[] {
  const raw = String(formData.get("structure") ?? "");
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new Error("Malformed question structure");
  }
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error("Add at least one question");
  }
  return parsed.map((q): QuestionInput => {
    const title = String((q as { title?: unknown }).title ?? "").trim();
    const description = String((q as { description?: unknown }).description ?? "").trim();
    const options = ((q as { options?: unknown }).options as unknown[] | undefined ?? [])
      .map((o) => String(o).trim())
      .filter(Boolean);
    if (!title) throw new Error("Every question needs a title");
    if (options.length < 2) throw new Error(`"${title}" needs at least 2 options`);
    if (new Set(options.map((o) => o.toLowerCase())).size !== options.length) {
      throw new Error(`"${title}" has duplicate options`);
    }
    return { title, description, options };
  });
}

function parseSchedule(formData: FormData) {
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
  return { opensAt, closesAt };
}

export async function createElection(formData: FormData) {
  const user = await requireAppUser();
  if (!canManageElections(user)) throw new Error("Not allowed");

  const title = String(formData.get("title") ?? "").trim();
  if (!title) throw new Error("Title is required");
  const description = String(formData.get("description") ?? "").trim();
  const { opensAt, closesAt } = parseSchedule(formData);
  const questions = parseStructure(formData);

  const admin = createAdminClient();
  const { data: election, error } = await admin
    .from("elections")
    .insert({
      title,
      description,
      created_by: user.id,
      opens_at: opensAt ? opensAt.toISOString() : null,
      closes_at: closesAt.toISOString(),
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);

  for (let i = 0; i < questions.length; i++) {
    const q = questions[i];
    const { data: question, error: qError } = await admin
      .from("election_questions")
      .insert({
        election_id: election.id,
        title: q.title,
        description: q.description,
        display_order: i,
      })
      .select("id")
      .single();
    if (qError) throw new Error(qError.message);

    const { error: optError } = await admin.from("election_options").insert(
      q.options.map((label, j) => ({ question_id: question.id, label, display_order: j }))
    );
    if (optError) throw new Error(optError.message);
  }

  revalidatePath("/voting");
  redirect(`/voting/elections/${election.id}`);
}

// Emails not yet invited get a fresh token and an invite email. Emails
// already invited but not yet voted are treated as a resend: a new token
// replaces the old one, invalidating any previously emailed link, matching
// OpaVote's "resend invitation" behaviour. Emails that have already voted
// are silently skipped, their ballot can't be re-cast.
export async function inviteVoters(electionId: string, formData: FormData) {
  const user = await requireAppUser();
  if (!canManageElections(user)) throw new Error("Not allowed");

  const raw = String(formData.get("emails") ?? "");
  const emails = [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((e) => e.trim().toLowerCase())
        .filter(Boolean)
    ),
  ];
  const invalid = emails.filter((e) => !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));
  if (invalid.length > 0) {
    throw new Error(`Invalid email address: ${invalid[0]}`);
  }
  if (emails.length === 0) throw new Error("Add at least one email address");

  const admin = createAdminClient();
  const { data: election } = await admin
    .from("elections")
    .select("title")
    .eq("id", electionId)
    .maybeSingle();
  if (!election) throw new Error("Election not found");

  const { data: existing } = await admin
    .from("election_voters")
    .select("email, voted_at")
    .eq("election_id", electionId)
    .in("email", emails);
  const alreadyVoted = new Set(
    (existing ?? []).filter((e) => e.voted_at).map((e) => e.email)
  );
  const toInvite = emails.filter((e) => !alreadyVoted.has(e));

  const base = process.env.APP_URL;
  if (!base) throw new Error("APP_URL isn't configured, can't build voting links");

  const tokensByEmail = new Map(toInvite.map((email) => [email, generateToken()]));
  const rows = toInvite.map((email) => ({
    election_id: electionId,
    email,
    token_hash: hashToken(tokensByEmail.get(email)!),
  }));

  const { error } = await admin
    .from("election_voters")
    .upsert(rows, { onConflict: "election_id,email" });
  if (error) throw new Error(error.message);

  const { sent, failed } = await sendElectionInvites(
    toInvite.map((email) => ({
      to: email,
      electionTitle: election.title,
      voteUrl: `${base}/elections/${electionId}/vote?token=${tokensByEmail.get(email)}`,
    }))
  );

  revalidatePath(`/voting/elections/${electionId}`);
  return { invited: toInvite.length, skipped: emails.length - toInvite.length, sent, failed };
}

export async function closeElectionEarly(electionId: string) {
  const user = await requireAppUser();
  if (!canManageElections(user)) throw new Error("Not allowed");

  const admin = createAdminClient();
  const { error } = await admin
    .from("elections")
    .update({ closed_early_at: new Date().toISOString() })
    .eq("id", electionId)
    .is("closed_early_at", null);
  if (error) throw new Error(error.message);

  revalidatePath(`/voting/elections/${electionId}`);
  revalidatePath("/voting");
}

export interface BallotAnswer {
  questionId: string;
  optionIds: string[];
}

// The only action on this whole feature that doesn't call requireAppUser:
// public voters never sign in, they're authorized purely by holding a valid
// token. All the real validation (token unused, election open, options
// belong to their question) happens inside cast_election_ballot() so it's
// atomic and can't be bypassed by calling this directly.
export async function castElectionBallot(
  electionId: string,
  token: string,
  answers: BallotAnswer[]
) {
  const admin = createAdminClient();
  const { error } = await admin.rpc("cast_election_ballot", {
    p_election_id: electionId,
    p_token_hash: hashToken(token),
    p_answers: answers.map((a) => ({ question_id: a.questionId, option_ids: a.optionIds })),
  });
  if (error) throw new Error(error.message);
}

// Used by the public vote page to know whether to show the ballot, an
// "already voted" message, or an "invalid link" message, without leaking
// anything about other voters.
export async function checkElectionToken(electionId: string, token: string) {
  const admin = createAdminClient();
  const { data } = await admin
    .from("election_voters")
    .select("voted_at")
    .eq("election_id", electionId)
    .eq("token_hash", hashToken(token))
    .maybeSingle();
  if (!data) return { valid: false as const, alreadyVoted: false };
  return { valid: true as const, alreadyVoted: !!data.voted_at };
}
