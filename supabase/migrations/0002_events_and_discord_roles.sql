-- Rework to the event-based workflow with Discord-derived roles.
-- 0001's allowlist model is dropped wholesale — no real data exists yet.
-- Roles: member (subcommittee/committee Discord role), exec (committee),
-- payment_manager. A user can hold several; access = at least one role.

drop policy "read receipts" on storage.objects;
drop policy "allowlisted upload receipts" on storage.objects;
drop policy "read status history" on status_history;
drop policy "read requests" on requests;
drop policy "allowlisted can read users" on app_users;
drop table status_history;
drop table requests;
drop table app_users;
drop function current_app_role();
drop function current_app_user_id();
drop type app_role;
drop type request_status;

create type app_role as enum ('member', 'exec', 'payment_manager');
create type request_status as enum (
  'pending_approval',
  'approved',
  'claim_submitted',
  'claim_approved',
  'reimbursed',
  'rejected'
);

-- Rows are created/updated on sign-in from Discord guild roles.
-- Empty roles means access denied (kept for history/FK integrity).
create table app_users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  discord_username text not null default '',
  display_name text not null default '',
  roles app_role[] not null default '{}',
  roles_synced_at timestamptz not null default now(),
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  created_by uuid not null references app_users (id),
  is_open boolean not null default true,
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id),
  submitter_id uuid not null references app_users (id),
  title text not null,
  description text not null default '',
  amount_estimated numeric(10, 2) not null check (amount_estimated > 0),
  amount_claimed numeric(10, 2) check (amount_claimed > 0),
  category request_category not null,
  receipt_path text,
  status request_status not null default 'pending_approval',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table status_history (
  id uuid primary key default gen_random_uuid(),
  request_id uuid not null references requests (id) on delete cascade,
  actor_id uuid not null references app_users (id),
  from_status request_status,
  to_status request_status not null,
  note text,
  paid_at timestamptz,
  created_at timestamptz not null default now()
);

create index requests_event_idx on requests (event_id);
create index requests_submitter_idx on requests (submitter_id);
create index requests_status_idx on requests (status);
create index status_history_request_idx on status_history (request_id);

create trigger requests_updated_at
  before update on requests
  for each row execute function set_updated_at();

-- RLS helpers: resolve the signed-in auth user to their app row / roles.
create function current_app_user_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from app_users where auth_user_id = auth.uid();
$$;

create function current_app_roles() returns app_role[]
language sql stable security definer set search_path = public as $$
  select coalesce(
    (select roles from app_users where auth_user_id = auth.uid()),
    '{}'
  );
$$;

alter table app_users enable row level security;
alter table events enable row level security;
alter table requests enable row level security;
alter table status_history enable row level security;

-- Users can always read their own row (access gate needs it even with no
-- roles); anyone with a role can read the rest (names on requests/events).
create policy "read users" on app_users
  for select to authenticated
  using (auth_user_id = auth.uid() or current_app_roles() <> '{}');

create policy "roled can read events" on events
  for select to authenticated
  using (current_app_roles() <> '{}');

-- Members see their own requests; exec and payment_manager see all.
create policy "read requests" on requests
  for select to authenticated
  using (
    submitter_id = current_app_user_id()
    or current_app_roles() && array['exec', 'payment_manager']::app_role[]
  );

create policy "read status history" on status_history
  for select to authenticated
  using (
    exists (
      select 1 from requests r
      where r.id = request_id
        and (r.submitter_id = current_app_user_id()
             or current_app_roles() && array['exec', 'payment_manager']::app_role[])
    )
  );

-- Receipts bucket (created in 0001). Uploads land under receipts/{app_user_id}/...
create policy "roled upload receipts" on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = current_app_user_id()::text
  );

create policy "read receipts" on storage.objects
  for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = current_app_user_id()::text
      or current_app_roles() && array['exec', 'payment_manager']::app_role[]
    )
  );
