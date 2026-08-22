-- Attendance rosters, one per event. Students are recorded once in
-- attendance_members and reused across every event they attend: checking
-- someone in a second time is a search-and-select against the existing
-- roster, not re-entering their name and student number again. Any
-- signed-in committee or subcommittee member can view and edit any event's
-- attendance (unlike requests, this isn't submitter-scoped), matching the
-- "digital attendance form" use case in the brief.

create table attendance_members (
  id uuid primary key default gen_random_uuid(),
  full_name text not null,
  -- University of Melbourne student numbers are exactly 7 digits. Null for
  -- a non-student member (UMSU's own attendance form uses 'N/A' for this
  -- case, applied at the CSV export layer, not stored literally here).
  student_number text unique check (student_number ~ '^\d{7}$'),
  created_at timestamptz not null default now()
);

create index attendance_members_full_name_idx on attendance_members (full_name);

create table attendance_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  member_id uuid not null references attendance_members (id),
  checked_in_by uuid not null references app_users (id),
  created_at timestamptz not null default now(),
  unique (event_id, member_id)
);

create index attendance_entries_event_idx on attendance_entries (event_id);
create index attendance_entries_member_idx on attendance_entries (member_id);

alter table attendance_members enable row level security;
alter table attendance_entries enable row level security;

-- Reads only: all writes go through server actions using the service role
-- key, same as events/requests, so there are no insert/delete policies
-- here (deny by default for the RLS-scoped client).
create policy "roled can read attendance members" on attendance_members
  for select to authenticated
  using (current_app_roles() <> '{}');

create policy "roled can read attendance" on attendance_entries
  for select to authenticated
  using (current_app_roles() <> '{}');
