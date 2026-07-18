-- Initial schema: allowlist, reimbursement requests, status history, receipts bucket.
-- Reads are governed by RLS below; all writes and status transitions go through
-- Next.js API routes using the service role key.

create type app_role as enum ('member', 'exec', 'treasurer');
create type request_status as enum ('pending', 'approved', 'paid', 'rejected');
create type request_category as enum ('food', 'equipment', 'venue', 'printing', 'other');

-- Committee allowlist. Rows are created by an admin before first sign-in;
-- auth_user_id is linked when the member first signs in with Discord.
create table app_users (
  id uuid primary key default gen_random_uuid(),
  discord_id text not null unique,
  discord_username text not null default '',
  display_name text not null default '',
  role app_role not null default 'member',
  is_admin boolean not null default false,
  auth_user_id uuid unique references auth.users (id) on delete set null,
  created_at timestamptz not null default now()
);

create table requests (
  id uuid primary key default gen_random_uuid(),
  submitter_id uuid not null references app_users (id),
  title text not null,
  description text not null default '',
  amount numeric(10, 2) not null check (amount > 0),
  category request_category not null,
  event_tag text not null default '',
  receipt_path text not null,
  status request_status not null default 'pending',
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

create index requests_submitter_idx on requests (submitter_id);
create index requests_status_idx on requests (status);
create index status_history_request_idx on status_history (request_id);

create function set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger requests_updated_at
  before update on requests
  for each row execute function set_updated_at();

-- RLS helpers: resolve the signed-in auth user to their allowlist row.
create function current_app_user_id() returns uuid
language sql stable security definer set search_path = public as $$
  select id from app_users where auth_user_id = auth.uid();
$$;

create function current_app_role() returns app_role
language sql stable security definer set search_path = public as $$
  select role from app_users where auth_user_id = auth.uid();
$$;

alter table app_users enable row level security;
alter table requests enable row level security;
alter table status_history enable row level security;

-- Any allowlisted user can read the allowlist (needed to show names/roles).
create policy "allowlisted can read users" on app_users
  for select to authenticated
  using (current_app_user_id() is not null);

-- Members see their own requests; exec and treasurer see all.
create policy "read requests" on requests
  for select to authenticated
  using (
    submitter_id = current_app_user_id()
    or current_app_role() in ('exec', 'treasurer')
  );

create policy "read status history" on status_history
  for select to authenticated
  using (
    exists (
      select 1 from requests r
      where r.id = request_id
        and (r.submitter_id = current_app_user_id()
             or current_app_role() in ('exec', 'treasurer'))
    )
  );

-- Private receipts bucket. Uploads land under receipts/{app_user_id}/...
insert into storage.buckets (id, name, public)
values ('receipts', 'receipts', false);

create policy "allowlisted upload receipts" on storage.objects
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
      or current_app_role() in ('exec', 'treasurer')
    )
  );
