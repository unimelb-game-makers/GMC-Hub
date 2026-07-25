-- Add PayID as an alternative payout method to BSB + account number.
-- Each row picks one method via payment_method; the fields for the other
-- method stay null, enforced by a check constraint.

alter table bank_details
  add column payment_method text not null default 'bank_transfer' check (payment_method in ('payid', 'bank_transfer')),
  add column payid text,
  alter column bsb drop not null,
  alter column account_number drop not null;

alter table bank_details
  add constraint bank_details_method_fields check (
    (payment_method = 'payid' and payid is not null and bsb is null and account_number is null)
    or
    (payment_method = 'bank_transfer' and bsb is not null and account_number is not null and payid is null)
  );

alter table request_bank_details
  add column payment_method text not null default 'bank_transfer' check (payment_method in ('payid', 'bank_transfer')),
  add column payid text,
  alter column bsb drop not null,
  alter column account_number drop not null;

alter table request_bank_details
  add constraint request_bank_details_method_fields check (
    (payment_method = 'payid' and payid is not null and bsb is null and account_number is null)
    or
    (payment_method = 'bank_transfer' and bsb is not null and account_number is not null and payid is null)
  );
