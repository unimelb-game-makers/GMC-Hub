-- Add account name (the name on the bank account) alongside BSB + account
-- number, so payment managers can verify the payout matches the submitter
-- before sending money. PayID rows stay null, same pattern as bsb/account_number.
--
-- Existing bank_transfer rows predate this field, so they're backfilled with
-- a placeholder before the not-null check is added — otherwise the check
-- would reject rows that already exist in production.

alter table bank_details
  add column account_name text;

update bank_details
  set account_name = 'Not recorded'
  where payment_method = 'bank_transfer' and account_name is null;

alter table bank_details
  drop constraint bank_details_method_fields;

alter table bank_details
  add constraint bank_details_method_fields check (
    (payment_method = 'payid' and payid is not null and bsb is null and account_number is null and account_name is null)
    or
    (payment_method = 'bank_transfer' and bsb is not null and account_number is not null and account_name is not null and payid is null)
  );

alter table request_bank_details
  add column account_name text;

update request_bank_details
  set account_name = 'Not recorded'
  where payment_method = 'bank_transfer' and account_name is null;

alter table request_bank_details
  drop constraint request_bank_details_method_fields;

alter table request_bank_details
  add constraint request_bank_details_method_fields check (
    (payment_method = 'payid' and payid is not null and bsb is null and account_number is null and account_name is null)
    or
    (payment_method = 'bank_transfer' and bsb is not null and account_number is not null and account_name is not null and payid is null)
  );
