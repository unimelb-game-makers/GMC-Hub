# GMC Reimbursement Tracker

Internal web app for the University of Melbourne Game Maker Club (GMC) committee to manage reimbursement requests — from submission through approval to payment. Committee-only (~20 people), no public access.

## How It Works

### Authentication & Access

- Sign in with **Discord OAuth** (via Supabase Auth).
- Access is gated by a **manually managed allowlist** in the database — users not on it see an "access denied" page. No Discord server membership checks.

### Roles

| Role | Permissions |
|------|-------------|
| **Member** | Submit requests, upload receipts, view/manage own requests |
| **Exec** | Member permissions + approve/reject any request (optional note) |
| **Treasurer** | Exec permissions + mark approved requests as paid (optional payment note and date) |

An **Admin** flag (holdable alongside any role) grants access to the user-management UI: adding/removing committee members and assigning roles.

### Reimbursement Lifecycle

```
          submit                approve                mark paid
Member ─────────▶ Pending ─────────────▶ Approved ─────────────▶ Paid
                    ▲  │
        resubmit    │  │ reject (reason required)
        (revised)   │  ▼
                  Rejected
```

Each request holds a title, description, amount (AUD), category (food / equipment / venue / printing / other), an event tag (e.g. "Semester 1 Game Jam"), a receipt attachment (PDF or image), and a full status history log of who did what and when.

### Discord Notifications

The club's existing Discord bot posts to a committee channel on every transition:

- **Submitted** → ping the Exec role
- **Approved** → ping the Treasurer role + DM the submitter
- **Rejected** → DM the submitter with the rejection reason
- **Paid** → DM the submitter ("You've been reimbursed! 🎉")

## Tech Stack

- **Frontend + API:** [Next.js](https://nextjs.org/) (App Router) with [TypeScript](https://www.typescriptlang.org/)
- **Database, Auth & File Storage:** [Supabase](https://supabase.com/) — Postgres, Discord OAuth, Storage for receipts
- **Hosting:** [Vercel](https://vercel.com/) (free tier)
- **Notifications:** Existing Discord bot (bot token / webhook), called from Next.js API routes; credentials in environment variables

## Design Goals

- Clean, minimal, **mobile-friendly** UI — committee members aren't necessarily technical
- The dashboard makes the required action per role immediately obvious (e.g. "You have 2 requests awaiting approval")
- Status badges and history logs so anyone can see exactly where a request sits
- Submit → approve → pay in as few clicks as possible

## Development

```bash
npm install
cp .env.example .env.local   # fill in Supabase + Discord credentials
npm run dev                  # http://localhost:3000
```

Other scripts: `npm run build`, `npm run lint`.

## Maintenance

Designed for near-zero upkeep. The only recurring task is the Admin updating the committee allowlist and roles at the start/end of each semester, via a simple user-management table.

## Status

🚧 Base template scaffolded (Next.js + TypeScript + Tailwind) — app features not yet implemented.
