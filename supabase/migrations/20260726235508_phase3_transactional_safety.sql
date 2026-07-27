-- Phase 3 transactional correctness and safety.
-- This migration is additive and data preserving. It deliberately contains no
-- production-data purge.

begin;

-- ---------------------------------------------------------------------------
-- Immutable result history and private idempotency receipts
-- ---------------------------------------------------------------------------

create table public.game_result_versions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  -- NO ACTION blocks direct player deletion from erasing immutable history.
  -- Unlike RESTRICT, it is checked after the confirmed league deletion
  -- statement has cascaded through games and removed their versions.
  player_id uuid not null references public.players(id) on delete no action,
  version integer not null check (version > 0),
  correction_of_id uuid references public.game_result_versions(id) on delete cascade,
  finish_position integer not null check (finish_position > 0),
  entry_minor bigint not null check (entry_minor >= 0),
  reentry_count integer not null default 0 check (reentry_count >= 0),
  reentry_total_minor bigint not null default 0 check (reentry_total_minor >= 0),
  add_on_count integer not null default 0 check (add_on_count >= 0),
  add_on_total_minor bigint not null default 0 check (add_on_total_minor >= 0),
  bounty_minor bigint not null default 0 check (bounty_minor >= 0),
  payout_minor bigint not null default 0 check (payout_minor >= 0),
  total_buy_in_minor bigint generated always as (
    entry_minor + reentry_total_minor + add_on_total_minor
  ) stored,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  transaction_ids uuid[] not null default '{}'::uuid[],
  is_post_finalization boolean not null default false,
  idempotency_key text not null check (btrim(idempotency_key) <> ''),
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  unique (game_id, player_id, version),
  unique (created_by, idempotency_key),
  unique (correction_of_id),
  check (
    (reentry_count = 0 and reentry_total_minor = 0)
    or (reentry_count > 0 and reentry_total_minor > 0)
  ),
  check (
    (add_on_count = 0 and add_on_total_minor = 0)
    or (add_on_count > 0 and add_on_total_minor > 0)
  )
);

create index game_result_versions_latest_idx
  on public.game_result_versions (game_id, player_id, version desc);

alter table public.game_result_versions enable row level security;

create policy game_result_versions_select
on public.game_result_versions
for select to authenticated
using (
  private.can_access_game(game_id)
  or private.owns_player(player_id)
);

grant select on table public.game_result_versions to authenticated;
grant select, insert, update, delete on table public.game_result_versions
  to service_role;

create table private.league_deletion_receipts (
  actor_id uuid not null,
  idempotency_key text not null,
  league_id uuid not null,
  confirmation_name text not null,
  deleted_at timestamptz not null,
  primary key (actor_id, idempotency_key)
);

create table private.tournament_clock_command_receipts (
  actor_id uuid not null,
  idempotency_key text not null,
  game_id uuid not null,
  command text not null,
  expected_revision bigint not null,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, idempotency_key)
);

create table private.staking_allocation_receipts (
  actor_id uuid not null,
  idempotency_key text not null,
  deal_id uuid not null,
  session_id uuid not null,
  allocated_buy_in_minor bigint not null,
  total_result_minor bigint not null,
  expected_makeup_minor bigint not null,
  notes text,
  result jsonb not null,
  created_at timestamptz not null default now(),
  primary key (actor_id, idempotency_key)
);

create table private.result_mutation_contexts (
  backend_pid integer primary key,
  actor_id uuid not null,
  game_id uuid not null,
  created_at timestamptz not null default now()
);

create table private.game_finalization_contexts (
  backend_pid integer primary key,
  actor_id uuid not null,
  game_id uuid not null,
  created_at timestamptz not null default now()
);

alter table public.settlements
  add column if not exists revision bigint not null default 1
    check (revision > 0);

create table private.settlement_mutation_events (
  owner_id uuid not null
    references auth.users(id) on delete cascade,
  idempotency_key text not null,
  settlement_id uuid not null
    references public.settlements(id) on delete cascade,
  event_type text not null
    check (event_type in ('status_transition', 'confirmation_attachment')),
  expected_revision bigint not null,
  from_status public.settlement_status,
  to_status public.settlement_status,
  confirmation_path text,
  result jsonb not null,
  occurred_at timestamptz not null,
  primary key (owner_id, idempotency_key),
  check (
    (
      event_type = 'status_transition'
      and from_status is not null
      and to_status is not null
      and confirmation_path is null
    )
    or (
      event_type = 'confirmation_attachment'
      and from_status is null
      and to_status is null
      and confirmation_path is not null
    )
  )
);

revoke all on table
  private.league_deletion_receipts,
  private.tournament_clock_command_receipts,
  private.staking_allocation_receipts,
  private.result_mutation_contexts,
  private.game_finalization_contexts,
  private.settlement_mutation_events
from public, anon, authenticated;

grant select, insert, update, delete on table
  private.league_deletion_receipts,
  private.tournament_clock_command_receipts,
  private.staking_allocation_receipts,
  private.result_mutation_contexts,
  private.game_finalization_contexts
to service_role;

grant select, insert on table private.settlement_mutation_events
  to service_role;

alter table public.game_transactions
  drop constraint if exists game_transactions_reversal_of_id_fkey;
alter table public.game_transactions
  add constraint game_transactions_reversal_of_id_fkey
  foreign key (reversal_of_id)
  references public.game_transactions(id)
  on delete cascade;

alter table public.games
  drop constraint if exists games_scoring_rule_id_fkey;
alter table public.games
  add constraint games_scoring_rule_id_fkey
  foreign key (scoring_rule_id)
  references public.league_scoring_rules(id)
  deferrable initially deferred;

-- A career expense may only inherit context from a trip/session in the same
-- currency. Child and parent triggers keep that cross-table invariant true
-- regardless of which side an authenticated owner edits.
do $$
begin
  if exists (
    select 1
    from public.career_expenses as expense
    join public.poker_trips as trip
      on trip.id = expense.trip_id
    where trip.owner_id = expense.owner_id
      and trip.currency <> expense.currency
  ) or exists (
    select 1
    from public.career_expenses as expense
    join public.career_sessions as session
      on session.id = expense.session_id
    where session.owner_id = expense.owner_id
      and session.currency <> expense.currency
  ) then
    raise exception 'Existing career expenses have mismatched linked currencies'
      using errcode = '23514';
  end if;
end;
$$;

create or replace function private.validate_career_expense_currency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.trip_id is not null and exists (
    select 1
    from public.poker_trips as trip
    where trip.id = new.trip_id
      and trip.owner_id = new.owner_id
      and trip.currency <> new.currency
  ) then
    raise exception 'Expense currency must match its trip currency'
      using errcode = '23514';
  end if;

  if new.session_id is not null and exists (
    select 1
    from public.career_sessions as session
    where session.id = new.session_id
      and session.owner_id = new.owner_id
      and session.currency <> new.currency
  ) then
    raise exception 'Expense currency must match its session currency'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

create or replace function private.validate_expense_parent_currency()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.currency is not distinct from old.currency then
    return new;
  end if;

  if tg_table_name = 'poker_trips' and exists (
    select 1
    from public.career_expenses as expense
    where expense.owner_id = new.owner_id
      and expense.trip_id = new.id
      and expense.currency <> new.currency
  ) then
    raise exception 'Trip currency must match its linked expenses'
      using errcode = '23514';
  end if;

  if tg_table_name = 'career_sessions' and exists (
    select 1
    from public.career_expenses as expense
    where expense.owner_id = new.owner_id
      and expense.session_id = new.id
      and expense.currency <> new.currency
  ) then
    raise exception 'Session currency must match its linked expenses'
      using errcode = '23514';
  end if;

  return new;
end;
$$;

revoke all on function private.validate_career_expense_currency()
  from public, anon, authenticated, service_role;
revoke all on function private.validate_expense_parent_currency()
  from public, anon, authenticated, service_role;

drop trigger if exists validate_career_expense_currency
  on public.career_expenses;
create trigger validate_career_expense_currency
before insert or update of owner_id, trip_id, session_id, currency
on public.career_expenses
for each row execute function private.validate_career_expense_currency();

drop trigger if exists validate_linked_expense_currency
  on public.poker_trips;
create trigger validate_linked_expense_currency
before update of currency on public.poker_trips
for each row execute function private.validate_expense_parent_currency();

drop trigger if exists validate_linked_expense_currency
  on public.career_sessions;
create trigger validate_linked_expense_currency
before update of currency on public.career_sessions
for each row execute function private.validate_expense_parent_currency();

-- Backfill an immutable version for legacy results. Existing transaction IDs
-- are retained so a later correction can reverse them without rewriting them.
insert into public.game_result_versions (
  game_id,
  player_id,
  version,
  correction_of_id,
  finish_position,
  entry_minor,
  reentry_count,
  reentry_total_minor,
  add_on_count,
  add_on_total_minor,
  bounty_minor,
  payout_minor,
  currency,
  transaction_ids,
  is_post_finalization,
  idempotency_key,
  created_by,
  created_at
)
select
  gr.game_id,
  gr.player_id,
  1,
  null,
  gr.finish_position,
  gr.total_buy_in_minor,
  0,
  0,
  0,
  0,
  0,
  gr.payout_minor,
  g.currency,
  coalesce(
    (
      select array_agg(gt.id order by gt.created_at, gt.id)
      from public.game_transactions as gt
      where gt.game_id = gr.game_id
        and gt.player_id = gr.player_id
        and gt.reversal_of_id is null
        and gt.effect_multiplier = 1
    ),
    '{}'::uuid[]
  ),
  g.phase = 'finalized',
  'legacy-result:' || gr.id::text,
  coalesce(g.created_by, l.owner_id),
  gr.created_at
from public.game_results as gr
join public.games as g on g.id = gr.game_id
join public.leagues as l on l.id = g.league_id
on conflict (game_id, player_id, version) do nothing;

create or replace function private.guard_result_version_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  -- Foreign-key cascades are allowed only through a parent deletion. Direct
  -- result-version mutation remains impossible.
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  raise exception 'Result versions are immutable; create a correction version'
    using errcode = '55000';
end;
$$;

create trigger protect_game_result_versions
before update or delete on public.game_result_versions
for each row execute function private.guard_result_version_append_only();

revoke all on function private.guard_result_version_append_only()
  from public, anon, authenticated;

-- Existing immutable-child guards must permit foreign-key cascades. League
-- deletion itself is revoked below and exposed only through the exact-name RPC.
create or replace function private.guard_finalized_game()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if pg_trigger_depth() > 1 then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  if tg_op = 'UPDATE'
     and (
       (new.phase = 'finalized' and old.phase is distinct from 'finalized')
       or (new.status = 'completed' and old.status is distinct from 'completed')
       or new.finalized_at is distinct from old.finalized_at
       or new.finalization_idempotency_key
         is distinct from old.finalization_idempotency_key
     )
     and not exists (
       select 1
       from private.game_finalization_contexts as context
       where context.backend_pid = pg_catalog.pg_backend_pid()
         and context.actor_id = (select auth.uid())
         and context.game_id = old.id
     ) then
    raise exception 'Use finalize_game to change finalization state'
      using errcode = '42501';
  end if;

  if old.phase = 'finalized' then
    raise exception 'Finalized games are immutable; record an adjustment instead'
      using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.guard_finalized_game_child()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _game_id uuid;
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  _game_id := case when tg_op = 'DELETE' then old.game_id else new.game_id end;
  if tg_op in ('INSERT', 'UPDATE')
     and tg_table_name in (
       'game_results',
       'game_participants',
       'game_reconciliations'
     )
     and exists (
       select 1
       from private.result_mutation_contexts as context
       where context.backend_pid = pg_catalog.pg_backend_pid()
         and context.actor_id = (select auth.uid())
         and context.game_id = _game_id
     ) then
    return new;
  end if;

  if exists (
    select 1 from public.games as g
    where g.id = _game_id and g.phase = 'finalized'
  ) then
    raise exception 'Finalized game records are immutable'
      using errcode = '55000';
  end if;
  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

create or replace function private.guard_game_transaction_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'DELETE' and pg_trigger_depth() > 1 then
    return old;
  end if;

  if tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Game transactions are append-only; create a reversal or adjustment'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.games as g
    where g.id = new.game_id and g.phase = 'finalized'
  ) and new.kind <> 'adjustment'
    and new.reversal_of_id is null
    and not exists (
      select 1
      from private.result_mutation_contexts as context
      where context.backend_pid = pg_catalog.pg_backend_pid()
        and context.actor_id = (select auth.uid())
        and context.game_id = new.game_id
    ) then
    raise exception 'Only reversals or adjustments may be posted after finalization'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Close legacy table-level financial mutation paths
-- ---------------------------------------------------------------------------

-- Preserve the validated implementations and exact public signatures while
-- moving the privileged writes outside the exposed public schema.
alter function public.record_game_transaction(
  uuid,
  uuid,
  uuid,
  public.game_transaction_type,
  bigint,
  text,
  text,
  text
) set schema private;

alter function private.record_game_transaction(
  uuid,
  uuid,
  uuid,
  public.game_transaction_type,
  bigint,
  text,
  text,
  text
) rename to record_game_transaction_impl;

alter function private.record_game_transaction_impl(
  uuid,
  uuid,
  uuid,
  public.game_transaction_type,
  bigint,
  text,
  text,
  text
) security definer;

create or replace function public.record_game_transaction(
  p_game_id uuid,
  p_participant_id uuid,
  p_player_id uuid,
  p_kind public.game_transaction_type,
  p_amount_minor bigint,
  p_currency text,
  p_note text,
  p_idempotency_key text
)
returns public.game_transactions
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.record_game_transaction_impl(
    p_game_id,
    p_participant_id,
    p_player_id,
    p_kind,
    p_amount_minor,
    p_currency,
    p_note,
    p_idempotency_key
  );
$$;

alter function public.finalize_game(uuid, text) set schema private;
alter function private.finalize_game(uuid, text)
  rename to finalize_game_core;
alter function private.finalize_game_core(uuid, text)
  security definer;

create or replace function private.finalize_game_impl(
  p_game_id uuid,
  p_idempotency_key text
)
returns public.games
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _game public.games;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_game_id is null then
    raise exception 'Game is required' using errcode = '22023';
  end if;

  insert into private.game_finalization_contexts (
    backend_pid,
    actor_id,
    game_id
  )
  values (
    pg_catalog.pg_backend_pid(),
    _actor_id,
    p_game_id
  );

  select private.finalize_game_core(p_game_id, p_idempotency_key)
  into _game;

  delete from private.game_finalization_contexts
  where backend_pid = pg_catalog.pg_backend_pid();

  return _game;
end;
$$;

create or replace function public.finalize_game(
  p_game_id uuid,
  p_idempotency_key text
)
returns public.games
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.finalize_game_impl(p_game_id, p_idempotency_key);
$$;

drop policy if exists game_results_insert on public.game_results;
drop policy if exists game_results_update on public.game_results;
drop policy if exists game_results_delete on public.game_results;
revoke insert, update, delete on table public.game_results
  from authenticated;

drop policy if exists game_transactions_insert on public.game_transactions;
revoke insert on table public.game_transactions from authenticated;

-- ---------------------------------------------------------------------------
-- Exact-name, owner-only, idempotent league deletion
-- ---------------------------------------------------------------------------

create or replace function private.delete_league_impl(
  p_league_id uuid,
  p_confirmation_name text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _league public.leagues;
  _receipt private.league_deletion_receipts;
  _deleted_at timestamptz;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_league_id is null then
    raise exception 'League is required' using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _actor_id::text || ':delete-league:' || p_idempotency_key,
      0
    )
  );

  select r.* into _receipt
  from private.league_deletion_receipts as r
  where r.actor_id = _actor_id
    and r.idempotency_key = p_idempotency_key;

  if found then
    if _receipt.league_id is distinct from p_league_id
       or _receipt.confirmation_name is distinct from p_confirmation_name then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return pg_catalog.jsonb_build_object(
      'league_id', _receipt.league_id,
      'deleted_at', _receipt.deleted_at
    );
  end if;

  select l.* into _league
  from public.leagues as l
  where l.id = p_league_id
  for update;

  if not found then
    raise exception 'League not found' using errcode = 'P0002';
  end if;
  if _league.owner_id <> _actor_id then
    raise exception 'Only the league owner can delete this league'
      using errcode = '42501';
  end if;
  if p_confirmation_name is distinct from _league.name then
    raise exception 'Confirmation name must exactly match the league name'
      using errcode = '22023';
  end if;

  _deleted_at := pg_catalog.clock_timestamp();
  delete from public.leagues where id = p_league_id;

  -- contacts are independently owned and are intentionally not deleted;
  -- only league_contacts rows are removed by their foreign-key cascade.
  insert into private.league_deletion_receipts (
    actor_id,
    idempotency_key,
    league_id,
    confirmation_name,
    deleted_at
  )
  values (
    _actor_id,
    p_idempotency_key,
    p_league_id,
    p_confirmation_name,
    _deleted_at
  );

  return pg_catalog.jsonb_build_object(
    'league_id', p_league_id,
    'deleted_at', _deleted_at
  );
end;
$$;

create or replace function public.delete_league(
  p_league_id uuid,
  p_confirmation_name text,
  p_idempotency_key text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.delete_league_impl(
    p_league_id,
    p_confirmation_name,
    p_idempotency_key
  );
$$;

drop policy if exists leagues_delete on public.leagues;
revoke delete on table public.leagues from authenticated;

-- ---------------------------------------------------------------------------
-- Append-only game transaction reversal
-- ---------------------------------------------------------------------------

create or replace function private.reverse_game_transaction_impl(
  p_game_id uuid,
  p_transaction_id uuid,
  p_note text,
  p_idempotency_key text
)
returns public.game_transactions
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _original public.game_transactions;
  _reversal public.game_transactions;
  _game public.games;
  _inflow bigint;
  _outflow bigint;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_game_id is null or p_transaction_id is null then
    raise exception 'Game and transaction are required' using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;
  if not private.can_manage_game(p_game_id) then
    raise exception 'League owner or admin access is required'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _actor_id::text || ':game-reversal:' || p_idempotency_key,
      0
    )
  );

  select gt.* into _reversal
  from public.game_transactions as gt
  where gt.created_by = _actor_id
    and gt.idempotency_key = p_idempotency_key;
  if found then
    if _reversal.game_id <> p_game_id
       or _reversal.reversal_of_id is distinct from p_transaction_id then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return _reversal;
  end if;

  select gt.* into _original
  from public.game_transactions as gt
  where gt.id = p_transaction_id
    and gt.game_id = p_game_id
  for update;
  if not found then
    raise exception 'Game transaction not found' using errcode = 'P0002';
  end if;
  if _original.reversal_of_id is not null or _original.effect_multiplier <> 1 then
    raise exception 'A reversal cannot itself be reversed' using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.game_transactions as gt
    where gt.reversal_of_id = _original.id
  ) then
    raise exception 'Game transaction has already been reversed'
      using errcode = '55000';
  end if;

  insert into public.game_transactions (
    game_id,
    participant_id,
    player_id,
    kind,
    amount_minor,
    currency,
    note,
    reversal_of_id,
    effect_multiplier,
    reversed_at,
    idempotency_key,
    created_by
  )
  values (
    _original.game_id,
    _original.participant_id,
    _original.player_id,
    _original.kind,
    _original.amount_minor,
    _original.currency,
    nullif(btrim(coalesce(p_note, '')), ''),
    _original.id,
    -1,
    pg_catalog.clock_timestamp(),
    p_idempotency_key,
    _actor_id
  )
  returning * into _reversal;

  select g.* into _game
  from public.games as g
  where g.id = p_game_id;

  if _game.phase = 'finalized' then
    insert into private.result_mutation_contexts (
      backend_pid,
      actor_id,
      game_id
    )
    values (
      pg_catalog.pg_backend_pid(),
      _actor_id,
      p_game_id
    );

    select
      coalesce(sum(
        case
          when kind in ('buy_in', 'reload', 'entry', 're_entry', 'add_on', 'fee', 'tip')
            then amount_minor * effect_multiplier
          when kind = 'adjustment' and amount_minor > 0
            then amount_minor
          else 0
        end
      ), 0)::bigint,
      coalesce(sum(
        case
          when kind in ('cash_out', 'payout', 'bounty')
            then amount_minor * effect_multiplier
          when kind = 'adjustment' and amount_minor < 0
            then -amount_minor
          else 0
        end
      ), 0)::bigint
    into _inflow, _outflow
    from public.game_transactions
    where game_id = p_game_id;

    insert into public.game_reconciliations (
      game_id,
      inflow_minor,
      outflow_minor,
      variance_minor,
      currency,
      status,
      calculated_at,
      finalized_by
    )
    values (
      p_game_id,
      _inflow,
      _outflow,
      _inflow - _outflow,
      _game.currency,
      case when _inflow = _outflow then 'balanced' else 'warning' end,
      pg_catalog.clock_timestamp(),
      _actor_id
    )
    on conflict (game_id) do update
    set
      inflow_minor = excluded.inflow_minor,
      outflow_minor = excluded.outflow_minor,
      variance_minor = excluded.variance_minor,
      currency = excluded.currency,
      status = excluded.status,
      calculated_at = excluded.calculated_at,
      finalized_by = excluded.finalized_by;

    delete from private.result_mutation_contexts
    where backend_pid = pg_catalog.pg_backend_pid();
  end if;

  return _reversal;
end;
$$;

create or replace function public.reverse_game_transaction(
  p_game_id uuid,
  p_transaction_id uuid,
  p_note text,
  p_idempotency_key text
)
returns public.game_transactions
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.reverse_game_transaction_impl(
    p_game_id,
    p_transaction_id,
    p_note,
    p_idempotency_key
  );
$$;

-- ---------------------------------------------------------------------------
-- Atomic result recording and immutable correction versioning
-- ---------------------------------------------------------------------------

create or replace function private.record_game_result_impl(
  p_game_id uuid,
  p_player_id uuid,
  p_finish_position integer,
  p_entry_minor bigint,
  p_reentry_count integer,
  p_reentry_total_minor bigint,
  p_add_on_count integer,
  p_add_on_total_minor bigint,
  p_bounty_minor bigint,
  p_payout_minor bigint,
  p_currency text,
  p_corrects_version_id uuid,
  p_idempotency_key text
)
returns public.game_result_versions
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _game public.games;
  _existing public.game_result_versions;
  _previous public.game_result_versions;
  _version public.game_result_versions;
  _original public.game_transactions;
  _transaction public.game_transactions;
  _participant_id uuid;
  _next_version integer;
  _new_transaction_ids uuid[] := '{}'::uuid[];
  _original_id uuid;
  _config jsonb;
  _field_size integer;
  _inflow bigint;
  _outflow bigint;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_game_id is null or p_player_id is null then
    raise exception 'Game and player are required' using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;
  if p_finish_position is null or p_finish_position < 1 then
    raise exception 'Finish position must be at least 1' using errcode = '22023';
  end if;
  if p_entry_minor is null or p_entry_minor < 0
     or p_reentry_count is null or p_reentry_count < 0
     or p_reentry_total_minor is null or p_reentry_total_minor < 0
     or p_add_on_count is null or p_add_on_count < 0
     or p_add_on_total_minor is null or p_add_on_total_minor < 0
     or p_bounty_minor is null or p_bounty_minor < 0
     or p_payout_minor is null or p_payout_minor < 0 then
    raise exception 'Result money and counts cannot be negative'
      using errcode = '22023';
  end if;
  if (p_reentry_count = 0) <> (p_reentry_total_minor = 0) then
    raise exception 'Re-entry count and total must either both be zero or both be positive'
      using errcode = '22023';
  end if;
  if (p_add_on_count = 0) <> (p_add_on_total_minor = 0) then
    raise exception 'Add-on count and total must either both be zero or both be positive'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _actor_id::text || ':record-result:' || p_idempotency_key,
      0
    )
  );

  select v.* into _existing
  from public.game_result_versions as v
  where v.created_by = _actor_id
    and v.idempotency_key = p_idempotency_key;
  if found then
    if _existing.game_id <> p_game_id
       or _existing.player_id <> p_player_id
       or _existing.finish_position <> p_finish_position
       or _existing.entry_minor <> p_entry_minor
       or _existing.reentry_count <> p_reentry_count
       or _existing.reentry_total_minor <> p_reentry_total_minor
       or _existing.add_on_count <> p_add_on_count
       or _existing.add_on_total_minor <> p_add_on_total_minor
       or _existing.bounty_minor <> p_bounty_minor
       or _existing.payout_minor <> p_payout_minor
       or _existing.currency <> p_currency
       or _existing.correction_of_id is distinct from p_corrects_version_id then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return _existing;
  end if;

  select g.* into _game
  from public.games as g
  where g.id = p_game_id
  for update;
  if not found then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if not private.can_manage_game(p_game_id) then
    raise exception 'League owner or admin access is required'
      using errcode = '42501';
  end if;
  if _game.phase = 'cancelled' then
    raise exception 'Cancelled games cannot accept results' using errcode = '55000';
  end if;
  if p_currency is null
     or p_currency !~ '^[A-Z]{3}$'
     or p_currency <> _game.currency then
    raise exception 'Result currency must match the game' using errcode = '22023';
  end if;
  if not exists (
    select 1
    from public.players as p
    where p.id = p_player_id
      and p.league_id = _game.league_id
  ) then
    raise exception 'Player does not belong to this game league'
      using errcode = '22023';
  end if;

  select gp.id into _participant_id
  from public.game_participants as gp
  where gp.game_id = p_game_id
    and gp.player_id = p_player_id;

  select v.* into _previous
  from public.game_result_versions as v
  where v.game_id = p_game_id
    and v.player_id = p_player_id
  order by v.version desc
  limit 1
  for update;

  if p_corrects_version_id is null and found then
    raise exception 'An existing result must be changed with a correction version'
      using errcode = '55000';
  elsif p_corrects_version_id is not null and not found then
    raise exception 'Correction target was not found' using errcode = 'P0002';
  elsif p_corrects_version_id is not null
        and _previous.id <> p_corrects_version_id then
    raise exception 'Correction must target the latest result version'
      using errcode = '40001';
  end if;

  if _game.phase = 'finalized' and p_corrects_version_id is null then
    raise exception 'Finalized results require an explicit correction version'
      using errcode = '55000';
  end if;

  if exists (
    select 1
    from public.game_result_versions as candidate
    where candidate.game_id = p_game_id
      and candidate.player_id <> p_player_id
      and candidate.finish_position = p_finish_position
      and candidate.version = (
        select max(latest.version)
        from public.game_result_versions as latest
        where latest.game_id = candidate.game_id
          and latest.player_id = candidate.player_id
      )
  ) then
    raise exception 'Finish position is already assigned' using errcode = '23505';
  end if;

  if p_corrects_version_id is not null then
    insert into private.result_mutation_contexts (
      backend_pid,
      actor_id,
      game_id
    )
    values (
      pg_catalog.pg_backend_pid(),
      _actor_id,
      p_game_id
    );

    foreach _original_id in array _previous.transaction_ids loop
      select gt.* into _original
      from public.game_transactions as gt
      where gt.id = _original_id
        and gt.game_id = p_game_id
      for update;

      if not found then
        raise exception 'Correction transaction history is incomplete'
          using errcode = '55000';
      end if;
      if exists (
        select 1
        from public.game_transactions as gt
        where gt.reversal_of_id = _original.id
      ) then
        raise exception 'A prior result transaction has already been reversed'
          using errcode = '55000';
      end if;

      insert into public.game_transactions (
        game_id,
        participant_id,
        player_id,
        kind,
        amount_minor,
        currency,
        note,
        reversal_of_id,
        effect_multiplier,
        reversed_at,
        idempotency_key,
        created_by
      )
      values (
        _original.game_id,
        _original.participant_id,
        _original.player_id,
        _original.kind,
        _original.amount_minor,
        _original.currency,
        'Result correction v' || (_previous.version + 1)::text,
        _original.id,
        -1,
        pg_catalog.clock_timestamp(),
        p_idempotency_key || ':reverse:' || _original.id::text,
        _actor_id
      );
    end loop;
  end if;

  if p_entry_minor > 0 then
    insert into public.game_transactions (
      game_id, participant_id, player_id, kind, amount_minor, currency,
      note, idempotency_key, created_by
    )
    values (
      p_game_id, _participant_id, p_player_id, 'entry', p_entry_minor,
      p_currency, 'Result entry', p_idempotency_key || ':entry', _actor_id
    )
    returning * into _transaction;
    _new_transaction_ids := array_append(_new_transaction_ids, _transaction.id);
  end if;

  if p_reentry_total_minor > 0 then
    insert into public.game_transactions (
      game_id, participant_id, player_id, kind, amount_minor, currency,
      note, idempotency_key, created_by
    )
    values (
      p_game_id, _participant_id, p_player_id, 're_entry',
      p_reentry_total_minor, p_currency,
      p_reentry_count::text || ' re-entry total',
      p_idempotency_key || ':re-entry', _actor_id
    )
    returning * into _transaction;
    _new_transaction_ids := array_append(_new_transaction_ids, _transaction.id);
  end if;

  if p_add_on_total_minor > 0 then
    insert into public.game_transactions (
      game_id, participant_id, player_id, kind, amount_minor, currency,
      note, idempotency_key, created_by
    )
    values (
      p_game_id, _participant_id, p_player_id, 'add_on',
      p_add_on_total_minor, p_currency,
      p_add_on_count::text || ' add-on total',
      p_idempotency_key || ':add-on', _actor_id
    )
    returning * into _transaction;
    _new_transaction_ids := array_append(_new_transaction_ids, _transaction.id);
  end if;

  if p_bounty_minor > 0 then
    insert into public.game_transactions (
      game_id, participant_id, player_id, kind, amount_minor, currency,
      note, idempotency_key, created_by
    )
    values (
      p_game_id, _participant_id, p_player_id, 'bounty', p_bounty_minor,
      p_currency, 'Result bounty', p_idempotency_key || ':bounty', _actor_id
    )
    returning * into _transaction;
    _new_transaction_ids := array_append(_new_transaction_ids, _transaction.id);
  end if;

  if p_payout_minor > 0 then
    insert into public.game_transactions (
      game_id, participant_id, player_id, kind, amount_minor, currency,
      note, idempotency_key, created_by
    )
    values (
      p_game_id, _participant_id, p_player_id, 'payout', p_payout_minor,
      p_currency, 'Result payout', p_idempotency_key || ':payout', _actor_id
    )
    returning * into _transaction;
    _new_transaction_ids := array_append(_new_transaction_ids, _transaction.id);
  end if;

  _next_version := coalesce(_previous.version, 0) + 1;

  insert into public.game_result_versions (
    game_id,
    player_id,
    version,
    correction_of_id,
    finish_position,
    entry_minor,
    reentry_count,
    reentry_total_minor,
    add_on_count,
    add_on_total_minor,
    bounty_minor,
    payout_minor,
    currency,
    transaction_ids,
    is_post_finalization,
    idempotency_key,
    created_by
  )
  values (
    p_game_id,
    p_player_id,
    _next_version,
    p_corrects_version_id,
    p_finish_position,
    p_entry_minor,
    p_reentry_count,
    p_reentry_total_minor,
    p_add_on_count,
    p_add_on_total_minor,
    p_bounty_minor,
    p_payout_minor,
    p_currency,
    _new_transaction_ids,
    _game.phase = 'finalized',
    p_idempotency_key,
    _actor_id
  )
  returning * into _version;

  insert into public.game_results (
    game_id,
    player_id,
    finish_position,
    buy_in_amount,
    payout,
    points_earned,
    rebuys,
    total_buy_in_minor,
    payout_minor,
    data_quality,
    finalized_at
  )
  values (
    p_game_id,
    p_player_id,
    p_finish_position,
    _version.total_buy_in_minor::numeric / 100,
    (p_payout_minor + p_bounty_minor)::numeric / 100,
    0,
    p_reentry_count,
    _version.total_buy_in_minor,
    p_payout_minor + p_bounty_minor,
    'trusted',
    case
      when _game.phase = 'finalized'
        then coalesce(_game.finalized_at, pg_catalog.clock_timestamp())
      else null
    end
  )
  on conflict (game_id, player_id) do update
  set
    finish_position = excluded.finish_position,
    buy_in_amount = excluded.buy_in_amount,
    payout = excluded.payout,
    rebuys = excluded.rebuys,
    total_buy_in_minor = excluded.total_buy_in_minor,
    payout_minor = excluded.payout_minor,
    data_quality = excluded.data_quality,
    finalized_at = excluded.finalized_at;

  if _participant_id is not null then
    update public.game_participants
    set finish_position = p_finish_position,
        updated_at = pg_catalog.clock_timestamp()
    where id = _participant_id;
  end if;

  select coalesce(r.config, l.points_system) into _config
  from public.games as g
  join public.leagues as l on l.id = g.league_id
  left join public.league_scoring_rules as r on r.id = g.scoring_rule_id
  where g.id = p_game_id;

  select count(*)::integer into _field_size
  from public.game_results
  where game_id = p_game_id;

  update public.game_results as gr
  set points_earned = private.calculate_points(
    _config,
    gr.finish_position,
    _field_size,
    gr.total_buy_in_minor
  )
  where gr.game_id = p_game_id;

  if _game.phase = 'finalized' then
    select
      coalesce(sum(
        case
          when kind in ('buy_in', 'reload', 'entry', 're_entry', 'add_on', 'fee', 'tip')
            then amount_minor * effect_multiplier
          when kind = 'adjustment' and amount_minor > 0
            then amount_minor
          else 0
        end
      ), 0)::bigint,
      coalesce(sum(
        case
          when kind in ('cash_out', 'payout', 'bounty')
            then amount_minor * effect_multiplier
          when kind = 'adjustment' and amount_minor < 0
            then -amount_minor
          else 0
        end
      ), 0)::bigint
    into _inflow, _outflow
    from public.game_transactions
    where game_id = p_game_id;

    insert into public.game_reconciliations (
      game_id,
      inflow_minor,
      outflow_minor,
      variance_minor,
      currency,
      status,
      calculated_at,
      finalized_by
    )
    values (
      p_game_id,
      _inflow,
      _outflow,
      _inflow - _outflow,
      _game.currency,
      case when _inflow = _outflow then 'balanced' else 'warning' end,
      pg_catalog.clock_timestamp(),
      _actor_id
    )
    on conflict (game_id) do update
    set
      inflow_minor = excluded.inflow_minor,
      outflow_minor = excluded.outflow_minor,
      variance_minor = excluded.variance_minor,
      currency = excluded.currency,
      status = excluded.status,
      calculated_at = excluded.calculated_at,
      finalized_by = excluded.finalized_by;
  end if;

  delete from private.result_mutation_contexts
  where backend_pid = pg_catalog.pg_backend_pid();

  return _version;
end;
$$;

create or replace function public.record_game_result(
  p_game_id uuid,
  p_player_id uuid,
  p_finish_position integer,
  p_entry_minor bigint,
  p_reentry_count integer,
  p_reentry_total_minor bigint,
  p_add_on_count integer,
  p_add_on_total_minor bigint,
  p_bounty_minor bigint,
  p_payout_minor bigint,
  p_currency text,
  p_corrects_version_id uuid,
  p_idempotency_key text
)
returns public.game_result_versions
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.record_game_result_impl(
    p_game_id,
    p_player_id,
    p_finish_position,
    p_entry_minor,
    p_reentry_count,
    p_reentry_total_minor,
    p_add_on_count,
    p_add_on_total_minor,
    p_bounty_minor,
    p_payout_minor,
    p_currency,
    p_corrects_version_id,
    p_idempotency_key
  );
$$;

-- ---------------------------------------------------------------------------
-- Validated payout rules and exact integer allocation
-- ---------------------------------------------------------------------------

create or replace function public.allocate_game_payouts(
  p_game_id uuid,
  p_rules jsonb
)
returns table (
  finish_position integer,
  amount_minor bigint
)
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _game public.games;
  _rule_type text;
  _place jsonb;
  _place_count integer;
  _distinct_place_count integer;
  _max_place integer;
  _available_pool bigint;
  _deductions bigint;
  _total numeric;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;

  select g.* into _game
  from public.games as g
  where g.id = p_game_id
  for share;
  if not found then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if not private.can_manage_game(p_game_id) then
    raise exception 'League owner or admin access is required'
      using errcode = '42501';
  end if;

  if p_rules is null
     or jsonb_typeof(p_rules) is distinct from 'object'
     or jsonb_typeof(p_rules -> 'places') is distinct from 'array' then
    raise exception 'Payout rules require a non-empty places array'
      using errcode = '22023';
  end if;
  if jsonb_array_length(p_rules -> 'places') = 0 then
    raise exception 'Payout rules require a non-empty places array'
      using errcode = '22023';
  end if;

  _rule_type := p_rules ->> 'type';
  if _rule_type is null or _rule_type not in ('percentage', 'fixed') then
    raise exception 'Payout rule type must be percentage or fixed'
      using errcode = '22023';
  end if;

  for _place in
    select value from jsonb_array_elements(p_rules -> 'places')
  loop
    if jsonb_typeof(_place) is distinct from 'object'
       or jsonb_typeof(_place -> 'place') is distinct from 'number'
       or (_place ->> 'place') !~ '^[1-9][0-9]*$' then
      raise exception 'Every payout place must be a positive integer'
        using errcode = '22023';
    end if;

    if _rule_type = 'percentage' and (
      jsonb_typeof(_place -> 'basis_points') is distinct from 'number'
      or (_place ->> 'basis_points') !~ '^[1-9][0-9]*$'
    ) then
      raise exception 'Percentage payouts require positive integer basis_points'
        using errcode = '22023';
    elsif _rule_type = 'fixed' and (
      jsonb_typeof(_place -> 'amount_minor') is null
      or jsonb_typeof(_place -> 'amount_minor') not in ('number', 'string')
      or (_place ->> 'amount_minor') !~ '^[0-9]+$'
    ) then
      raise exception 'Fixed payouts require non-negative integer amount_minor'
        using errcode = '22023';
    end if;
  end loop;

  select
    count(*)::integer,
    count(distinct (value ->> 'place')::integer)::integer,
    max((value ->> 'place')::integer)
  into _place_count, _distinct_place_count, _max_place
  from jsonb_array_elements(p_rules -> 'places');

  if _place_count <> _distinct_place_count
     or _max_place <> _place_count then
    raise exception 'Payout places must be unique and contiguous starting at 1'
      using errcode = '22023';
  end if;

  select coalesce(sum(
    case
      when gt.kind in ('entry', 're_entry', 'add_on', 'buy_in', 'reload')
        then gt.amount_minor * gt.effect_multiplier
      else 0
    end
  ), 0)::bigint
  into _available_pool
  from public.game_transactions as gt
  where gt.game_id = p_game_id;

  select coalesce(sum(
    case
      when gt.kind in ('fee', 'tip', 'bounty')
        then gt.amount_minor * gt.effect_multiplier
      else 0
    end
  ), 0)::bigint
  into _deductions
  from public.game_transactions as gt
  where gt.game_id = p_game_id;

  _available_pool :=
    _available_pool - _deductions - coalesce(_game.rake_minor, 0);
  if _available_pool < 0 then
    raise exception 'Fees, tips, bounties, and rake exceed the entry pool'
      using errcode = '22023';
  end if;

  if _rule_type = 'percentage' then
    select sum((value ->> 'basis_points')::numeric)
    into _total
    from jsonb_array_elements(p_rules -> 'places');
    if _total <> 10000 then
      raise exception 'Percentage payout basis points must total exactly 10000'
        using errcode = '22023';
    end if;

    return query
    with parsed as (
      select
        (value ->> 'place')::integer as place,
        floor(
          _available_pool::numeric
          * (value ->> 'basis_points')::numeric
          / 10000
        )::bigint as base_amount
      from jsonb_array_elements(p_rules -> 'places')
    ),
    totals as (
      select coalesce(sum(base_amount), 0)::bigint as allocated
      from parsed
    )
    select
      parsed.place,
      parsed.base_amount
        + case
            when parsed.place = 1
              then _available_pool - totals.allocated
            else 0
          end
    from parsed
    cross join totals
    order by parsed.place;
  else
    select sum((value ->> 'amount_minor')::numeric)
    into _total
    from jsonb_array_elements(p_rules -> 'places');
    if _total <> _available_pool::numeric then
      raise exception 'Fixed payouts must equal the available payout pool'
        using errcode = '22023';
    end if;

    return query
    select
      (value ->> 'place')::integer,
      (value ->> 'amount_minor')::bigint
    from jsonb_array_elements(p_rules -> 'places')
    order by (value ->> 'place')::integer;
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Server-authoritative tournament clock
-- ---------------------------------------------------------------------------

create or replace function private.command_tournament_clock_impl(
  p_game_id uuid,
  p_command text,
  p_expected_revision bigint,
  p_idempotency_key text
)
returns public.tournament_clocks
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _game public.games;
  _state public.tournament_clocks;
  _receipt private.tournament_clock_command_receipts;
  _now timestamptz := pg_catalog.clock_timestamp();
  _duration integer;
  _next_level integer;
  _effective_remaining integer;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_game_id is null then
    raise exception 'Game is required' using errcode = '22023';
  end if;
  if p_command is null
     or p_command not in ('start', 'pause', 'advance', 'reset') then
    raise exception 'Clock command must be start, pause, advance, or reset'
      using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 0 then
    raise exception 'Expected clock revision is required'
      using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _actor_id::text || ':clock:' || p_idempotency_key,
      0
    )
  );

  select r.* into _receipt
  from private.tournament_clock_command_receipts as r
  where r.actor_id = _actor_id
    and r.idempotency_key = p_idempotency_key;
  if found then
    if _receipt.game_id <> p_game_id
       or _receipt.command <> p_command
       or _receipt.expected_revision <> p_expected_revision then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return pg_catalog.jsonb_populate_record(
      null::public.tournament_clocks,
      _receipt.result
    );
  end if;

  select g.* into _game
  from public.games as g
  where g.id = p_game_id
  for update;
  if not found then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if not private.can_manage_game(p_game_id) then
    raise exception 'League owner or admin access is required'
      using errcode = '42501';
  end if;
  if _game.kind <> 'tournament' then
    raise exception 'Tournament clocks are only available for tournaments'
      using errcode = '22023';
  end if;
  if _game.phase in ('finalized', 'cancelled') then
    raise exception 'Closed games cannot change their tournament clock'
      using errcode = '55000';
  end if;

  select c.* into _state
  from public.tournament_clocks as c
  where c.game_id = p_game_id
  for update;

  if not found then
    select tl.level_number, tl.duration_seconds
    into _next_level, _duration
    from public.tournament_levels as tl
    where tl.game_id = p_game_id
    order by tl.level_number
    limit 1;
    if not found then
      _next_level := 1;
      _duration := 1200;
    end if;

    insert into public.tournament_clocks (
      game_id,
      current_level,
      remaining_seconds,
      is_running,
      started_at,
      paused_at,
      revision,
      updated_at
    )
    values (
      p_game_id,
      _next_level,
      _duration,
      false,
      null,
      _now,
      0,
      _now
    )
    returning * into _state;
  end if;

  if _state.revision <> p_expected_revision then
    raise exception 'Tournament clock revision conflict'
      using errcode = '40001';
  end if;

  _effective_remaining := _state.remaining_seconds;
  if _state.is_running then
    if _state.started_at is null then
      raise exception 'Running clock is missing its server start time'
        using errcode = '55000';
    end if;
    _effective_remaining := greatest(
      0,
      _state.remaining_seconds
        - floor(extract(epoch from (_now - _state.started_at)))::integer
    );
  end if;

  if p_command = 'start' then
    if _state.is_running then
      raise exception 'Tournament clock is already running'
        using errcode = '55000';
    end if;
    if _effective_remaining <= 0 then
      raise exception 'Advance or reset an expired clock before starting'
        using errcode = '55000';
    end if;
    _state.is_running := true;
    _state.remaining_seconds := _effective_remaining;
    _state.started_at := _now;
    _state.paused_at := null;
  elsif p_command = 'pause' then
    if not _state.is_running then
      raise exception 'Tournament clock is already paused'
        using errcode = '55000';
    end if;
    _state.is_running := false;
    _state.remaining_seconds := _effective_remaining;
    _state.started_at := null;
    _state.paused_at := _now;
  elsif p_command = 'advance' then
    select tl.level_number, tl.duration_seconds
    into _next_level, _duration
    from public.tournament_levels as tl
    where tl.game_id = p_game_id
      and tl.level_number > _state.current_level
    order by tl.level_number
    limit 1;
    if not found then
      raise exception 'Tournament structure has no next level'
        using errcode = '55000';
    end if;
    _state.current_level := _next_level;
    _state.remaining_seconds := _duration;
    if _state.is_running then
      _state.started_at := _now;
      _state.paused_at := null;
    else
      _state.started_at := null;
      _state.paused_at := _now;
    end if;
  else
    select tl.level_number, tl.duration_seconds
    into _next_level, _duration
    from public.tournament_levels as tl
    where tl.game_id = p_game_id
    order by tl.level_number
    limit 1;
    if not found then
      _next_level := 1;
      _duration := 1200;
    end if;
    _state.current_level := _next_level;
    _state.remaining_seconds := _duration;
    _state.is_running := false;
    _state.started_at := null;
    _state.paused_at := _now;
  end if;

  update public.tournament_clocks
  set
    current_level = _state.current_level,
    remaining_seconds = _state.remaining_seconds,
    is_running = _state.is_running,
    started_at = _state.started_at,
    paused_at = _state.paused_at,
    revision = revision + 1,
    updated_at = _now
  where game_id = p_game_id
  returning * into _state;

  insert into private.tournament_clock_command_receipts (
    actor_id,
    idempotency_key,
    game_id,
    command,
    expected_revision,
    result
  )
  values (
    _actor_id,
    p_idempotency_key,
    p_game_id,
    p_command,
    p_expected_revision,
    to_jsonb(_state)
  );

  return _state;
end;
$$;

create or replace function public.command_tournament_clock(
  p_game_id uuid,
  p_command text,
  p_expected_revision bigint,
  p_idempotency_key text
)
returns public.tournament_clocks
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.command_tournament_clock_impl(
    p_game_id,
    p_command,
    p_expected_revision,
    p_idempotency_key
  );
$$;

drop policy if exists tournament_clocks_modify
  on public.tournament_clocks;
revoke insert, update, delete on table public.tournament_clocks
  from authenticated;

-- ---------------------------------------------------------------------------
-- Atomic, server-authoritative staking allocation waterfall
-- ---------------------------------------------------------------------------

create or replace function private.record_staking_allocation_impl(
  p_owner_id uuid,
  p_deal_id uuid,
  p_session_id uuid,
  p_allocated_buy_in_minor bigint,
  p_total_result_minor bigint,
  p_expected_makeup_minor bigint,
  p_notes text,
  p_idempotency_key text
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _receipt private.staking_allocation_receipts;
  _deal public.staking_deals;
  _session public.career_sessions;
  _allocation public.staking_allocations;
  _notes text := nullif(btrim(coalesce(p_notes, '')), '');
  _makeup_before bigint;
  _makeup_after bigint;
  _recovered_makeup bigint;
  _distributable bigint;
  _backer_share bigint;
  _backer_result bigint;
  _player_result bigint;
  _result jsonb;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_owner_id is null or p_owner_id <> _actor_id then
    raise exception 'You may only record your own staking allocations'
      using errcode = '42501';
  end if;
  if p_deal_id is null or p_session_id is null then
    raise exception 'Staking deal and session are required'
      using errcode = '22023';
  end if;
  if p_allocated_buy_in_minor is null or p_allocated_buy_in_minor < 0 then
    raise exception 'Allocated buy-in must be zero or greater'
      using errcode = '22023';
  end if;
  if p_total_result_minor is null then
    raise exception 'Session result is required' using errcode = '22023';
  end if;
  if p_expected_makeup_minor is null or p_expected_makeup_minor < 0 then
    raise exception 'Expected makeup must be zero or greater'
      using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  -- Same-key retries serialize independently from the deal-row lock. A retry
  -- observes the first receipt and never repeats either money mutation.
  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _actor_id::text || ':staking-allocation:' || p_idempotency_key,
      0
    )
  );

  select receipt.* into _receipt
  from private.staking_allocation_receipts as receipt
  where receipt.actor_id = _actor_id
    and receipt.idempotency_key = p_idempotency_key;
  if found then
    if _receipt.deal_id <> p_deal_id
       or _receipt.session_id <> p_session_id
       or _receipt.allocated_buy_in_minor <> p_allocated_buy_in_minor
       or _receipt.total_result_minor <> p_total_result_minor
       or _receipt.expected_makeup_minor <> p_expected_makeup_minor
       or _receipt.notes is distinct from _notes then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return _receipt.result;
  end if;

  -- Different keys for the same deal serialize here. The expected-makeup
  -- comparison turns a stale preview into a retryable conflict instead of
  -- silently applying a second split against changed terms.
  select deal.* into _deal
  from public.staking_deals as deal
  where deal.id = p_deal_id
  for update;
  if not found then
    raise exception 'Staking deal not found' using errcode = 'P0002';
  end if;
  if _deal.owner_id <> _actor_id then
    raise exception 'You may only record allocations for your own staking deal'
      using errcode = '42501';
  end if;
  if _deal.status <> 'active' then
    raise exception 'Staking deal must be active'
      using errcode = '55000';
  end if;
  if _deal.makeup_minor <> p_expected_makeup_minor then
    raise exception 'Staking makeup changed; refresh and try again'
      using errcode = '40001';
  end if;

  select session.* into _session
  from public.career_sessions as session
  where session.id = p_session_id
    and session.owner_id = _actor_id;
  if not found then
    raise exception 'Career session not found' using errcode = 'P0002';
  end if;
  if _session.currency <> _deal.currency then
    raise exception 'Staking deal and session currencies must match'
      using errcode = '22023';
  end if;
  if exists (
    select 1
    from public.staking_allocations as allocation
    where allocation.deal_id = p_deal_id
      and allocation.session_id = p_session_id
  ) then
    raise exception 'Career session is already allocated to this staking deal'
      using errcode = '23505';
  end if;

  _makeup_before := _deal.makeup_minor;
  if p_total_result_minor <= 0 then
    _backer_result := p_total_result_minor;
    _player_result := 0;
    _makeup_after := _makeup_before - p_total_result_minor;
  else
    _recovered_makeup := least(p_total_result_minor, _makeup_before);
    _distributable := p_total_result_minor - _recovered_makeup;
    _backer_share := pg_catalog.trunc(
      (
        _distributable::numeric
        * _deal.backer_share_bps::numeric
      ) / 10000
    )::bigint;
    _backer_result := _recovered_makeup + _backer_share;
    _player_result := _distributable - _backer_share;
    _makeup_after := _makeup_before - _recovered_makeup;
  end if;

  insert into public.staking_allocations (
    owner_id,
    deal_id,
    session_id,
    allocated_buy_in_minor,
    backer_result_minor,
    player_result_minor,
    settled_at,
    notes
  )
  values (
    _actor_id,
    p_deal_id,
    p_session_id,
    p_allocated_buy_in_minor,
    _backer_result,
    _player_result,
    null,
    _notes
  )
  returning * into _allocation;

  update public.staking_deals
  set
    makeup_minor = _makeup_after,
    updated_at = pg_catalog.clock_timestamp()
  where id = p_deal_id
  returning * into _deal;

  _result := pg_catalog.jsonb_build_object(
    'allocation', to_jsonb(_allocation),
    'deal', to_jsonb(_deal),
    'makeup_before_minor', _makeup_before::text,
    'makeup_after_minor', _makeup_after::text
  );

  insert into private.staking_allocation_receipts (
    actor_id,
    idempotency_key,
    deal_id,
    session_id,
    allocated_buy_in_minor,
    total_result_minor,
    expected_makeup_minor,
    notes,
    result
  )
  values (
    _actor_id,
    p_idempotency_key,
    p_deal_id,
    p_session_id,
    p_allocated_buy_in_minor,
    p_total_result_minor,
    p_expected_makeup_minor,
    _notes,
    _result
  );

  return _result;
end;
$$;

create or replace function public.record_staking_allocation(
  p_owner_id uuid,
  p_deal_id uuid,
  p_session_id uuid,
  p_allocated_buy_in_minor bigint,
  p_total_result_minor bigint,
  p_expected_makeup_minor bigint,
  p_notes text,
  p_idempotency_key text
)
returns jsonb
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.record_staking_allocation_impl(
    p_owner_id,
    p_deal_id,
    p_session_id,
    p_allocated_buy_in_minor,
    p_total_result_minor,
    p_expected_makeup_minor,
    p_notes,
    p_idempotency_key
  );
$$;

revoke insert, update, delete on table public.staking_allocations
  from authenticated;

-- ---------------------------------------------------------------------------
-- Revision-locked, append-only settlement mutations
-- ---------------------------------------------------------------------------

create or replace function private.create_settlement_impl(
  p_owner_id uuid,
  p_session_id uuid,
  p_direction text,
  p_counterparty text,
  p_amount_minor bigint,
  p_currency text,
  p_reason text,
  p_external_method text,
  p_external_handle text,
  p_memo text,
  p_due_date date,
  p_idempotency_key text
)
returns public.settlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  _settlement public.settlements;
  _external_method text := nullif(btrim(coalesce(p_external_method, '')), '');
  _external_handle text := nullif(btrim(coalesce(p_external_handle, '')), '');
  _memo text := nullif(btrim(coalesce(p_memo, '')), '');
begin
  if (select auth.uid()) is null
     or p_owner_id is null
     or (select auth.uid()) <> p_owner_id then
    raise exception 'You may only create your own settlements'
      using errcode = '42501';
  end if;
  if p_direction is null
     or p_direction not in ('payable', 'receivable')
     or btrim(coalesce(p_counterparty, '')) = ''
     or p_amount_minor is null
     or p_amount_minor <= 0
     or p_currency is null
     or p_currency !~ '^[A-Z]{3}$'
     or btrim(coalesce(p_reason, '')) = ''
     or btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Invalid settlement' using errcode = '22023';
  end if;
  if p_session_id is not null and not exists (
    select 1 from public.career_sessions as cs
    where cs.id = p_session_id and cs.owner_id = p_owner_id
  ) then
    raise exception 'Career session not found' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      p_owner_id::text || ':create-settlement:' || p_idempotency_key,
      0
    )
  );
  select s.* into _settlement
  from public.settlements as s
  where s.owner_id = p_owner_id
    and s.idempotency_key = p_idempotency_key;
  if found then
    if _settlement.session_id is distinct from p_session_id
       or _settlement.direction <> p_direction
       or _settlement.counterparty <> btrim(p_counterparty)
       or _settlement.amount_minor <> p_amount_minor
       or _settlement.currency <> p_currency
       or _settlement.reason <> btrim(p_reason)
       or _settlement.external_method is distinct from _external_method
       or _settlement.external_handle is distinct from _external_handle
       or _settlement.memo is distinct from _memo
       or _settlement.due_date is distinct from p_due_date then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return _settlement;
  end if;

  insert into public.settlements (
    owner_id, session_id, direction, counterparty, amount_minor, currency,
    reason, external_method, external_handle, memo, due_date,
    idempotency_key
  )
  values (
    p_owner_id, p_session_id, p_direction, btrim(p_counterparty),
    p_amount_minor, p_currency, btrim(p_reason),
    _external_method, _external_handle, _memo,
    p_due_date, p_idempotency_key
  )
  returning * into _settlement;
  return _settlement;
end;
$$;

create or replace function public.create_settlement(
  p_owner_id uuid,
  p_session_id uuid,
  p_direction text,
  p_counterparty text,
  p_amount_minor bigint,
  p_currency text,
  p_reason text,
  p_external_method text,
  p_external_handle text,
  p_memo text,
  p_due_date date,
  p_idempotency_key text
)
returns public.settlements
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.create_settlement_impl(
    p_owner_id,
    p_session_id,
    p_direction,
    p_counterparty,
    p_amount_minor,
    p_currency,
    p_reason,
    p_external_method,
    p_external_handle,
    p_memo,
    p_due_date,
    p_idempotency_key
  );
$$;

create or replace function private.transition_settlement_impl(
  p_settlement_id uuid,
  p_new_status public.settlement_status,
  p_expected_revision bigint,
  p_idempotency_key text
)
returns public.settlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _settlement public.settlements;
  _event private.settlement_mutation_events;
  _now timestamptz := pg_catalog.clock_timestamp();
  _from_status public.settlement_status;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_settlement_id is null then
    raise exception 'Settlement is required' using errcode = '22023';
  end if;
  if p_new_status is null then
    raise exception 'Settlement status is required' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'Expected settlement revision is required'
      using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _actor_id::text || ':settlement:' || p_idempotency_key,
      0
    )
  );

  select event.* into _event
  from private.settlement_mutation_events as event
  where event.owner_id = _actor_id
    and event.idempotency_key = p_idempotency_key;
  if found then
    if _event.event_type <> 'status_transition'
       or _event.settlement_id <> p_settlement_id
       or _event.expected_revision <> p_expected_revision
       or _event.to_status <> p_new_status then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return pg_catalog.jsonb_populate_record(
      null::public.settlements,
      _event.result
    );
  end if;

  select s.* into _settlement
  from public.settlements as s
  where s.id = p_settlement_id
  for update;
  if not found then
    raise exception 'Settlement not found' using errcode = 'P0002';
  end if;
  if _settlement.owner_id <> _actor_id then
    raise exception 'You may only change your own settlements'
      using errcode = '42501';
  end if;
  if _settlement.revision <> p_expected_revision then
    raise exception 'Settlement revision conflict' using errcode = '40001';
  end if;
  if _settlement.status = p_new_status then
    raise exception 'Settlement is already in the requested status'
      using errcode = '55000';
  end if;
  if not (
    (_settlement.status = 'pending' and p_new_status in ('paid', 'disputed', 'void'))
    or (_settlement.status = 'disputed' and p_new_status in ('pending', 'paid', 'void'))
    or (_settlement.status = 'paid' and p_new_status = 'disputed')
    or (_settlement.status = 'void' and p_new_status = 'pending')
  ) then
    raise exception 'Settlement status transition is not allowed'
      using errcode = '55000';
  end if;

  _from_status := _settlement.status;
  update public.settlements
  set
    status = p_new_status,
    paid_at = case
      when p_new_status = 'paid' then _now
      else null
    end,
    revision = revision + 1,
    updated_at = _now
  where id = p_settlement_id
  returning * into _settlement;

  insert into private.settlement_mutation_events (
    owner_id,
    idempotency_key,
    settlement_id,
    event_type,
    expected_revision,
    from_status,
    to_status,
    confirmation_path,
    result,
    occurred_at
  )
  values (
    _actor_id,
    p_idempotency_key,
    p_settlement_id,
    'status_transition',
    p_expected_revision,
    _from_status,
    p_new_status,
    null,
    to_jsonb(_settlement),
    _now
  );

  return _settlement;
end;
$$;

create or replace function public.transition_settlement(
  p_settlement_id uuid,
  p_new_status public.settlement_status,
  p_expected_revision bigint,
  p_idempotency_key text
)
returns public.settlements
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.transition_settlement_impl(
    p_settlement_id,
    p_new_status,
    p_expected_revision,
    p_idempotency_key
  );
$$;

create or replace function private.attach_settlement_confirmation_impl(
  p_settlement_id uuid,
  p_confirmation_path text,
  p_expected_revision bigint,
  p_idempotency_key text
)
returns public.settlements
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _settlement public.settlements;
  _event private.settlement_mutation_events;
  _now timestamptz := pg_catalog.clock_timestamp();
  _path_pattern text;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_settlement_id is null then
    raise exception 'Settlement is required' using errcode = '22023';
  end if;
  if p_expected_revision is null or p_expected_revision < 1 then
    raise exception 'Expected settlement revision is required'
      using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(
      _actor_id::text || ':settlement:' || p_idempotency_key,
      0
    )
  );

  select event.* into _event
  from private.settlement_mutation_events as event
  where event.owner_id = _actor_id
    and event.idempotency_key = p_idempotency_key;
  if found then
    if _event.event_type <> 'confirmation_attachment'
       or _event.settlement_id <> p_settlement_id
       or _event.expected_revision <> p_expected_revision
       or _event.confirmation_path <> p_confirmation_path then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return pg_catalog.jsonb_populate_record(
      null::public.settlements,
      _event.result
    );
  end if;

  _path_pattern := '^'
    || _actor_id::text
    || '/settlements/'
    || p_settlement_id::text
    || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}'
    || '\.(pdf|jpg|jpeg|png|webp)$';
  if p_confirmation_path is null or p_confirmation_path !~ _path_pattern then
    raise exception 'Settlement confirmation path is invalid'
      using errcode = '22023';
  end if;

  select s.* into _settlement
  from public.settlements as s
  where s.id = p_settlement_id
  for update;
  if not found then
    raise exception 'Settlement not found' using errcode = 'P0002';
  end if;
  if _settlement.owner_id <> _actor_id then
    raise exception 'You may only change your own settlements'
      using errcode = '42501';
  end if;
  if _settlement.revision <> p_expected_revision then
    raise exception 'Settlement revision conflict' using errcode = '40001';
  end if;
  if not exists (
    select 1
    from storage.objects as object
    where object.bucket_id = 'career-documents'
      and object.name = p_confirmation_path
      and object.owner_id = _actor_id::text
      and (storage.foldername(object.name))[1] = _actor_id::text
      and lower(coalesce(object.metadata ->> 'mimetype', '')) in (
        'application/pdf',
        'image/jpeg',
        'image/png',
        'image/webp'
      )
  ) then
    raise exception 'Settlement confirmation object is missing or has a disallowed content type'
      using errcode = '22023';
  end if;

  update public.settlements
  set
    confirmation_path = p_confirmation_path,
    revision = revision + 1,
    updated_at = _now
  where id = p_settlement_id
  returning * into _settlement;

  insert into private.settlement_mutation_events (
    owner_id,
    idempotency_key,
    settlement_id,
    event_type,
    expected_revision,
    from_status,
    to_status,
    confirmation_path,
    result,
    occurred_at
  )
  values (
    _actor_id,
    p_idempotency_key,
    p_settlement_id,
    'confirmation_attachment',
    p_expected_revision,
    null,
    null,
    p_confirmation_path,
    to_jsonb(_settlement),
    _now
  );

  return _settlement;
end;
$$;

create or replace function public.attach_settlement_confirmation(
  p_settlement_id uuid,
  p_confirmation_path text,
  p_expected_revision bigint,
  p_idempotency_key text
)
returns public.settlements
language sql
volatile
security invoker
set search_path = ''
as $$
  select private.attach_settlement_confirmation_impl(
    p_settlement_id,
    p_confirmation_path,
    p_expected_revision,
    p_idempotency_key
  );
$$;

drop policy if exists settlements_owner_all on public.settlements;
drop policy if exists settlements_owner_select on public.settlements;
drop policy if exists settlements_owner_insert on public.settlements;

create policy settlements_owner_select
on public.settlements
for select to authenticated
using (owner_id = (select auth.uid()));

revoke insert, update, delete on table public.settlements from authenticated;

-- ---------------------------------------------------------------------------
-- Function privilege boundary
-- ---------------------------------------------------------------------------

revoke execute on function private.record_game_transaction_impl(
  uuid, uuid, uuid, public.game_transaction_type, bigint, text, text, text
) from public, anon;
revoke execute on function private.finalize_game_core(uuid, text)
  from public, anon, authenticated;
revoke execute on function private.finalize_game_impl(uuid, text)
  from public, anon;
revoke execute on function private.delete_league_impl(uuid, text, text)
  from public, anon;
revoke execute on function private.create_settlement_impl(
  uuid, uuid, text, text, bigint, text, text, text, text, text, date, text
) from public, anon;
revoke execute on function private.reverse_game_transaction_impl(
  uuid, uuid, text, text
) from public, anon;
revoke execute on function private.record_game_result_impl(
  uuid, uuid, integer, bigint, integer, bigint, integer, bigint,
  bigint, bigint, text, uuid, text
) from public, anon;
revoke execute on function private.command_tournament_clock_impl(
  uuid, text, bigint, text
) from public, anon;
revoke execute on function private.record_staking_allocation_impl(
  uuid, uuid, uuid, bigint, bigint, bigint, text, text
) from public, anon;
revoke execute on function private.transition_settlement_impl(
  uuid, public.settlement_status, bigint, text
) from public, anon;
revoke execute on function private.attach_settlement_confirmation_impl(
  uuid, text, bigint, text
) from public, anon;

grant execute on function private.record_game_transaction_impl(
  uuid, uuid, uuid, public.game_transaction_type, bigint, text, text, text
) to authenticated;
grant execute on function private.finalize_game_impl(uuid, text)
  to authenticated;
grant execute on function private.delete_league_impl(uuid, text, text)
  to authenticated;
grant execute on function private.create_settlement_impl(
  uuid, uuid, text, text, bigint, text, text, text, text, text, date, text
) to authenticated;
grant execute on function private.reverse_game_transaction_impl(
  uuid, uuid, text, text
) to authenticated;
grant execute on function private.record_game_result_impl(
  uuid, uuid, integer, bigint, integer, bigint, integer, bigint,
  bigint, bigint, text, uuid, text
) to authenticated;
grant execute on function private.command_tournament_clock_impl(
  uuid, text, bigint, text
) to authenticated;
grant execute on function private.record_staking_allocation_impl(
  uuid, uuid, uuid, bigint, bigint, bigint, text, text
) to authenticated;
grant execute on function private.transition_settlement_impl(
  uuid, public.settlement_status, bigint, text
) to authenticated;
grant execute on function private.attach_settlement_confirmation_impl(
  uuid, text, bigint, text
) to authenticated;

revoke execute on function public.delete_league(uuid, text, text)
  from public, anon, authenticated;
revoke execute on function public.reverse_game_transaction(
  uuid, uuid, text, text
) from public, anon, authenticated;
revoke execute on function public.record_game_result(
  uuid, uuid, integer, bigint, integer, bigint, integer, bigint,
  bigint, bigint, text, uuid, text
) from public, anon, authenticated;
revoke execute on function public.allocate_game_payouts(uuid, jsonb)
  from public, anon, authenticated;
revoke execute on function public.command_tournament_clock(
  uuid, text, bigint, text
) from public, anon, authenticated;
revoke execute on function public.record_staking_allocation(
  uuid, uuid, uuid, bigint, bigint, bigint, text, text
) from public, anon, authenticated;
revoke execute on function public.transition_settlement(
  uuid, public.settlement_status, bigint, text
) from public, anon, authenticated;
revoke execute on function public.attach_settlement_confirmation(
  uuid, text, bigint, text
) from public, anon, authenticated;
revoke execute on function public.create_settlement(
  uuid, uuid, text, text, bigint, text, text, text, text, text, date, text
) from public, anon, authenticated;
revoke execute on function public.record_game_transaction(
  uuid, uuid, uuid, public.game_transaction_type, bigint, text, text, text
) from public, anon, authenticated;
revoke execute on function public.finalize_game(uuid, text)
  from public, anon, authenticated;

grant execute on function public.delete_league(uuid, text, text)
  to authenticated;
grant execute on function public.reverse_game_transaction(
  uuid, uuid, text, text
) to authenticated;
grant execute on function public.record_game_result(
  uuid, uuid, integer, bigint, integer, bigint, integer, bigint,
  bigint, bigint, text, uuid, text
) to authenticated;
grant execute on function public.allocate_game_payouts(uuid, jsonb)
  to authenticated;
grant execute on function public.command_tournament_clock(
  uuid, text, bigint, text
) to authenticated;
grant execute on function public.record_staking_allocation(
  uuid, uuid, uuid, bigint, bigint, bigint, text, text
) to authenticated;
grant execute on function public.transition_settlement(
  uuid, public.settlement_status, bigint, text
) to authenticated;
grant execute on function public.attach_settlement_confirmation(
  uuid, text, bigint, text
) to authenticated;
grant execute on function public.create_settlement(
  uuid, uuid, text, text, bigint, text, text, text, text, text, date, text
) to authenticated;
grant execute on function public.record_game_transaction(
  uuid, uuid, uuid, public.game_transaction_type, bigint, text, text, text
) to authenticated;
grant execute on function public.finalize_game(uuid, text)
  to authenticated;

commit;
