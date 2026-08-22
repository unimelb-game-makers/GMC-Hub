import { Resend } from "resend";

// Election invites are the only thing in the app sent by email (everything
// else goes through Discord). Optional like the Discord bot config: if no
// key is set, sends are skipped and logged rather than throwing, so the
// rest of the app keeps working while Resend is being set up.
const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.RESEND_FROM_EMAIL || "onboarding@resend.dev";

let resend: Resend | null = null;
function client(): Resend | null {
  if (!RESEND_API_KEY) return null;
  if (!resend) resend = new Resend(RESEND_API_KEY);
  return resend;
}

export interface ElectionInviteEmail {
  to: string;
  electionTitle: string;
  voteUrl: string;
}

// Resend's batch endpoint accepts up to 100 personalised emails per call.
const BATCH_SIZE = 100;

// Returns the list of emails that failed to send, so the caller can report
// which invites need retrying instead of assuming a blanket success.
export async function sendElectionInvites(
  invites: ElectionInviteEmail[]
): Promise<{ sent: number; failed: string[] }> {
  const resendClient = client();
  if (!resendClient) {
    console.error(
      `sendElectionInvites: RESEND_API_KEY not set, skipped ${invites.length} invite(s)`
    );
    return { sent: 0, failed: invites.map((i) => i.to) };
  }

  const failed: string[] = [];
  let sent = 0;

  for (let i = 0; i < invites.length; i += BATCH_SIZE) {
    const batch = invites.slice(i, i + BATCH_SIZE);
    try {
      const { data, error } = await resendClient.batch.send(
        batch.map((invite) => ({
          from: FROM_EMAIL,
          to: invite.to,
          subject: `You're invited to vote: ${invite.electionTitle}`,
          html: inviteHtml(invite),
          text: inviteText(invite),
        }))
      );
      if (error) {
        console.error("sendElectionInvites batch failed:", error);
        failed.push(...batch.map((b) => b.to));
      } else {
        sent += data?.data?.length ?? batch.length;
      }
    } catch (err) {
      console.error("sendElectionInvites batch threw:", err);
      failed.push(...batch.map((b) => b.to));
    }
  }

  return { sent, failed };
}

function inviteText({ electionTitle, voteUrl }: ElectionInviteEmail): string {
  return [
    `You're invited to vote in "${electionTitle}".`,
    "",
    `Vote here: ${voteUrl}`,
    "",
    "This link is unique to you and can only be used once. Don't share it, anyone with the link can cast your vote.",
    "Your vote is anonymous: once it's submitted, there's no way to trace it back to you.",
  ].join("\n");
}

function inviteHtml({ electionTitle, voteUrl }: ElectionInviteEmail): string {
  return `
    <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto; color: #171614;">
      <h1 style="font-size: 18px;">You're invited to vote</h1>
      <p><strong>${escapeHtml(electionTitle)}</strong></p>
      <p>
        <a href="${voteUrl}" style="display: inline-block; background: #efae73; color: #171614; padding: 10px 20px; border-radius: 6px; text-decoration: none; font-weight: 600;">
          Cast your vote
        </a>
      </p>
      <p style="font-size: 13px; color: #555;">
        This link is unique to you and can only be used once. Don't share it,
        anyone with the link can cast your vote. Your vote is anonymous: once
        it's submitted, there's no way to trace it back to you.
      </p>
    </div>
  `;
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
