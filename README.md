# GMC Reimbursement Tracker

Internal web app for the University of Melbourne Game Maker Club (GMC) committee to manage reimbursement requests — from submission through approval to payment. Committee-only (~20 people), no public access.

## How It Works

### Authentication & Access

- Sign in with **Discord OAuth** (via Supabase Auth).
- Access is gated by **Discord roles in the club server** — anyone holding a mapped committee role gets in automatically; everyone else sees an "access denied" page. Roles re-sync on sign-in and refresh automatically (10-minute TTL), so committee turnover is handled entirely in Discord.

### Roles

| Role | Mapped from Discord | Permissions |
|------|--------------------|-------------|
| **Member** | Subcommittee or Committee | Submit spend requests, submit claims with receipts, view own requests |
| **Exec** | Committee | Member permissions + approve/reject spend requests and claims (rejection reason required) |
| **Payment Manager** | Payment Manager | Create/close events, confirm reimbursements paid out |

A user can hold multiple roles — e.g. everyone with the Committee Discord role is both a Member and an Exec.

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

⚠ Exec approval to spend isn't the final word — the app reminds both parties that **committee approval is needed before making the payment**.

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
- **Database, Auth & File Storage:** [Supabase](https://supabase.com/) — Postgres, Discord OAuth, Storage for receipts
- **Hosting:** [Vercel](https://vercel.com/) (free tier)
- **Notifications & role sync:** The club's Discord bot (token in env vars), called via the Discord REST API from Next.js server code

## Design Goals

- Clean, minimal, **mobile-friendly** UI — committee members aren't necessarily technical
- The dashboard makes the required action per role immediately obvious (e.g. "You have 2 requests awaiting approval")
- Status badges and history logs so anyone can see exactly where a request sits
- Submit → approve → pay in as few clicks as possible

## Development

```bash
npm install
cp .env.example .env   # fill in Supabase + Discord credentials
npm run dev            # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`.

### Wiping test data

```bash
npm run wipe -- --yes
```

Deletes **all** app data from the Supabase project in `.env` — table rows, receipt files, and auth users. Schema and policies are untouched; users are recreated on next sign-in. The `--yes` flag is required as a safety guard. ⚠ Once real committee data exists, this erases it too.