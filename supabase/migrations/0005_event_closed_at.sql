-- Track when an event was closed, so the events list can split into
-- open vs previous tabs and show "opened"/"closed" dates. created_at
-- already serves as the opened date. Cleared on reopen.
alter table events add column closed_at timestamptz;
