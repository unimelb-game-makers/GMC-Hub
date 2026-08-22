-- Public elections: open to anyone with an emailed invite link, no Discord
-- sign-in. An election is a list of questions (each its own IRV race, e.g.
-- "President"), each with a list of options a voter ranks in order.
--
-- Ballot secrecy: election_voters tracks who was invited and whether they've
-- voted (to enforce one vote per invite and to allow resending a lost link),
-- but never links to what they voted for. election_ballots has no voter
-- reference at all, only a random per-question ballot_group that ties one
-- voter's ranked choices together for counting without identifying them.
-- Casting a vote goes through cast_election_ballot() below so the token
-- check, ballot insert, and marking the invite used all happen atomically:
-- a crash partway through can't leave a voter "half voted" and stuck.

create table elections (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text not null default '',
  created_by uuid not null references app_users (id),
  opens_at timestamptz,
  closes_at timestamptz not null,
  closed_early_at timestamptz,
  -- Seeds the tie-break random shuffle at count time, so a re-run of the
  -- count (an audit) reproduces the exact same result instead of a fresh
  -- coin flip every time the results page is loaded.
  tie_break_seed text not null default gen_random_uuid()::text,
  created_at timestamptz not null default now()
);

create table election_questions (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections (id) on delete cascade,
  title text not null,
  description text not null default '',
  display_order integer not null default 0
);

create table election_options (
  id uuid primary key default gen_random_uuid(),
  question_id uuid not null references election_questions (id) on delete cascade,
  label text not null,
  display_order integer not null default 0
);

create index election_questions_election_idx on election_questions (election_id);
create index election_options_question_idx on election_options (question_id);

-- One row per invited email. token_hash, never the raw token, so a DB leak
-- doesn't hand out working voting links. voted_at is set atomically with
-- the ballot insert in cast_election_ballot(), the only thing that stops a
-- token being used twice.
create table election_voters (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections (id) on delete cascade,
  email text not null,
  token_hash text not null unique,
  invited_at timestamptz not null default now(),
  voted_at timestamptz,
  unique (election_id, email)
);

create index election_voters_election_idx on election_voters (election_id);

create table election_ballots (
  id uuid primary key default gen_random_uuid(),
  election_id uuid not null references elections (id) on delete cascade,
  question_id uuid not null references election_questions (id) on delete cascade,
  option_id uuid not null references election_options (id),
  -- Random per voter per question (not shared across questions), so even
  -- the grouping key can't be used to link a voter's answers across an
  -- election's separate races.
  ballot_group uuid not null,
  rank integer not null check (rank >= 1),
  created_at timestamptz not null default now(),
  unique (question_id, ballot_group, rank),
  unique (question_id, ballot_group, option_id)
);

create index election_ballots_question_idx on election_ballots (question_id);
create index election_ballots_group_idx on election_ballots (ballot_group);

alter table elections enable row level security;
alter table election_questions enable row level security;
alter table election_options enable row level security;
alter table election_voters enable row level security;
alter table election_ballots enable row level security;

-- No policies: every read and write (both the exec-only admin side and the
-- token-gated public voting side) goes through the service role from
-- server actions, same as votes/requests/events. Public voters never hold
-- a Supabase Auth session at all, so RLS-scoped access isn't applicable to
-- them regardless.

-- Casts one voter's full ballot (all questions in the election, one
-- submission) atomically: validates the token identifies an unused invite
-- for an election that's currently open, that every option belongs to the
-- question it's claimed under, and that every question in the election was
-- answered, then inserts the ranked ballot rows and marks the invite used.
-- Raises (rolling back everything) on any violation, so a rejected
-- submission never leaves partial ballot rows behind.
create or replace function cast_election_ballot(
  p_election_id uuid,
  p_token_hash text,
  p_answers jsonb -- [{ "question_id": uuid, "option_ids": [uuid, ...] }, ...]
) returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_voter_id uuid;
  v_question_count integer;
  v_answered_count integer;
  v_answer jsonb;
  v_question_id uuid;
  v_option_ids uuid[];
  v_valid_option_count integer;
  v_group uuid;
begin
  select id into v_voter_id
  from election_voters
  where election_id = p_election_id
    and token_hash = p_token_hash
    and voted_at is null
  for update;

  if v_voter_id is null then
    raise exception 'Invalid or already-used voting link';
  end if;

  if not exists (
    select 1 from elections
    where id = p_election_id
      and (opens_at is null or opens_at <= now())
      and closed_early_at is null
      and closes_at > now()
  ) then
    raise exception 'This election is not currently open';
  end if;

  select count(*) into v_question_count
  from election_questions where election_id = p_election_id;
  v_answered_count := jsonb_array_length(p_answers);
  if v_answered_count <> v_question_count then
    raise exception 'Every question must be answered';
  end if;

  for v_answer in select * from jsonb_array_elements(p_answers)
  loop
    v_question_id := (v_answer ->> 'question_id')::uuid;
    if not exists (
      select 1 from election_questions
      where id = v_question_id and election_id = p_election_id
    ) then
      raise exception 'Question does not belong to this election';
    end if;

    select array_agg(value::uuid) into v_option_ids
    from jsonb_array_elements_text(v_answer -> 'option_ids');
    if v_option_ids is null or array_length(v_option_ids, 1) = 0 then
      raise exception 'Rank at least one option per question';
    end if;
    if array_length(v_option_ids, 1) <> (
      select count(distinct x) from unnest(v_option_ids) x
    ) then
      raise exception 'Duplicate option in ranking';
    end if;

    select count(*) into v_valid_option_count
    from election_options
    where question_id = v_question_id and id = any(v_option_ids);
    if v_valid_option_count <> array_length(v_option_ids, 1) then
      raise exception 'Invalid option for this question';
    end if;

    v_group := gen_random_uuid();
    insert into election_ballots (election_id, question_id, option_id, ballot_group, rank)
    select p_election_id, v_question_id, opt, v_group, ord
    from unnest(v_option_ids) with ordinality as t(opt, ord);
  end loop;

  update election_voters set voted_at = now() where id = v_voter_id;
end;
$$;

-- Creates an election together with every question and option in one
-- transaction, mirroring cast_election_ballot()'s atomicity: without this,
-- createElection's separate insert-per-question, insert-per-option calls
-- could fail partway through (a dropped connection, a transient DB error)
-- and leave a half-built election with some questions missing options, or
-- some questions missing entirely, and no way to detect or clean it up.
create or replace function create_election(
  p_title text,
  p_description text,
  p_created_by uuid,
  p_opens_at timestamptz,
  p_closes_at timestamptz,
  p_questions jsonb -- [{ "title": text, "description": text, "options": [text, ...] }, ...]
) returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_election_id uuid;
  v_question jsonb;
  v_question_id uuid;
  v_option text;
  v_q_index integer := 0;
  v_o_index integer;
begin
  if jsonb_array_length(p_questions) = 0 then
    raise exception 'Add at least one question';
  end if;

  insert into elections (title, description, created_by, opens_at, closes_at)
  values (p_title, p_description, p_created_by, p_opens_at, p_closes_at)
  returning id into v_election_id;

  for v_question in select * from jsonb_array_elements(p_questions)
  loop
    if jsonb_array_length(v_question -> 'options') < 2 then
      raise exception 'Every question needs at least 2 options';
    end if;

    insert into election_questions (election_id, title, description, display_order)
    values (
      v_election_id,
      v_question ->> 'title',
      coalesce(v_question ->> 'description', ''),
      v_q_index
    )
    returning id into v_question_id;

    v_o_index := 0;
    for v_option in select * from jsonb_array_elements_text(v_question -> 'options')
    loop
      insert into election_options (question_id, label, display_order)
      values (v_question_id, v_option, v_o_index);
      v_o_index := v_o_index + 1;
    end loop;

    v_q_index := v_q_index + 1;
  end loop;

  return v_election_id;
end;
$$;
