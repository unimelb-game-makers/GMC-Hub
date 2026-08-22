-- Attendance rosters, one per event. The event itself is the list: there's
-- no separate "attendance list" row, entries just reference event_id
-- directly. Any signed-in committee/subcommittee member can view and edit
-- any event's attendance (unlike requests, this isn't submitter-scoped),
-- matching the "digital attendance form" use case in the brief.

create table attendance_entries (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references events (id) on delete cascade,
  full_name text not null,
  student_number text,
  checked_in_by uuid not null references app_users (id),
  created_at timestamptz not null default now()
);

create index attendance_entries_event_idx on attendance_entries (event_id);
create index attendance_entries_student_number_idx on attendance_entries (student_number);

alter table attendance_entries enable row level security;

-- Reads only: all writes go through server actions using the service role
-- key, same as events/requests, so there are no insert/delete policies
-- here (deny by default for the RLS-scoped client).
create policy "roled can read attendance" on attendance_entries
  for select to authenticated
  using (current_app_roles() <> '{}');
