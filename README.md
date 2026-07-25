# GMC Reimbursement Tracker

Internal web app for the University of Melbourne Game Maker Club (GMC) committee to manage reimbursement requests from submission through approval to payment. Committee-only, no public access.

## How It Works

### Authentication & Access

- Sign in with **Discord OAuth** (via Supabase Auth).
- Access is gated by **Discord roles in the club server**: anyone holding a mapped committee role gets in automatically. Roles re-sync on sign-in and refresh automatically (10-minute TTL), so committee turnover is handled entirely in Discord.

### Roles

| Role | Mapped from Discord | Permissions |
|------|--------------------|-------------|
| **Member** | Subcommittee or Committee | Submit spend requests, submit claims with receipts, view own requests |
| **Exec** | Committee | Member permissions + approve/reject spend requests and claims (rejection reason required) |
| **Payment Manager** | Payment Manager | Create/close events, confirm reimbursements paid out |

A user can hold multiple roles, e.g. everyone with the Committee Discord role is both a Member and an Exec.

### Reimbursement Lifecycle

```
Payment Manager creates an Event
        │
Member ─┴─▶ Pending approval ──exec approves──▶ Approved to pay ⚠
                   ▲ │                                │ member pays &
      resubmit     │ │ reject (reason)                ▼ submits claim
    (either stage) │ ▼                          Claim submitted
                 Rejected ◀──reject (reason)──────────┤
                                                      │ exec approves
                                                      ▼
                       Reimbursed ◀──payment manager──Claim approved
                                      confirms
```

Exec approval to spend isn't the final word, the app reminds both parties that **committee approval is needed before making the payment**.

Each request belongs to an event and holds a title, description, estimated and claimed amounts (AUD), category (food / equipment / venue / printing / other), a receipt attachment (PDF or image, added at claim time), and a full status history log of who did what and when.

### Discord Notifications

The club's Discord bot posts to the committee channel or DMs the submitter on every transition:

- **Spend request submitted / resubmitted** → ping the Committee role
- **Spend approved** → DM the submitter (with the committee-approval reminder)
- **Claim submitted** → ping the Committee role
- **Claim approved** → ping the Payment Manager role
- **Reimbursed** → DM the submitter ("You've been reimbursed!")
- **Rejected** → DM the submitter with the rejection reason

## Tech Stack

- **Frontend + API:** [Next.js](https://nextjs.org/) (App Router) with [TypeScript](https://www.typescriptlang.org/)
- **Database, Auth & File Storage:** [Supabase](https://supabase.com/): Postgres, Discord OAuth, Storage for receipts
- **Hosting:** [Vercel](https://vercel.com/) (free tier)
- **Notifications & role sync:** The club's Discord bot (token in env vars), called via the Discord REST API from Next.js server code

## Development

Local dev runs against a local Supabase stack (Docker via the Supabase CLI), never the production project. This keeps local testing fully isolated from real committee data.

```bash
brew install supabase/tap/supabase   # once
npm install
supabase init                        # once, scaffolds supabase/config.toml
supabase start                       # boots local Postgres/Auth/Storage, prints local URL + keys
supabase db reset                    # applies all migrations to the fresh local DB
```

Copy `.env.example` to `.env` and fill in:
- The Supabase values from `supabase start`'s output (not the production project's).
- Your Discord bot/guild/role IDs, same values as production, they describe the real Discord server.
- `DISCORD_NOTIFICATIONS_ENABLED=false`, so local testing never pings the real channel or DMs a real committee member. Role sync still works normally with this set: only outgoing notifications are silenced.

The Discord OAuth app needs the local callback URL (from `supabase start`'s output, typically `http://127.0.0.1:54321/auth/v1/callback`) added to its redirect URI list, and the local Supabase project's Auth settings need the Discord provider enabled with Site URL `http://localhost:3000`.

```bash
npm run dev
```

Other scripts: `npm run build`, `npm run lint`.

### Wiping test data

```bash
supabase db reset
```

Resets the local database to a clean slate with all migrations reapplied. `npm run wipe -- --yes` (see `scripts/wipe-test-data.mjs`) also exists for clearing a hosted project without a full reset, but should never be pointed at production once real committee data exists.

## Deployment

Hosted on Vercel, linked to this GitHub repo. Pushing to `main` deploys to production; every other branch and PR gets a Vercel Preview deployment, which has no database to talk to (there's no second hosted Supabase project) and isn't meant to be used for testing.

Production env vars (Vercel Project Settings, Production environment only) point at the one hosted Supabase project and the real Discord bot/guild/role IDs, with `DISCORD_NOTIFICATIONS_ENABLED` left unset so it defaults to on.

New migrations: test locally first (`supabase db reset` against the new file), then run the same SQL by hand against the production project via its SQL editor.