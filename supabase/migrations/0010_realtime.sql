-- Enable Realtime (Postgres change broadcasts over websocket) for the
-- tables that drive shared, multi-user views, so open tabs can refresh
-- automatically when someone else changes something instead of showing
-- stale data until a manual reload. Realtime respects each table's existing
-- RLS policies, so this doesn't expose anything the client couldn't already
-- read via a normal query.
alter publication supabase_realtime add table events;
alter publication supabase_realtime add table requests;
alter publication supabase_realtime add table status_history;
