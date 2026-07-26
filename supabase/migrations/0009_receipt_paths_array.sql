-- Support up to 3 receipt attachments per claim instead of just 1. Existing
-- single-receipt data is preserved by backfilling into the new array column
-- before the old column is dropped.
alter table requests add column receipt_paths text[] not null default '{}';
update requests set receipt_paths = array[receipt_path] where receipt_path is not null;
alter table requests drop column receipt_path;

alter table requests add constraint requests_receipt_paths_max3
  check (array_length(receipt_paths, 1) is null or array_length(receipt_paths, 1) <= 3);
