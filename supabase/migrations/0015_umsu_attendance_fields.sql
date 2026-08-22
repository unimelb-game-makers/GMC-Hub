-- Fields needed to export a UMSU-compliant attendance CSV (club name,
-- date/time, venue, event type up top; course and club membership per
-- student). All new columns are nullable so existing events/production
-- data are untouched — only new events are required (at the app layer) to
-- fill them in, and existing events can be edited afterwards to backfill
-- them if the committee wants to export their attendance too.

create type event_type as enum ('function', 'camp', 'excursion', 'other');

-- Plain "timestamp without time zone": this is a paperwork field the
-- committee types in and reads back verbatim (matching the paper form's
-- Date/Time columns), not used in any time-based logic, so storing and
-- displaying it as literal wall-clock text sidesteps timezone conversion
-- entirely (which would otherwise need care around Melbourne's DST and
-- server functions typically running in UTC).
alter table events
  add column starts_at timestamp,
  add column venue text,
  add column event_types event_type[] not null default '{}',
  add column event_type_other_details text;

-- Course and club membership are recorded on the roster (like name and
-- student number, reused across events, editable if it changes), not
-- re-asked at every check-in. Course follows the university's degree code
-- convention: all caps, at least one dash (B-SCI, BH-ARTS, DR-PHILSCI, ...).
alter table attendance_members
  add column course text check (course ~ '^[A-Z]+-[A-Z]+$'),
  add column is_club_member boolean not null default false;
