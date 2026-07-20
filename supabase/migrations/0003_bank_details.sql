-- EFT payout details (BSB + account number, AU bank transfer only).
-- Saved per user for prefill (bank_details) and snapshotted per request
-- (request_bank_details) so payment managers know where to send money.
-- Data minimisation, enforced in app code: the request copy is deleted
-- once the request is reimbursed, and the saved copy is deleted when a
-- role sync finds the user no longer holds any committee role.

create table bank_details (
  app_user_id uuid primary key references app_users (id) on delete cascade,
  bsb text not null check (bsb ~ '^\d{6}$'),
  account_number text not null check (account_number ~ '^\d{4,10}$'),
  updated_at timestamptz not null default now()
);

create table request_bank_details (
  request_id uuid primary key references requests (id) on delete cascade,
  bsb text not null check (bsb ~ '^\d{6}$'),
  account_number text not null check (account_number ~ '^\d{4,10}$'),
  created_at timestamptz not null default now()
);

create trigger bank_details_updated_at
  before update on bank_details
  for each row execute function set_updated_at();

alter table bank_details enable row level security;
alter table request_bank_details enable row level security;

-- Owner-only read, used to prefill the request form. All writes go
-- through server actions with the service role, so there are no
-- insert/update policies: deny by default.
create policy "read own bank details" on bank_details
  for select to authenticated
  using (app_user_id = current_app_user_id());

-- Only the submitter and payment managers can see where money goes.
-- Execs approve amounts, they do not need account numbers.
create policy "read request bank details" on request_bank_details
  for select to authenticated
  using (
    exists (
      select 1 from requests r
      where r.id = request_id and r.submitter_id = current_app_user_id()
    )
    or current_app_roles() && array['payment_manager']::app_role[]
  );
