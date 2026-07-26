-- Alternative to attaching a receipt file in-app: the submitter can instead
-- confirm they've uploaded it to the event's shared Drive folder. When true,
-- receipt_path stays null (nothing stored in our Supabase Storage bucket).
alter table requests add column receipt_in_drive boolean not null default false;
