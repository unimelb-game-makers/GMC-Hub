-- Tighten account_number to 6-9 digits (was 4-10), matching real AU bank
-- account number lengths. BSB is already exactly 6 digits, unchanged.
-- Verified against production data first: every existing account_number is
-- 8 or 9 digits, so this doesn't reject anything already stored.

alter table bank_details
  drop constraint bank_details_account_number_check;
alter table bank_details
  add constraint bank_details_account_number_check
    check (account_number ~ '^\d{6,9}$');

alter table request_bank_details
  drop constraint request_bank_details_account_number_check;
alter table request_bank_details
  add constraint request_bank_details_account_number_check
    check (account_number ~ '^\d{6,9}$');
