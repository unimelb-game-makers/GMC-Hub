import type { Role } from "@/lib/types";

// Discord REST helpers, server-only. Role sync requires the bot to be in the
// guild with the Server Members Intent enabled.

const API = "https://discord.com/api/v10";

// Local dev runs against real Discord roles (auth needs them) but must never
// actually notify real people. Role sync (fetchGuildMember) is unaffected.
const NOTIFICATIONS_ENABLED = process.env.DISCORD_NOTIFICATIONS_ENABLED !== "false";

// While testing in production: channel messages still post and still show
// the role name as text, but Discord won't actually ping the role's members.
// Flip DISCORD_MENTIONS_ENABLED back to unset/"true" once testing is done.
const MENTIONS_ENABLED = process.env.DISCORD_MENTIONS_ENABLED !== "false";

function botHeaders() {
  return {
    Authorization: `Bot ${process.env.DISCORD_BOT_TOKEN!}`,
    "Content-Type": "application/json",
  };
}

export interface GuildMember {
  roleIds: string[];
  displayName: string;
  username: string;
}

// Returns null when the user isn't in the guild (or the ID is unknown).
export async function fetchGuildMember(
  discordId: string
): Promise<GuildMember | null> {
  const res = await fetch(
    `${API}/guilds/${process.env.DISCORD_GUILD_ID}/members/${discordId}`,
    { headers: botHeaders(), cache: "no-store" }
  );
  if (res.status === 404) return null;
  if (!res.ok) {
    throw new Error(`Discord member fetch failed: ${res.status}`);
  }
  const member = await res.json();
  return {
    roleIds: member.roles ?? [],
    displayName: member.nick ?? member.user?.global_name ?? "",
    username: member.user?.username ?? "",
  };
}

// Notification failures never block a status transition, but they're always
// logged (console.error, visible in Vercel's function logs) so a silent
// Discord-side failure doesn't look identical to "everything's fine."
export async function sendChannelMessage(content: string) {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const res = await fetch(
      `${API}/channels/${process.env.DISCORD_NOTIFICATION_CHANNEL_ID}/messages`,
      {
        method: "POST",
        headers: botHeaders(),
        body: JSON.stringify({
          content,
          allowed_mentions: { parse: MENTIONS_ENABLED ? ["roles"] : [] },
        }),
      }
    );
    if (!res.ok) {
      console.error("sendChannelMessage failed:", res.status, await res.text());
    }
  } catch (err) {
    console.error("sendChannelMessage threw:", err);
  }
}

export async function sendDirectMessage(discordId: string, content: string) {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const res = await fetch(`${API}/users/@me/channels`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ recipient_id: discordId }),
    });
    if (!res.ok) {
      console.error("sendDirectMessage: open DM channel failed:", res.status, await res.text());
      return;
    }
    const channel = await res.json();
    const msgRes = await fetch(`${API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ content }),
    });
    if (!msgRes.ok) {
      console.error("sendDirectMessage: send failed:", msgRes.status, await msgRes.text());
    }
  } catch (err) {
    console.error("sendDirectMessage threw:", err);
  }
}

// A space right after "@" breaks Discord's mention syntax entirely, so the
// role name never actually pings, regardless of allowed_mentions handling.
// Revert to the real `<@&ID>` form once testing is done.
export const committeeMention = () =>
  MENTIONS_ENABLED
    ? `<@&${process.env.DISCORD_COMMITTEE_ROLE_ID}>`
    : `<@ &${process.env.DISCORD_COMMITTEE_ROLE_ID}>`;
export const paymentManagerMention = () =>
  MENTIONS_ENABLED
    ? `<@&${process.env.DISCORD_PAYMENT_MANAGER_ROLE_ID}>`
    : `<@ &${process.env.DISCORD_PAYMENT_MANAGER_ROLE_ID}>`;

// A discrete masked link appended to notifications so the reader can jump
// straight to the request instead of opening the app and hunting for it.
// Discord renders `[label](url)` as a plain clickable word in normal
// message content, not just inside embeds. Degrades to nothing if APP_URL
// isn't set (e.g. local dev, where notifications are off anyway).
export function requestLink(requestId: string, label = "View"): string {
  const base = process.env.APP_URL;
  return base ? ` · [${label}](${base}/requests/${requestId})` : "";
}

// subcommittee/committee -> member, committee -> exec, plus payment_manager.
export function mapDiscordRoles(roleIds: string[]): Role[] {
  const has = (env: string | undefined) => !!env && roleIds.includes(env);
  const roles: Role[] = [];
  if (
    has(process.env.DISCORD_SUBCOMMITTEE_ROLE_ID) ||
    has(process.env.DISCORD_COMMITTEE_ROLE_ID)
  ) {
    roles.push("member");
  }
  if (has(process.env.DISCORD_COMMITTEE_ROLE_ID)) roles.push("exec");
  if (has(process.env.DISCORD_PAYMENT_MANAGER_ROLE_ID)) {
    roles.push("payment_manager");
  }
  return roles;
}
