-- Voting booth: standalone from events/reimbursements. Only exec (the
-- Committee Discord role) can create a booth. Eligibility is a set of app
-- roles chosen per booth (empty = any signed-in member). Ballots are
-- amendable up until the vote closes: casting again for the same voter
-- replaces their previous choice(s) rather than adding to them (see
-- setBallots in app/voting/actions.ts). Status (upcoming/open/closed) and
-- the pass/fail result are computed at read time from timestamps and
-- ballot counts, not stored, since there's no scheduler in this project to
-- flip a stored status at closes_at.

create table votes (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  created_by uuid not null references app_users (id),
  -- Empty = anyone signed in with any role can vote.
  allowed_roles app_role[] not null default '{}',
  -- Whether a voter may select more than one option. Fixed at creation:
  -- changing it later would retroactively reinterpret existing ballots
  -- (a single choice under one rule isn't equivalent to "chose only one
  -- of several allowed" under the other), so the app never edits it.
  allow_multiple_choices boolean not null default false,
  -- Real timestamptz: unlike an event's display-only starts_at, these
  -- gate actual voting eligibility against the current instant, so they
  -- need proper UTC comparison, not literal wall-clock text.
  opens_at timestamptz,
  closes_at timestamptz not null,
  closed_early_at timestamptz,
  created_at timestamptz not null default now()
);

create table vote_options (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references votes (id) on delete cascade,
  label text not null,
  display_order integer not null default 0
);

-- A voter can hold more than one row per vote only when that vote allows
-- multiple choices (enforced in app/voting/actions.ts, not here, since a
-- DB constraint can't conditionally reference another row's column); the
-- unique constraint just stops the same option being recorded twice for
-- the same voter.
create table vote_ballots (
  id uuid primary key default gen_random_uuid(),
  vote_id uuid not null references votes (id) on delete cascade,
  option_id uuid not null references vote_options (id),
  voter_id uuid not null references app_users (id),
  created_at timestamptz not null default now(),
  unique (vote_id, voter_id, option_id)
);

create index vote_options_vote_idx on vote_options (vote_id);
create index vote_ballots_vote_idx on vote_ballots (vote_id);
create index vote_ballots_option_idx on vote_ballots (option_id);

alter table votes enable row level security;
alter table vote_options enable row level security;
alter table vote_ballots enable row level security;

-- Anyone with a role can see every vote and its options, even one they're
-- not eligible to vote in (transparency: the membership can see a
-- financial motion is happening). Ballot secrecy while a vote is still
-- open is enforced at the app layer instead: pages only ever compute
-- aggregate tallies with the service role, and this policy only exposes a
-- voter's own ballot row, never anyone else's individual choice.
create policy "roled can read votes" on votes
  for select to authenticated
  using (current_app_roles() <> '{}');

create policy "roled can read vote options" on vote_options
  for select to authenticated
  using (current_app_roles() <> '{}');

create policy "read own ballot" on vote_ballots
  for select to authenticated
  using (voter_id = current_app_user_id());
