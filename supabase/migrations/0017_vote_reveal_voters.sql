-- Optional per-vote toggle, set at creation: whether individual voters'
-- choices are shown once the vote closes. Off by default (secret ballot).
-- Like options, this is only editable up until the first ballot is cast
-- (see app/voting/actions.ts) -- changing the disclosure rules after
-- someone has voted under the original terms wouldn't be fair to them.
alter table votes
  add column reveal_voters boolean not null default false;
