-- How an attendee heard about the specific event they're checking into,
-- for the committee's own outreach/marketing tracking. Per check-in, not
-- per person: the same returning member can hear about different events
-- through different channels, so this lives on attendance_entries, not
-- attendance_members. Nullable since it doesn't apply to historical rows
-- recorded before this existed; the app requires it going forward for
-- every new check-in regardless of entry method.
create type event_discovery_source as enum (
  'discord',
  'instagram',
  'newsletter',
  'another_club',
  'umsu_website',
  'friend',
  'other'
);

alter table attendance_entries
  add column found_via event_discovery_source,
  add column found_via_other_details text;
