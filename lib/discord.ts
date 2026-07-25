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

// Notification failures are swallowed, a missed ping must never block a
// status transition.
export async function sendChannelMessage(content: string) {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    await fetch(
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
  } catch {}
}

export async function sendDirectMessage(discordId: string, content: string) {
  if (!NOTIFICATIONS_ENABLED) return;
  try {
    const res = await fetch(`${API}/users/@me/channels`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ recipient_id: discordId }),
    });
    if (!res.ok) return;
    const channel = await res.json();
    await fetch(`${API}/channels/${channel.id}/messages`, {
      method: "POST",
      headers: botHeaders(),
      body: JSON.stringify({ content }),
    });
  } catch {}
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
