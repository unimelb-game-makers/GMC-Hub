-- Self check-in: a shareable, no-sign-in-required link (and QR code) per
-- event, so attendees can check themselves in from their own phone without
-- finding the event in the app or having a Discord account. checked_in_by
-- becomes nullable to represent this: an entry with no checked_in_by was
-- self-submitted by the attendee, one with a value was entered by a
-- signed-in committee/subcommittee member on their behalf, same as today.
alter table attendance_entries
  alter column checked_in_by drop not null;
