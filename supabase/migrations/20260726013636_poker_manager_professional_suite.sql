-- Poker Manager professional suite
-- Additive, data-preserving migration built against production project
-- aflrgcrerzggnkhwenrr. All money is stored as integer minor units.

begin;

create extension if not exists pgcrypto with schema extensions;

create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

-- Supabase's 2026 Data API defaults are explicit/opt-in. Preserve that posture
-- for future objects even on projects created under the legacy defaults.
alter default privileges in schema public
  revoke all on tables from anon, authenticated;
alter default privileges in schema public
  revoke all on sequences from anon, authenticated;
alter default privileges in schema public
  revoke execute on functions from public, anon, authenticated;

-- The managed RLS event trigger was created in public on the production
-- project. Keep the event trigger attached while moving its implementation out
-- of the exposed schema and removing Data API execution privileges.
do $$
begin
  if to_regprocedure('public.rls_auto_enable()') is not null
     and to_regprocedure('private.rls_auto_enable()') is null then
    execute 'alter function public.rls_auto_enable() set schema private';
  end if;

  if to_regprocedure('private.rls_auto_enable()') is not null then
    execute 'revoke all on function private.rls_auto_enable() from public, anon, authenticated, service_role';
  end if;
end
$$;

do $$ begin
  create type public.game_kind as enum ('cash', 'tournament');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.game_phase as enum (
    'draft', 'inviting', 'registration', 'in_progress', 'closing',
    'finalized', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.rsvp_status as enum (
    'pending', 'yes', 'maybe', 'no', 'waitlisted'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.settlement_status as enum (
    'pending', 'paid', 'disputed', 'void'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.career_session_kind as enum ('cash', 'tournament');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.poker_medium as enum ('live', 'online');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.data_quality as enum ('trusted', 'legacy_incomplete');
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.game_transaction_type as enum (
    'buy_in', 'reload', 'cash_out', 'entry', 're_entry', 'add_on',
    'bounty', 'tip', 'fee', 'payout', 'adjustment'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.ledger_entry_type as enum (
    'opening_balance', 'deposit', 'withdrawal', 'buy_in', 'cash_out',
    'expense', 'winnings', 'transfer', 'adjustment', 'reversal'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.email_queue_status as enum (
    'queued', 'processing', 'sent', 'failed', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.review_status as enum (
    'unreviewed', 'queued', 'reviewing', 'reviewed', 'archived'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.goal_status as enum (
    'active', 'completed', 'paused', 'cancelled'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.calendar_event_type as enum (
    'session', 'tournament', 'series', 'registration', 'travel', 'study',
    'other'
  );
exception when duplicate_object then null;
end $$;

do $$ begin
  create type public.plaid_match_status as enum (
    'unreviewed', 'matched', 'ignored'
  );
exception when duplicate_object then null;
end $$;

-- Reconcile the two checked-in legacy migrations with the hardened production
-- baseline before building on it.
alter table public.leagues
  alter column owner_id set default auth.uid();

do $$
begin
  if exists (select 1 from public.leagues where owner_id is null) then
    raise exception 'Cannot harden leagues.owner_id while NULL legacy rows exist';
  end if;
  alter table public.leagues alter column owner_id set not null;
end
$$;

do $$
begin
  if exists (select 1 from public.seasons where league_id is null)
     or exists (select 1 from public.players where league_id is null)
     or exists (select 1 from public.games where league_id is null)
     or exists (select 1 from public.game_results where game_id is null or player_id is null)
     or exists (select 1 from public.game_invites where game_id is null or player_id is null) then
    raise exception 'Cannot harden required foreign keys while NULL legacy rows exist';
  end if;
  alter table public.seasons alter column league_id set not null;
  alter table public.players alter column league_id set not null;
  alter table public.games alter column league_id set not null;
  alter table public.game_results alter column game_id set not null;
  alter table public.game_results alter column player_id set not null;
  alter table public.game_invites alter column game_id set not null;
  alter table public.game_invites alter column player_id set not null;
end
$$;

alter table public.game_invites
  drop constraint if exists game_invites_rsvp_status_check;
alter table public.game_invites
  alter column rsvp_status drop default;
alter table public.game_invites
  alter column rsvp_status type public.rsvp_status
  using (
    case rsvp_status::text
      when 'confirmed' then 'yes'
      when 'declined' then 'no'
      else rsvp_status::text
    end
  )::public.rsvp_status;
alter table public.game_invites
  alter column rsvp_status set default 'pending'::public.rsvp_status;

alter table public.games
  add column if not exists title text,
  add column if not exists kind public.game_kind,
  add column if not exists phase public.game_phase,
  add column if not exists currency text,
  add column if not exists timezone text,
  add column if not exists capacity integer,
  add column if not exists buy_in_minor bigint,
  add column if not exists small_blind numeric,
  add column if not exists big_blind numeric,
  add column if not exists min_buy_in numeric,
  add column if not exists max_buy_in numeric,
  add column if not exists entry_fee numeric,
  add column if not exists rake numeric,
  add column if not exists small_blind_minor bigint,
  add column if not exists big_blind_minor bigint,
  add column if not exists min_buy_in_minor bigint,
  add column if not exists max_buy_in_minor bigint,
  add column if not exists entry_fee_minor bigint,
  add column if not exists rake_minor bigint,
  add column if not exists bounty_minor bigint,
  add column if not exists started_at timestamptz,
  add column if not exists finalized_at timestamptz,
  add column if not exists finalization_idempotency_key text,
  add column if not exists invite_token_expires_at timestamptz,
  add column if not exists created_by uuid references auth.users(id) on delete set null,
  add column if not exists updated_at timestamptz not null default now();

update public.games
set
  title = coalesce(title, 'Poker Game'),
  kind = coalesce(kind, 'tournament'::public.game_kind),
  phase = coalesce(
    phase,
    case status
      when 'scheduled' then 'registration'::public.game_phase
      when 'in_progress' then 'in_progress'::public.game_phase
      when 'completed' then 'finalized'::public.game_phase
      when 'cancelled' then 'cancelled'::public.game_phase
      else 'draft'::public.game_phase
    end
  ),
  currency = coalesce(currency, 'USD'),
  timezone = coalesce(timezone, 'America/New_York'),
  buy_in_minor = coalesce(buy_in_minor, round(buy_in * 100)::bigint),
  entry_fee_minor = coalesce(entry_fee_minor, round(buy_in * 100)::bigint),
  finalized_at = case
    when status = 'completed' then coalesce(finalized_at, scheduled_date)
    else finalized_at
  end;

alter table public.games
  alter column title set default 'Poker Game',
  alter column title set not null,
  alter column kind set default 'tournament'::public.game_kind,
  alter column kind set not null,
  alter column phase set default 'draft'::public.game_phase,
  alter column phase set not null,
  alter column currency set default 'USD',
  alter column currency set not null,
  alter column timezone set default 'America/New_York',
  alter column timezone set not null,
  alter column buy_in_minor set default 0,
  alter column buy_in_minor set not null,
  alter column entry_fee_minor set default 0,
  alter column entry_fee_minor set not null;

alter table public.games
  drop constraint if exists games_currency_check,
  add constraint games_currency_check
    check (currency ~ '^[A-Z]{3}$'),
  drop constraint if exists games_capacity_check,
  add constraint games_capacity_check
    check (capacity is null or capacity > 0),
  drop constraint if exists games_money_minor_check,
  add constraint games_money_minor_check check (
    buy_in_minor >= 0
    and coalesce(small_blind, 0) >= 0
    and coalesce(big_blind, 0) >= 0
    and coalesce(min_buy_in, 0) >= 0
    and coalesce(max_buy_in, 0) >= 0
    and coalesce(entry_fee, 0) >= 0
    and coalesce(rake, 0) >= 0
    and coalesce(small_blind_minor, 0) >= 0
    and coalesce(big_blind_minor, 0) >= 0
    and coalesce(min_buy_in_minor, 0) >= 0
    and coalesce(max_buy_in_minor, 0) >= 0
    and entry_fee_minor >= 0
    and coalesce(rake_minor, 0) >= 0
    and coalesce(bounty_minor, 0) >= 0
    and (
      max_buy_in_minor is null
      or min_buy_in_minor is null
      or max_buy_in_minor >= min_buy_in_minor
    )
    and (
      max_buy_in is null
      or min_buy_in is null
      or max_buy_in >= min_buy_in
    )
  );

alter table public.game_results
  add column if not exists total_buy_in_minor bigint,
  add column if not exists payout_minor bigint,
  add column if not exists data_quality public.data_quality,
  add column if not exists finalized_at timestamptz;

update public.game_results
set
  total_buy_in_minor = coalesce(
    total_buy_in_minor,
    round(buy_in_amount * 100)::bigint
  ),
  payout_minor = coalesce(payout_minor, round(payout * 100)::bigint),
  data_quality = coalesce(
    data_quality,
    case
      when rebuys > 0 then 'legacy_incomplete'::public.data_quality
      else 'trusted'::public.data_quality
    end
  );

alter table public.game_results
  alter column total_buy_in_minor set default 0,
  alter column total_buy_in_minor set not null,
  alter column payout_minor set default 0,
  alter column payout_minor set not null,
  alter column data_quality set default 'trusted'::public.data_quality,
  alter column data_quality set not null;

create unique index if not exists seasons_one_active_per_league_idx
  on public.seasons (league_id)
  where is_active;
create index if not exists leagues_owner_id_idx on public.leagues (owner_id);
create index if not exists games_created_by_idx on public.games (created_by);
create unique index if not exists games_finalization_idempotency_idx
  on public.games (finalization_idempotency_key)
  where finalization_idempotency_key is not null;

alter table public.leagues
  add column if not exists creation_idempotency_key text;
create unique index if not exists leagues_creation_idempotency_idx
  on public.leagues (owner_id, creation_idempotency_key)
  where creation_idempotency_key is not null;

alter table public.games
  add column if not exists creation_idempotency_key text;
create unique index if not exists games_creation_idempotency_idx
  on public.games (created_by, creation_idempotency_key)
  where creation_idempotency_key is not null;

-- ---------------------------------------------------------------------------
-- Reusable contacts, templates, scoring, and game-night operations
-- ---------------------------------------------------------------------------

create table public.contacts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  display_name text not null check (btrim(display_name) <> ''),
  email text,
  phone text,
  notes text,
  preferred_currency text not null default 'USD'
    check (preferred_currency ~ '^[A-Z]{3}$'),
  merged_into_id uuid references public.contacts(id) on delete set null,
  archived_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (merged_into_id is null or merged_into_id <> id)
);

create index contacts_owner_name_idx
  on public.contacts (owner_id, lower(display_name))
  where archived_at is null;
create index contacts_user_id_idx on public.contacts (user_id)
  where user_id is not null;

-- Each legacy player becomes its own contact. Reusing the player UUID gives a
-- deterministic one-to-one backfill without guessing duplicate identities.
insert into public.contacts (id, owner_id, user_id, display_name, created_at)
select p.id, l.owner_id, p.user_id, p.display_name, p.created_at
from public.players as p
join public.leagues as l on l.id = p.league_id
on conflict (id) do nothing;

alter table public.players
  add column if not exists contact_id uuid
    references public.contacts(id) on delete set null;
update public.players
set contact_id = id
where contact_id is null;
create index if not exists players_contact_id_idx on public.players (contact_id);

create table public.league_contacts (
  league_id uuid not null references public.leagues(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  player_id uuid references public.players(id) on delete set null,
  added_at timestamptz not null default now(),
  primary key (league_id, contact_id),
  unique (league_id, player_id)
);

insert into public.league_contacts (league_id, contact_id, player_id, added_at)
select p.league_id, p.contact_id, p.id, p.created_at
from public.players as p
where p.contact_id is not null
on conflict (league_id, contact_id) do nothing;

create index league_contacts_contact_id_idx
  on public.league_contacts (contact_id);

create table public.contact_groups (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, league_id, name)
);

create table public.contact_group_members (
  group_id uuid not null references public.contact_groups(id) on delete cascade,
  contact_id uuid not null references public.contacts(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (group_id, contact_id)
);

create index contact_group_members_contact_id_idx
  on public.contact_group_members (contact_id);

create table public.league_scoring_rules (
  id uuid primary key default gen_random_uuid(),
  league_id uuid not null references public.leagues(id) on delete cascade,
  version integer not null check (version > 0),
  name text not null default 'League scoring',
  config jsonb not null,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  retired_at timestamptz,
  unique (league_id, version)
);

insert into public.league_scoring_rules (
  league_id, version, name, config, created_by, created_at
)
select id, 1, 'Legacy scoring', points_system, owner_id, created_at
from public.leagues
on conflict (league_id, version) do nothing;

create table public.tournament_structures (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  starting_stack bigint not null default 10000 check (starting_stack > 0),
  late_registration_level integer check (late_registration_level is null or late_registration_level > 0),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.tournament_structure_levels (
  id uuid primary key default gen_random_uuid(),
  structure_id uuid not null
    references public.tournament_structures(id) on delete cascade,
  level_number integer not null check (level_number > 0),
  small_blind bigint not null default 0 check (small_blind >= 0),
  big_blind bigint not null default 0 check (big_blind >= 0),
  ante bigint not null default 0 check (ante >= 0),
  duration_seconds integer not null default 1200 check (duration_seconds > 0),
  is_break boolean not null default false,
  label text,
  unique (structure_id, level_number),
  check (is_break or big_blind >= small_blind)
);

create table public.game_templates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid not null references public.leagues(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  kind public.game_kind not null,
  timezone text not null default 'America/New_York',
  recurrence_rule text,
  capacity integer check (capacity is null or capacity > 0),
  location text,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  buy_in_minor bigint not null default 0 check (buy_in_minor >= 0),
  small_blind_minor bigint check (small_blind_minor is null or small_blind_minor >= 0),
  big_blind_minor bigint check (big_blind_minor is null or big_blind_minor >= 0),
  min_buy_in_minor bigint check (min_buy_in_minor is null or min_buy_in_minor >= 0),
  max_buy_in_minor bigint check (max_buy_in_minor is null or max_buy_in_minor >= 0),
  entry_fee_minor bigint not null default 0 check (entry_fee_minor >= 0),
  rake_minor bigint not null default 0 check (rake_minor >= 0),
  bounty_minor bigint not null default 0 check (bounty_minor >= 0),
  payout_rules jsonb not null default '{}'::jsonb,
  reminder_schedule jsonb not null default '[]'::jsonb,
  structure_id uuid
    references public.tournament_structures(id) on delete set null,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (
    max_buy_in_minor is null
    or min_buy_in_minor is null
    or max_buy_in_minor >= min_buy_in_minor
  )
);

create index game_templates_league_id_idx on public.game_templates (league_id);

create table public.game_template_invitees (
  id uuid primary key default gen_random_uuid(),
  template_id uuid not null references public.game_templates(id) on delete cascade,
  contact_id uuid references public.contacts(id) on delete cascade,
  group_id uuid references public.contact_groups(id) on delete cascade,
  created_at timestamptz not null default now(),
  check (num_nonnulls(contact_id, group_id) = 1)
);

create unique index game_template_invitees_contact_idx
  on public.game_template_invitees (template_id, contact_id)
  where contact_id is not null;
create unique index game_template_invitees_group_idx
  on public.game_template_invitees (template_id, group_id)
  where group_id is not null;

alter table public.games
  add column if not exists template_id uuid
    references public.game_templates(id) on delete set null,
  add column if not exists scoring_rule_id uuid
    references public.league_scoring_rules(id) on delete restrict;

update public.games as g
set scoring_rule_id = r.id
from public.league_scoring_rules as r
where r.league_id = g.league_id
  and r.version = 1
  and g.scoring_rule_id is null;

create index if not exists games_template_id_idx on public.games (template_id);
create index if not exists games_scoring_rule_id_idx on public.games (scoring_rule_id);

alter table public.game_invites
  alter column player_id drop not null,
  add column if not exists contact_id uuid
    references public.contacts(id) on delete set null,
  add column if not exists token_hash text,
  add column if not exists token_expires_at timestamptz,
  add column if not exists token_revoked_at timestamptz,
  add column if not exists guest_count integer not null default 0,
  add column if not exists waitlist_position integer,
  add column if not exists invited_by uuid references auth.users(id) on delete set null,
  add column if not exists last_sent_at timestamptz,
  add column if not exists email_status text,
  add column if not exists updated_at timestamptz not null default now();

-- The hardened legacy trigger permits only player-owned RSVP changes and
-- therefore rejects this ownerless administrative backfill. It is recreated
-- below with the full guest/contact rules before the transaction commits.
drop trigger if exists guard_player_rsvp_update on public.game_invites;

update public.game_invites as gi
set contact_id = p.contact_id
from public.players as p
where p.id = gi.player_id
  and gi.contact_id is null;

alter table public.game_invites
  drop constraint if exists game_invites_guest_count_check,
  add constraint game_invites_guest_count_check
    check (guest_count between 0 and 20),
  drop constraint if exists game_invites_token_hash_check,
  add constraint game_invites_token_hash_check
    check (
      token_hash is null
      or token_hash ~ '^[0-9a-f]{64}$'
    ),
  drop constraint if exists game_invites_identity_check,
  add constraint game_invites_identity_check
    check (num_nonnulls(player_id, contact_id) >= 1 or token_hash is not null);

create unique index game_invites_token_hash_idx
  on public.game_invites (token_hash)
  where token_hash is not null;
create unique index game_invites_game_contact_idx
  on public.game_invites (game_id, contact_id)
  where contact_id is not null;

create table public.game_participants (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  invite_id uuid references public.game_invites(id) on delete set null,
  contact_id uuid references public.contacts(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  display_name text not null check (btrim(display_name) <> ''),
  rsvp_status public.rsvp_status not null default 'pending',
  guest_count integer not null default 0 check (guest_count between 0 and 20),
  checked_in_at timestamptz,
  finish_position integer check (finish_position is null or finish_position > 0),
  eliminated_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (invite_id)
);

create unique index game_participants_game_player_idx
  on public.game_participants (game_id, player_id)
  where player_id is not null;
create unique index game_participants_game_contact_idx
  on public.game_participants (game_id, contact_id)
  where contact_id is not null;
create unique index game_participants_game_finish_idx
  on public.game_participants (game_id, finish_position)
  where finish_position is not null;

insert into public.game_participants (
  game_id, invite_id, contact_id, player_id, display_name, rsvp_status,
  guest_count, created_at
)
select
  gi.game_id,
  gi.id,
  gi.contact_id,
  gi.player_id,
  coalesce(c.display_name, p.display_name, 'Guest'),
  gi.rsvp_status,
  gi.guest_count,
  gi.created_at
from public.game_invites as gi
left join public.contacts as c on c.id = gi.contact_id
left join public.players as p on p.id = gi.player_id
on conflict (invite_id) do nothing;

create table public.game_tables (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  table_number integer not null check (table_number > 0),
  name text,
  capacity integer check (capacity is null or capacity > 0),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (game_id, table_number)
);

create table public.game_seats (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  participant_id uuid not null
    references public.game_participants(id) on delete cascade,
  table_number integer not null check (table_number > 0),
  seat_number integer not null check (seat_number > 0),
  active boolean not null default true,
  seated_at timestamptz not null default now(),
  left_at timestamptz,
  unique (game_id, participant_id)
);

create unique index game_seats_active_position_idx
  on public.game_seats (game_id, table_number, seat_number)
  where active;

create table public.tournament_levels (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  level_number integer not null check (level_number > 0),
  small_blind bigint not null default 0 check (small_blind >= 0),
  big_blind bigint not null default 0 check (big_blind >= 0),
  ante bigint not null default 0 check (ante >= 0),
  duration_seconds integer not null default 1200 check (duration_seconds > 0),
  is_break boolean not null default false,
  label text,
  unique (game_id, level_number),
  check (is_break or big_blind >= small_blind)
);

create table public.tournament_clocks (
  game_id uuid primary key references public.games(id) on delete cascade,
  current_level integer not null default 1 check (current_level > 0),
  remaining_seconds integer not null default 1200 check (remaining_seconds >= 0),
  is_running boolean not null default false,
  started_at timestamptz,
  paused_at timestamptz,
  revision bigint not null default 0 check (revision >= 0),
  updated_at timestamptz not null default now()
);

create table public.game_transactions (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  participant_id uuid references public.game_participants(id) on delete set null,
  player_id uuid references public.players(id) on delete set null,
  kind public.game_transaction_type not null,
  amount_minor bigint not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  note text,
  reversal_of_id uuid references public.game_transactions(id) on delete restrict,
  effect_multiplier smallint not null default 1
    check (effect_multiplier in (-1, 1)),
  reversed_at timestamptz,
  idempotency_key text not null,
  created_by uuid not null references auth.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  check (kind = 'adjustment' or amount_minor >= 0),
  check (amount_minor <> 0 or kind in ('fee', 'tip', 'adjustment')),
  check (
    (reversal_of_id is null and effect_multiplier = 1)
    or (reversal_of_id is not null and effect_multiplier = -1)
  ),
  unique (created_by, idempotency_key),
  unique (reversal_of_id)
);

create index game_transactions_game_created_idx
  on public.game_transactions (game_id, created_at);
create index game_transactions_participant_idx
  on public.game_transactions (participant_id)
  where participant_id is not null;

create table public.game_eliminations (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games(id) on delete cascade,
  participant_id uuid not null
    references public.game_participants(id) on delete cascade,
  eliminated_by_participant_id uuid
    references public.game_participants(id) on delete set null,
  bounty_minor bigint not null default 0 check (bounty_minor >= 0),
  occurred_at timestamptz not null default now(),
  note text,
  unique (game_id, participant_id)
);

create table public.game_reconciliations (
  game_id uuid primary key references public.games(id) on delete cascade,
  inflow_minor bigint not null default 0,
  outflow_minor bigint not null default 0,
  variance_minor bigint not null default 0,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  status text not null default 'pending'
    check (status in ('pending', 'balanced', 'warning')),
  calculated_at timestamptz not null default now(),
  finalized_by uuid references auth.users(id) on delete set null
);

create index game_participants_game_id_idx on public.game_participants (game_id);
create index game_seats_game_id_idx on public.game_seats (game_id);
create index tournament_levels_game_id_idx on public.tournament_levels (game_id);

-- ---------------------------------------------------------------------------
-- Private professional career, bankroll, settlement, and study suite
-- ---------------------------------------------------------------------------

create table public.career_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  home_game_id uuid references public.games(id) on delete set null,
  session_kind public.career_session_kind not null,
  medium public.poker_medium not null,
  played_at timestamptz not null,
  ended_at timestamptz,
  venue text,
  game_variant text not null check (btrim(game_variant) <> ''),
  stakes text,
  duration_minutes integer check (duration_minutes is null or duration_minutes >= 0),
  hands_played integer check (hands_played is null or hands_played >= 0),
  entries integer not null default 1 check (entries > 0),
  buy_in_minor bigint not null default 0 check (buy_in_minor >= 0),
  fees_minor bigint not null default 0 check (fees_minor >= 0),
  payout_minor bigint not null default 0 check (payout_minor >= 0),
  profit_minor bigint generated always as
    (payout_minor - buy_in_minor - fees_minor) stored,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  timezone text not null default 'America/New_York',
  notes text,
  tags text[] not null default '{}'::text[],
  data_quality public.data_quality not null default 'trusted',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, home_game_id),
  check (ended_at is null or ended_at >= played_at)
);

create index career_sessions_owner_played_idx
  on public.career_sessions (owner_id, played_at desc);
create index career_sessions_owner_filters_idx
  on public.career_sessions (owner_id, session_kind, medium, data_quality);

create table public.bankroll_accounts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  account_type text not null
    check (account_type in ('cash', 'bank', 'online', 'other')),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  opening_balance_minor bigint not null default 0,
  is_archived boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, name)
);

create index bankroll_accounts_owner_active_idx
  on public.bankroll_accounts (owner_id, is_archived);

create table public.settlements (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  game_id uuid references public.games(id) on delete set null,
  session_id uuid references public.career_sessions(id) on delete set null,
  payer_contact_id uuid references public.contacts(id) on delete set null,
  recipient_contact_id uuid references public.contacts(id) on delete set null,
  direction text not null check (direction in ('payable', 'receivable')),
  counterparty text not null check (btrim(counterparty) <> ''),
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  reason text not null check (btrim(reason) <> ''),
  external_method text,
  external_handle text,
  provider_url text,
  memo text,
  due_date date,
  status public.settlement_status not null default 'pending',
  paid_at timestamptz,
  confirmation_path text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  check (payer_contact_id is null or payer_contact_id <> recipient_contact_id),
  check ((status = 'paid') = (paid_at is not null) or status <> 'paid')
);

create index settlements_owner_status_idx
  on public.settlements (owner_id, status, due_date);
create index settlements_game_id_idx on public.settlements (game_id)
  where game_id is not null;

create table public.bankroll_ledger_entries (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  account_id uuid not null
    references public.bankroll_accounts(id) on delete restrict,
  session_id uuid references public.career_sessions(id) on delete set null,
  settlement_id uuid references public.settlements(id) on delete set null,
  entry_type public.ledger_entry_type not null,
  amount_minor bigint not null check (amount_minor <> 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  occurred_at timestamptz not null,
  description text not null check (btrim(description) <> ''),
  external_reference text,
  reversal_of_id uuid
    references public.bankroll_ledger_entries(id) on delete restrict,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  unique (owner_id, idempotency_key),
  unique (reversal_of_id)
);

create index bankroll_ledger_owner_occurred_idx
  on public.bankroll_ledger_entries (owner_id, occurred_at desc);
create index bankroll_ledger_account_occurred_idx
  on public.bankroll_ledger_entries (account_id, occurred_at desc);
create index bankroll_ledger_session_idx
  on public.bankroll_ledger_entries (session_id)
  where session_id is not null;

create table public.poker_trips (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  name text not null check (btrim(name) <> ''),
  destination text,
  starts_on date not null,
  ends_on date,
  budget_minor bigint check (budget_minor is null or budget_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_on is null or ends_on >= starts_on)
);

create index poker_trips_owner_dates_idx
  on public.poker_trips (owner_id, starts_on desc);

create table public.career_expenses (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  trip_id uuid references public.poker_trips(id) on delete set null,
  session_id uuid references public.career_sessions(id) on delete set null,
  category text not null check (
    category in (
      'travel', 'lodging', 'meal', 'entry_fee', 'study', 'equipment',
      'other'
    )
  ),
  merchant text,
  amount_minor bigint not null check (amount_minor > 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  incurred_on date not null,
  deductible boolean not null default false,
  notes text,
  receipt_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index career_expenses_owner_date_idx
  on public.career_expenses (owner_id, incurred_on desc);
create index career_expenses_trip_idx on public.career_expenses (trip_id)
  where trip_id is not null;

create table public.staking_deals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  backer_name text not null check (btrim(backer_name) <> ''),
  name text not null check (btrim(name) <> ''),
  player_share_bps integer not null check (player_share_bps between 0 and 10000),
  backer_share_bps integer not null check (backer_share_bps between 0 and 10000),
  markup_bps integer not null default 10000 check (markup_bps >= 0),
  makeup_minor bigint not null default 0 check (makeup_minor >= 0),
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  starts_on date not null,
  ends_on date,
  status text not null default 'draft'
    check (status in ('draft', 'active', 'completed', 'cancelled')),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (player_share_bps + backer_share_bps = 10000),
  check (ends_on is null or ends_on >= starts_on)
);

create index staking_deals_owner_status_idx
  on public.staking_deals (owner_id, status);

create table public.staking_allocations (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  deal_id uuid not null references public.staking_deals(id) on delete cascade,
  session_id uuid not null
    references public.career_sessions(id) on delete cascade,
  allocated_buy_in_minor bigint not null check (allocated_buy_in_minor >= 0),
  backer_result_minor bigint not null default 0,
  player_result_minor bigint not null default 0,
  settled_at timestamptz,
  notes text,
  created_at timestamptz not null default now(),
  unique (deal_id, session_id)
);

create index staking_allocations_owner_idx
  on public.staking_allocations (owner_id, created_at desc);

create table public.professional_calendar_events (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.career_sessions(id) on delete set null,
  trip_id uuid references public.poker_trips(id) on delete set null,
  title text not null check (btrim(title) <> ''),
  event_type public.calendar_event_type not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  timezone text not null default 'America/New_York',
  location text,
  exposure_minor bigint check (exposure_minor is null or exposure_minor >= 0),
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (ends_at is null or ends_at >= starts_at)
);

create index professional_calendar_owner_starts_idx
  on public.professional_calendar_events (owner_id, starts_at);

create table public.poker_hands (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  session_id uuid references public.career_sessions(id) on delete set null,
  played_at timestamptz not null,
  source text not null check (source in ('manual', 'import')),
  source_hand_id text,
  game_variant text not null check (btrim(game_variant) <> ''),
  stakes text,
  position text,
  hero_cards text,
  board text,
  pot_minor bigint,
  result_minor bigint,
  currency text not null default 'USD' check (currency ~ '^[A-Z]{3}$'),
  opponent_aliases text[] not null default '{}'::text[],
  tags text[] not null default '{}'::text[],
  hand_history text not null,
  notes text,
  review_status public.review_status not null default 'queued',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index poker_hands_owner_review_idx
  on public.poker_hands (owner_id, review_status, played_at desc);
create unique index poker_hands_owner_source_id_idx
  on public.poker_hands (owner_id, source_hand_id)
  where source_hand_id is not null;

create table public.poker_opponents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  alias text not null check (btrim(alias) <> ''),
  notes text,
  tags text[] not null default '{}'::text[],
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, alias)
);

create table public.hand_opponents (
  owner_id uuid not null references auth.users(id) on delete cascade,
  hand_id uuid not null references public.poker_hands(id) on delete cascade,
  opponent_id uuid not null references public.poker_opponents(id) on delete cascade,
  seat_number integer check (seat_number is null or seat_number > 0),
  notes text,
  primary key (hand_id, opponent_id)
);

create table public.study_sessions (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  studied_at timestamptz not null,
  duration_minutes integer not null check (duration_minutes > 0),
  topic text not null check (btrim(topic) <> ''),
  resource text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index study_sessions_owner_studied_idx
  on public.study_sessions (owner_id, studied_at desc);

create table public.study_session_hands (
  owner_id uuid not null references auth.users(id) on delete cascade,
  study_session_id uuid not null
    references public.study_sessions(id) on delete cascade,
  hand_id uuid not null references public.poker_hands(id) on delete cascade,
  primary key (study_session_id, hand_id)
);

create table public.career_goals (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  title text not null check (btrim(title) <> ''),
  metric text,
  target_value numeric,
  current_value numeric,
  starts_on date not null,
  due_on date,
  status public.goal_status not null default 'active',
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (due_on is null or due_on >= starts_on)
);

create index career_goals_owner_status_idx
  on public.career_goals (owner_id, status);

create table public.career_attachments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  entity_type text not null check (
    entity_type in (
      'session', 'expense', 'settlement', 'trip', 'hand', 'study', 'goal'
    )
  ),
  entity_id uuid not null,
  storage_path text not null,
  file_name text not null,
  content_type text,
  size_bytes bigint check (size_bytes is null or size_bytes >= 0),
  created_at timestamptz not null default now(),
  unique (owner_id, storage_path)
);

-- ---------------------------------------------------------------------------
-- Resend queue and webhook state. Email stays disabled until a verified sender
-- domain is configured for an owner.
-- ---------------------------------------------------------------------------

create table public.email_settings (
  owner_id uuid primary key references auth.users(id) on delete cascade,
  provider text not null default 'resend' check (provider = 'resend'),
  enabled boolean not null default false,
  sender_domain text,
  from_address text,
  reply_to text,
  reminder_schedule jsonb not null default '[]'::jsonb,
  updated_at timestamptz not null default now(),
  check (
    not enabled
    or (
      sender_domain is not null
      and from_address is not null
      and lower(sender_domain) not like '%.pages.dev'
    )
  )
);

create table public.email_queue (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  league_id uuid references public.leagues(id) on delete cascade,
  game_id uuid references public.games(id) on delete cascade,
  invite_id uuid references public.game_invites(id) on delete cascade,
  settlement_id uuid references public.settlements(id) on delete cascade,
  to_email text not null check (position('@' in to_email) > 1),
  from_email text not null check (position('@' in from_email) > 1),
  subject text not null check (btrim(subject) <> ''),
  html_body text not null,
  text_body text,
  status public.email_queue_status not null default 'queued',
  delivery_status text,
  attempt_count integer not null default 0 check (attempt_count >= 0),
  next_attempt_at timestamptz not null default now(),
  provider_message_id text,
  last_error text,
  idempotency_key text not null,
  created_at timestamptz not null default now(),
  processed_at timestamptz,
  unique (owner_id, idempotency_key)
);

create index email_queue_dispatch_idx
  on public.email_queue (next_attempt_at, created_at)
  where status in ('queued', 'failed');
create unique index email_queue_provider_message_idx
  on public.email_queue (provider_message_id)
  where provider_message_id is not null;

create table public.email_webhook_events (
  id uuid primary key default gen_random_uuid(),
  queue_id uuid references public.email_queue(id) on delete set null,
  provider_event_id text not null unique,
  event_type text not null check (
    event_type in (
      'sent', 'delivered', 'delivery_delayed', 'bounced', 'complained',
      'opened', 'clicked', 'failed'
    )
  ),
  occurred_at timestamptz not null,
  payload jsonb not null,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Optional, read-only Plaid Transactions reconciliation.
-- ---------------------------------------------------------------------------

create table public.plaid_connections (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  item_id text not null,
  access_token_ciphertext text,
  cursor text,
  institution_name text,
  status text not null default 'active'
    check (status in ('active', 'login_required', 'disconnected', 'error')),
  last_error text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, item_id)
);

create table public.plaid_reconciliation_candidates (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users(id) on delete cascade,
  connection_id uuid not null references public.plaid_connections(id) on delete cascade,
  plaid_transaction_id text not null,
  account_id text not null,
  name text not null,
  amount_minor bigint not null,
  currency text not null check (currency ~ '^[A-Z]{3}$'),
  date date not null,
  pending boolean not null default false,
  removed_at timestamptz,
  raw_payload jsonb not null default '{}'::jsonb,
  match_status public.plaid_match_status not null default 'unreviewed',
  matched_ledger_entry_id uuid
    references public.bankroll_ledger_entries(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (plaid_transaction_id),
  check (
    (match_status = 'matched' and matched_ledger_entry_id is not null)
    or match_status <> 'matched'
  )
);

create index plaid_candidates_owner_review_idx
  on public.plaid_reconciliation_candidates
  (owner_id, match_status, date desc);

create table public.plaid_webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider_event_id text not null unique,
  item_id text,
  event_type text not null,
  payload jsonb not null,
  processed_at timestamptz,
  received_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Private authorization and integrity helpers
-- ---------------------------------------------------------------------------

create or replace function private.is_service_role()
returns boolean
language sql
stable
security invoker
set search_path = ''
as $$
  select coalesce((select auth.jwt() ->> 'role'), '') = 'service_role';
$$;

create or replace function private.is_league_owner(_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.leagues as l
      where l.id = _league_id
        and l.owner_id = (select auth.uid())
    );
$$;

create or replace function private.is_league_admin(_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.league_members as lm
      where lm.league_id = _league_id
        and lm.user_id = (select auth.uid())
        and lm.role = 'admin'
    );
$$;

create or replace function private.is_league_member(_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.league_members as lm
      where lm.league_id = _league_id
        and lm.user_id = (select auth.uid())
    );
$$;

create or replace function private.can_access_league(_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_league_owner(_league_id)
    or private.is_league_member(_league_id);
$$;

create or replace function private.can_manage_league(_league_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select private.is_league_owner(_league_id)
    or private.is_league_admin(_league_id);
$$;

create or replace function private.can_access_game(_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.games as g
    where g.id = _game_id
      and private.can_access_league(g.league_id)
  );
$$;

create or replace function private.can_manage_game(_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.games as g
    where g.id = _game_id
      and private.can_manage_league(g.league_id)
  );
$$;

create or replace function private.owns_player(_player_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.players as p
      where p.id = _player_id
        and p.user_id = (select auth.uid())
    );
$$;

create or replace function private.is_invited_to_game(_game_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.game_invites as gi
      left join public.players as p on p.id = gi.player_id
      left join public.contacts as c on c.id = gi.contact_id
      where gi.game_id = _game_id
        and (
          p.user_id = (select auth.uid())
          or c.user_id = (select auth.uid())
        )
    );
$$;

create or replace function private.can_manage_contact(_contact_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select (select auth.uid()) is not null
    and exists (
      select 1
      from public.contacts as c
      where c.id = _contact_id
        and (
          c.owner_id = (select auth.uid())
          or exists (
            select 1
            from public.league_contacts as lc
            where lc.contact_id = c.id
              and private.can_manage_league(lc.league_id)
          )
        )
    );
$$;

create or replace function private.add_league_owner_membership()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.league_members (league_id, user_id, role)
  values (new.id, new.owner_id, 'owner')
  on conflict (league_id, user_id)
  do update set role = 'owner';
  return new;
end;
$$;

create or replace function private.set_owner_id_on_insert()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required'
      using errcode = '42501';
  end if;
  new.owner_id := (select auth.uid());
  return new;
end;
$$;

create or replace function private.prevent_membership_key_change()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if new.league_id is distinct from old.league_id
     or new.user_id is distinct from old.user_id then
    raise exception 'Membership league_id and user_id cannot be changed'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.validate_game_season_league()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.season_id is not null
     and not exists (
       select 1
       from public.seasons as s
       where s.id = new.season_id
         and s.league_id = new.league_id
     ) then
    raise exception 'Game season must belong to the same league as the game'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.validate_game_player_league()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _game_league uuid;
  _player_league uuid;
begin
  if new.player_id is null then
    return new;
  end if;

  select g.league_id into _game_league
  from public.games as g
  where g.id = new.game_id;

  select p.league_id into _player_league
  from public.players as p
  where p.id = new.player_id;

  if _game_league is null
     or _player_league is null
     or _game_league is distinct from _player_league then
    raise exception 'Game and player must belong to the same league'
      using errcode = '23514';
  end if;
  return new;
end;
$$;

create or replace function private.guard_player_rsvp_update()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if private.is_service_role() or private.can_manage_game(old.game_id) then
    return new;
  end if;

  if not private.owns_player(old.player_id) then
    raise exception 'You may only RSVP to your own invite'
      using errcode = '42501';
  end if;

  if new.id is distinct from old.id
     or new.game_id is distinct from old.game_id
     or new.player_id is distinct from old.player_id
     or new.contact_id is distinct from old.contact_id
     or new.token_hash is distinct from old.token_hash
     or new.token_expires_at is distinct from old.token_expires_at
     or new.token_revoked_at is distinct from old.token_revoked_at
     or new.waitlist_position is distinct from old.waitlist_position
     or new.invited_by is distinct from old.invited_by
     or new.created_at is distinct from old.created_at then
    raise exception 'Players may only change RSVP status and guest count'
      using errcode = '42501';
  end if;

  new.responded_at := case
    when new.rsvp_status = 'pending' then null
    else now()
  end;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.touch_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.sync_game_compatibility()
returns trigger
language plpgsql
security invoker
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE'
     and new.phase is not distinct from old.phase
     and new.status is distinct from old.status then
    new.phase := case new.status
      when 'in_progress' then 'in_progress'::public.game_phase
      when 'completed' then 'finalized'::public.game_phase
      when 'cancelled' then 'cancelled'::public.game_phase
      else 'registration'::public.game_phase
    end;
  elsif tg_op = 'INSERT'
        and new.phase = 'draft'
        and new.status <> 'scheduled' then
    new.phase := case new.status
      when 'in_progress' then 'in_progress'::public.game_phase
      when 'completed' then 'finalized'::public.game_phase
      when 'cancelled' then 'cancelled'::public.game_phase
      else 'draft'::public.game_phase
    end;
  end if;

  if tg_op = 'INSERT' then
    if new.buy_in_minor = 0 and new.buy_in <> 0 then
      new.buy_in_minor := round(new.buy_in * 100)::bigint;
    elsif new.buy_in = 0 and new.buy_in_minor <> 0 then
      new.buy_in := new.buy_in_minor::numeric / 100;
    end if;

    if new.small_blind is not null and new.small_blind_minor is null then
      new.small_blind_minor := round(new.small_blind * 100)::bigint;
    elsif new.small_blind is null and new.small_blind_minor is not null then
      new.small_blind := new.small_blind_minor::numeric / 100;
    end if;
    if new.big_blind is not null and new.big_blind_minor is null then
      new.big_blind_minor := round(new.big_blind * 100)::bigint;
    elsif new.big_blind is null and new.big_blind_minor is not null then
      new.big_blind := new.big_blind_minor::numeric / 100;
    end if;
    if new.min_buy_in is not null and new.min_buy_in_minor is null then
      new.min_buy_in_minor := round(new.min_buy_in * 100)::bigint;
    elsif new.min_buy_in is null and new.min_buy_in_minor is not null then
      new.min_buy_in := new.min_buy_in_minor::numeric / 100;
    end if;
    if new.max_buy_in is not null and new.max_buy_in_minor is null then
      new.max_buy_in_minor := round(new.max_buy_in * 100)::bigint;
    elsif new.max_buy_in is null and new.max_buy_in_minor is not null then
      new.max_buy_in := new.max_buy_in_minor::numeric / 100;
    end if;
    if new.entry_fee is not null and new.entry_fee_minor = 0 then
      new.entry_fee_minor := round(new.entry_fee * 100)::bigint;
    elsif new.entry_fee is null and new.entry_fee_minor <> 0 then
      new.entry_fee := new.entry_fee_minor::numeric / 100;
    end if;
    if new.rake is not null and new.rake_minor is null then
      new.rake_minor := round(new.rake * 100)::bigint;
    elsif new.rake is null and new.rake_minor is not null then
      new.rake := new.rake_minor::numeric / 100;
    end if;
  else
    if new.buy_in is distinct from old.buy_in then
      new.buy_in_minor := round(new.buy_in * 100)::bigint;
    elsif new.buy_in_minor is distinct from old.buy_in_minor then
      new.buy_in := new.buy_in_minor::numeric / 100;
    end if;
    if new.small_blind is distinct from old.small_blind then
      new.small_blind_minor := case when new.small_blind is null then null
        else round(new.small_blind * 100)::bigint end;
    elsif new.small_blind_minor is distinct from old.small_blind_minor then
      new.small_blind := case when new.small_blind_minor is null then null
        else new.small_blind_minor::numeric / 100 end;
    end if;
    if new.big_blind is distinct from old.big_blind then
      new.big_blind_minor := case when new.big_blind is null then null
        else round(new.big_blind * 100)::bigint end;
    elsif new.big_blind_minor is distinct from old.big_blind_minor then
      new.big_blind := case when new.big_blind_minor is null then null
        else new.big_blind_minor::numeric / 100 end;
    end if;
    if new.min_buy_in is distinct from old.min_buy_in then
      new.min_buy_in_minor := case when new.min_buy_in is null then null
        else round(new.min_buy_in * 100)::bigint end;
    elsif new.min_buy_in_minor is distinct from old.min_buy_in_minor then
      new.min_buy_in := case when new.min_buy_in_minor is null then null
        else new.min_buy_in_minor::numeric / 100 end;
    end if;
    if new.max_buy_in is distinct from old.max_buy_in then
      new.max_buy_in_minor := case when new.max_buy_in is null then null
        else round(new.max_buy_in * 100)::bigint end;
    elsif new.max_buy_in_minor is distinct from old.max_buy_in_minor then
      new.max_buy_in := case when new.max_buy_in_minor is null then null
        else new.max_buy_in_minor::numeric / 100 end;
    end if;
    if new.entry_fee is distinct from old.entry_fee then
      new.entry_fee_minor := case when new.entry_fee is null then 0
        else round(new.entry_fee * 100)::bigint end;
    elsif new.entry_fee_minor is distinct from old.entry_fee_minor then
      new.entry_fee := new.entry_fee_minor::numeric / 100;
    end if;
    if new.rake is distinct from old.rake then
      new.rake_minor := case when new.rake is null then null
        else round(new.rake * 100)::bigint end;
    elsif new.rake_minor is distinct from old.rake_minor then
      new.rake := case when new.rake_minor is null then null
        else new.rake_minor::numeric / 100 end;
    end if;
  end if;

  new.status := case new.phase
    when 'in_progress' then 'in_progress'
    when 'closing' then 'in_progress'
    when 'finalized' then 'completed'
    when 'cancelled' then 'cancelled'
    else 'scheduled'
  end;
  new.updated_at := now();
  return new;
end;
$$;

create or replace function private.sync_invite_participant()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  _display_name text;
begin
  if tg_op = 'DELETE' then
    delete from public.game_participants where invite_id = old.id;
    return old;
  end if;

  select coalesce(c.display_name, p.display_name, 'Guest')
  into _display_name
  from (select 1) as one
  left join public.contacts as c on c.id = new.contact_id
  left join public.players as p on p.id = new.player_id;

  insert into public.game_participants (
    game_id, invite_id, contact_id, player_id, display_name, rsvp_status,
    guest_count, created_at, updated_at
  )
  values (
    new.game_id, new.id, new.contact_id, new.player_id,
    coalesce(_display_name, 'Guest'), new.rsvp_status, new.guest_count,
    new.created_at, now()
  )
  on conflict (invite_id) do update
  set
    contact_id = excluded.contact_id,
    player_id = excluded.player_id,
    display_name = excluded.display_name,
    rsvp_status = excluded.rsvp_status,
    guest_count = excluded.guest_count,
    updated_at = now();
  return new;
end;
$$;

create or replace function private.guard_finalized_game()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
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
  _game_id := case when tg_op = 'DELETE' then old.game_id else new.game_id end;
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
  if tg_op in ('UPDATE', 'DELETE') then
    raise exception 'Game transactions are append-only; create a reversal or adjustment'
      using errcode = '55000';
  end if;

  if exists (
    select 1 from public.games as g
    where g.id = new.game_id and g.phase = 'finalized'
  ) and new.kind <> 'adjustment'
    and new.reversal_of_id is null then
    raise exception 'Only reversals or adjustments may be posted after finalization'
      using errcode = '55000';
  end if;
  return new;
end;
$$;

create or replace function private.guard_ledger_append_only()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  raise exception 'Bankroll ledger entries are immutable; post a reversal'
    using errcode = '55000';
end;
$$;

create or replace function private.calculate_points(
  _config jsonb,
  _finish_position integer,
  _field_size integer,
  _total_buy_in_minor bigint
)
returns numeric
language plpgsql
immutable
security invoker
set search_path = ''
as $$
declare
  _type text := coalesce(_config ->> 'type', 'position');
  _result numeric;
begin
  if _type = 'position' then
    _result := coalesce(
      nullif(_config -> 'positionPoints' ->> _finish_position::text, '')::numeric,
      nullif(_config ->> 'participationPoints', '')::numeric,
      0
    );
  else
    _result := coalesce(nullif(_config ->> 'basePoints', '')::numeric, 0)
      + (
        coalesce(
          nullif(_config ->> 'buyInMultiplier', '')::numeric,
          0
        ) * (_total_buy_in_minor::numeric / 100)
      );
  end if;
  return _result;
end;
$$;

revoke all on all functions in schema private from public, anon;
grant execute on function private.is_service_role() to authenticated, service_role;
grant execute on function private.is_league_owner(uuid) to authenticated;
grant execute on function private.is_league_admin(uuid) to authenticated;
grant execute on function private.is_league_member(uuid) to authenticated;
grant execute on function private.can_access_league(uuid) to authenticated;
grant execute on function private.can_manage_league(uuid) to authenticated;
grant execute on function private.can_access_game(uuid) to authenticated;
grant execute on function private.can_manage_game(uuid) to authenticated;
grant execute on function private.owns_player(uuid) to authenticated;
grant execute on function private.is_invited_to_game(uuid) to authenticated;
grant execute on function private.can_manage_contact(uuid) to authenticated;

create or replace function private.validate_participant_game()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.participant_id is not null
     and not exists (
       select 1
       from public.game_participants as gp
       where gp.id = new.participant_id
         and gp.game_id = new.game_id
     ) then
    raise exception 'Participant must belong to the same game'
      using errcode = '23514';
  end if;
  return new;
end;
$$;
revoke all on function private.validate_participant_game()
  from public, anon, authenticated, service_role;

drop trigger if exists set_owner_id_before_insert on public.leagues;
create trigger set_owner_id_before_insert
before insert on public.leagues
for each row execute function private.set_owner_id_on_insert();

drop trigger if exists on_league_created on public.leagues;
create trigger on_league_created
after insert on public.leagues
for each row execute function private.add_league_owner_membership();

drop trigger if exists protect_membership_keys on public.league_members;
create trigger protect_membership_keys
before update of league_id, user_id on public.league_members
for each row execute function private.prevent_membership_key_change();

drop trigger if exists sync_game_compatibility on public.games;
create trigger sync_game_compatibility
before insert or update on public.games
for each row execute function private.sync_game_compatibility();

drop trigger if exists validate_game_season_league on public.games;
create trigger validate_game_season_league
before insert or update of season_id, league_id on public.games
for each row execute function private.validate_game_season_league();

drop trigger if exists protect_finalized_game on public.games;
create trigger protect_finalized_game
before update or delete on public.games
for each row execute function private.guard_finalized_game();

drop trigger if exists validate_invite_player_league on public.game_invites;
create trigger validate_invite_player_league
before insert or update of game_id, player_id on public.game_invites
for each row execute function private.validate_game_player_league();

drop trigger if exists guard_player_rsvp_update on public.game_invites;
create trigger guard_player_rsvp_update
before update on public.game_invites
for each row execute function private.guard_player_rsvp_update();

drop trigger if exists protect_finalized_invite on public.game_invites;
create trigger protect_finalized_invite
before insert or update or delete on public.game_invites
for each row execute function private.guard_finalized_game_child();

drop trigger if exists sync_invite_participant on public.game_invites;
create trigger sync_invite_participant
after insert or update or delete on public.game_invites
for each row execute function private.sync_invite_participant();

drop trigger if exists validate_result_player_league on public.game_results;
create trigger validate_result_player_league
before insert or update of game_id, player_id on public.game_results
for each row execute function private.validate_game_player_league();

drop trigger if exists protect_finalized_result on public.game_results;
create trigger protect_finalized_result
before insert or update or delete on public.game_results
for each row execute function private.guard_finalized_game_child();

drop trigger if exists validate_participant_player_league on public.game_participants;
create trigger validate_participant_player_league
before insert or update of game_id, player_id on public.game_participants
for each row execute function private.validate_game_player_league();

drop trigger if exists protect_finalized_participant on public.game_participants;
create trigger protect_finalized_participant
before insert or update or delete on public.game_participants
for each row execute function private.guard_finalized_game_child();

drop trigger if exists validate_seat_participant on public.game_seats;
create trigger validate_seat_participant
before insert or update of game_id, participant_id on public.game_seats
for each row execute function private.validate_participant_game();

drop trigger if exists protect_finalized_seat on public.game_seats;
create trigger protect_finalized_seat
before insert or update or delete on public.game_seats
for each row execute function private.guard_finalized_game_child();

drop trigger if exists validate_transaction_participant on public.game_transactions;
create trigger validate_transaction_participant
before insert on public.game_transactions
for each row execute function private.validate_participant_game();

drop trigger if exists validate_transaction_player_league on public.game_transactions;
create trigger validate_transaction_player_league
before insert on public.game_transactions
for each row execute function private.validate_game_player_league();

drop trigger if exists protect_game_transaction_append_only on public.game_transactions;
create trigger protect_game_transaction_append_only
before insert or update or delete on public.game_transactions
for each row execute function private.guard_game_transaction_append_only();

drop trigger if exists protect_ledger_append_only on public.bankroll_ledger_entries;
create trigger protect_ledger_append_only
before update or delete on public.bankroll_ledger_entries
for each row execute function private.guard_ledger_append_only();

do $$
declare
  _table_name text;
begin
  foreach _table_name in array array[
    'game_tables',
    'tournament_levels',
    'tournament_clocks',
    'game_eliminations'
  ] loop
    execute format(
      'drop trigger if exists protect_finalized_child on public.%I',
      _table_name
    );
    execute format(
      'create trigger protect_finalized_child before insert or update or delete on public.%I for each row execute function private.guard_finalized_game_child()',
      _table_name
    );
  end loop;
end
$$;

create or replace function public.record_email_webhook_event(
  p_provider_event_id text,
  p_event_type text,
  p_provider_message_id text,
  p_occurred_at timestamptz,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  _event_type text;
  _inserted integer;
begin
  if not private.is_service_role() then
    raise exception 'Service role is required' using errcode = '42501';
  end if;
  if btrim(coalesce(p_provider_event_id, '')) = ''
     or btrim(coalesce(p_event_type, '')) = ''
     or btrim(coalesce(p_provider_message_id, '')) = '' then
    raise exception 'Invalid email webhook event' using errcode = '22023';
  end if;

  _event_type := case lower(p_event_type)
    when 'email.sent' then 'sent'
    when 'email.delivered' then 'delivered'
    when 'email.delivery_delayed' then 'delivery_delayed'
    when 'email.bounced' then 'bounced'
    when 'email.complained' then 'complained'
    when 'email.opened' then 'opened'
    when 'email.clicked' then 'clicked'
    when 'email.failed' then 'failed'
    else lower(p_event_type)
  end;
  if _event_type not in (
    'sent', 'delivered', 'delivery_delayed', 'bounced', 'complained',
    'opened', 'clicked', 'failed'
  ) then
    raise exception 'Unsupported email webhook event type'
      using errcode = '22023';
  end if;

  insert into public.email_webhook_events (
    queue_id, provider_event_id, event_type, occurred_at, payload
  )
  select
    q.id, p_provider_event_id, _event_type,
    coalesce(p_occurred_at, now()), coalesce(p_payload, '{}'::jsonb)
  from public.email_queue as q
  where q.provider_message_id = p_provider_message_id
  on conflict (provider_event_id) do nothing;
  get diagnostics _inserted = row_count;

  if _inserted = 0 then
    -- A duplicate provider event is a successful no-op. Unknown message IDs are
    -- rejected so signed but unrelated webhooks cannot create orphan events.
    if exists (
      select 1 from public.email_webhook_events
      where provider_event_id = p_provider_event_id
    ) then
      return false;
    end if;
    raise exception 'Email queue item not found' using errcode = 'P0002';
  end if;

  update public.email_queue as q
  set
    delivery_status = _event_type,
    processed_at = greatest(
      coalesce(q.processed_at, '-infinity'::timestamptz),
      coalesce(p_occurred_at, now())
    )
  where q.provider_message_id = p_provider_message_id
    and (
      case q.delivery_status
        when 'complained' then 4
        when 'bounced' then 3
        when 'delivered' then 2
        when 'delivery_delayed' then 1
        else 0
      end
    ) <= (
      case _event_type
        when 'complained' then 4
        when 'bounced' then 3
        when 'delivered' then 2
        when 'delivery_delayed' then 1
        else 0
      end
    );

  return true;
end;
$$;
revoke all on function public.record_email_webhook_event(
  text, text, text, timestamptz, jsonb
) from public, anon, authenticated;
grant execute on function public.record_email_webhook_event(
  text, text, text, timestamptz, jsonb
) to service_role;

-- ---------------------------------------------------------------------------
-- Transactional, idempotent Data API operations
-- ---------------------------------------------------------------------------

create table private.game_check_in_requests (
  idempotency_key text primary key,
  game_id uuid not null references public.games(id) on delete cascade,
  participant_id uuid not null
    references public.game_participants(id) on delete cascade,
  checked_in boolean not null,
  requested_by uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
revoke all on table private.game_check_in_requests
  from public, anon, authenticated, service_role;

create or replace function public.create_league(
  p_name text,
  p_description text,
  p_points_system jsonb,
  p_idempotency_key text
)
returns public.leagues
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _owner_id uuid := (select auth.uid());
  _league public.leagues;
begin
  if _owner_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if btrim(coalesce(p_name, '')) = '' then
    raise exception 'League name is required' using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(_owner_id::text || ':' || p_idempotency_key, 0)
  );

  select l.* into _league
  from public.leagues as l
  where l.owner_id = _owner_id
    and l.creation_idempotency_key = p_idempotency_key;
  if found then
    return _league;
  end if;

  insert into public.leagues (
    name, description, owner_id, points_system, creation_idempotency_key
  )
  values (
    btrim(p_name),
    nullif(btrim(coalesce(p_description, '')), ''),
    _owner_id,
    coalesce(p_points_system, '{}'::jsonb),
    p_idempotency_key
  )
  returning * into _league;

  insert into public.seasons (league_id, name, is_active)
  values (_league.id, 'Season 1', true);

  insert into public.league_scoring_rules (
    league_id, version, name, config, created_by
  )
  values (
    _league.id, 1, 'League scoring',
    coalesce(p_points_system, '{}'::jsonb), _owner_id
  );

  return _league;
end;
$$;

create or replace function public.set_game_check_in(
  p_game_id uuid,
  p_participant_id uuid,
  p_checked_in boolean,
  p_idempotency_key text
)
returns public.game_participants
language plpgsql
security definer
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _participant public.game_participants;
  _prior record;
  _phase public.game_phase;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_checked_in is null
     or btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Check-in state and idempotency key are required'
      using errcode = '22023';
  end if;
  if not private.can_manage_game(p_game_id) then
    raise exception 'League owner or admin access is required'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(_actor_id::text || ':' || p_idempotency_key, 0)
  );

  select r.* into _prior
  from private.game_check_in_requests as r
  where r.idempotency_key = p_idempotency_key;
  if found then
    if _prior.game_id <> p_game_id
       or _prior.participant_id <> p_participant_id
       or _prior.checked_in <> p_checked_in
       or _prior.requested_by <> _actor_id then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    select gp.* into _participant
    from public.game_participants as gp
    where gp.id = p_participant_id and gp.game_id = p_game_id;
    return _participant;
  end if;

  select g.phase into _phase
  from public.games as g
  where g.id = p_game_id
  for update;
  if not found then
    raise exception 'Game not found' using errcode = 'P0002';
  end if;
  if _phase in ('finalized', 'cancelled') then
    raise exception 'Check-in is closed for this game' using errcode = '55000';
  end if;

  select gp.* into _participant
  from public.game_participants as gp
  where gp.id = p_participant_id and gp.game_id = p_game_id
  for update;
  if not found then
    raise exception 'Participant not found in game' using errcode = 'P0002';
  end if;

  update public.game_participants
  set
    checked_in_at = case when p_checked_in then now() else null end,
    updated_at = now()
  where id = p_participant_id
  returning * into _participant;

  insert into private.game_check_in_requests (
    idempotency_key, game_id, participant_id, checked_in, requested_by
  )
  values (
    p_idempotency_key, p_game_id, p_participant_id, p_checked_in, _actor_id
  );
  return _participant;
end;
$$;

create or replace function public.set_active_season(
  p_league_id uuid,
  p_season_id uuid
)
returns public.seasons
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _season public.seasons;
begin
  if not private.can_manage_league(p_league_id) then
    raise exception 'League owner or admin access is required'
      using errcode = '42501';
  end if;

  perform 1
  from public.seasons
  where league_id = p_league_id
  for update;

  select s.* into _season
  from public.seasons as s
  where s.id = p_season_id and s.league_id = p_league_id;
  if not found then
    raise exception 'Season not found in league' using errcode = 'P0002';
  end if;

  update public.seasons
  set is_active = false
  where league_id = p_league_id and is_active;

  update public.seasons
  set is_active = true
  where id = p_season_id
  returning * into _season;
  return _season;
end;
$$;

create or replace function public.create_game_from_template(
  p_template_id uuid,
  p_scheduled_at timestamptz,
  p_title text,
  p_idempotency_key text
)
returns public.games
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _template public.game_templates;
  _game public.games;
  _season_id uuid;
  _scoring_rule_id uuid;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if p_scheduled_at is null then
    raise exception 'Scheduled time is required' using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  select t.* into _template
  from public.game_templates as t
  where t.id = p_template_id
  for update;
  if not found then
    raise exception 'Game template not found' using errcode = 'P0002';
  end if;
  if not private.can_manage_league(_template.league_id) then
    raise exception 'League owner or admin access is required'
      using errcode = '42501';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(_actor_id::text || ':' || p_idempotency_key, 0)
  );
  select g.* into _game
  from public.games as g
  where g.created_by = _actor_id
    and g.creation_idempotency_key = p_idempotency_key;
  if found then
    return _game;
  end if;

  select s.id into _season_id
  from public.seasons as s
  where s.league_id = _template.league_id and s.is_active
  limit 1;

  select r.id into _scoring_rule_id
  from public.league_scoring_rules as r
  where r.league_id = _template.league_id
    and r.retired_at is null
  order by r.version desc
  limit 1;

  insert into public.games (
    league_id, season_id, template_id, scoring_rule_id, title, kind, phase,
    scheduled_date, status, buy_in, buy_in_minor, location, currency,
    timezone, capacity, small_blind_minor, big_blind_minor,
    min_buy_in_minor, max_buy_in_minor, entry_fee_minor, rake_minor,
    bounty_minor, created_by, creation_idempotency_key
  )
  values (
    _template.league_id, _season_id, _template.id, _scoring_rule_id,
    coalesce(nullif(btrim(coalesce(p_title, '')), ''), _template.name),
    _template.kind, 'inviting', p_scheduled_at, 'scheduled',
    _template.buy_in_minor::numeric / 100, _template.buy_in_minor,
    _template.location, _template.currency, _template.timezone,
    _template.capacity, _template.small_blind_minor,
    _template.big_blind_minor, _template.min_buy_in_minor,
    _template.max_buy_in_minor, _template.entry_fee_minor,
    _template.rake_minor, _template.bounty_minor, _actor_id,
    p_idempotency_key
  )
  returning * into _game;

  insert into public.tournament_levels (
    game_id, level_number, small_blind, big_blind, ante,
    duration_seconds, is_break, label
  )
  select
    _game.id, sl.level_number, sl.small_blind, sl.big_blind, sl.ante,
    sl.duration_seconds, sl.is_break, sl.label
  from public.tournament_structure_levels as sl
  where sl.structure_id = _template.structure_id
  order by sl.level_number;

  insert into public.game_invites (
    game_id, contact_id, player_id, rsvp_status, invited_by
  )
  select
    _game.id,
    invited.contact_id,
    lc.player_id,
    'pending'::public.rsvp_status,
    _actor_id
  from (
    select ti.contact_id
    from public.game_template_invitees as ti
    where ti.template_id = _template.id
      and ti.contact_id is not null
    union
    select cgm.contact_id
    from public.game_template_invitees as ti
    join public.contact_group_members as cgm on cgm.group_id = ti.group_id
    where ti.template_id = _template.id
      and ti.group_id is not null
  ) as invited
  left join public.league_contacts as lc
    on lc.league_id = _template.league_id
   and lc.contact_id = invited.contact_id
  on conflict do nothing;

  return _game;
end;
$$;

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
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _actor_id uuid := (select auth.uid());
  _transaction public.game_transactions;
  _game public.games;
begin
  if _actor_id is null then
    raise exception 'Authentication is required' using errcode = '42501';
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
  if _game.phase = 'finalized' and p_kind <> 'adjustment' then
    raise exception 'Only adjustments may be posted after finalization'
      using errcode = '55000';
  end if;
  if p_currency !~ '^[A-Z]{3}$' or p_currency <> _game.currency then
    raise exception 'Transaction currency must match the game'
      using errcode = '22023';
  end if;
  if p_kind <> 'adjustment' and p_amount_minor < 0 then
    raise exception 'Only adjustments may use a negative amount'
      using errcode = '22023';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(_actor_id::text || ':' || p_idempotency_key, 0)
  );
  select gt.* into _transaction
  from public.game_transactions as gt
  where gt.created_by = _actor_id
    and gt.idempotency_key = p_idempotency_key;
  if found then
    if _transaction.game_id <> p_game_id
       or _transaction.kind <> p_kind
       or _transaction.amount_minor <> p_amount_minor then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return _transaction;
  end if;

  insert into public.game_transactions (
    game_id, participant_id, player_id, kind, amount_minor, currency,
    note, idempotency_key, created_by
  )
  values (
    p_game_id, p_participant_id, p_player_id, p_kind, p_amount_minor,
    p_currency, nullif(btrim(coalesce(p_note, '')), ''),
    p_idempotency_key, _actor_id
  )
  returning * into _transaction;
  return _transaction;
end;
$$;

create unique index if not exists game_results_game_finish_idx
  on public.game_results (game_id, finish_position);

create or replace function public.finalize_game(
  p_game_id uuid,
  p_idempotency_key text
)
returns public.games
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _game public.games;
  _config jsonb;
  _field_size integer;
  _inflow bigint;
  _outflow bigint;
begin
  if (select auth.uid()) is null then
    raise exception 'Authentication is required' using errcode = '42501';
  end if;
  if btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Idempotency key is required' using errcode = '22023';
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
    raise exception 'Cancelled games cannot be finalized' using errcode = '55000';
  end if;
  if _game.phase = 'finalized' then
    if _game.finalization_idempotency_key = p_idempotency_key then
      return _game;
    end if;
    raise exception 'Game is already finalized' using errcode = '55000';
  end if;

  -- Materialize operational finish positions into the legacy standings table.
  insert into public.game_results (
    game_id, player_id, finish_position, buy_in_amount, payout,
    points_earned, rebuys, total_buy_in_minor, payout_minor,
    data_quality
  )
  select
    gp.game_id,
    gp.player_id,
    gp.finish_position,
    0,
    0,
    0,
    0,
    0,
    0,
    'trusted'::public.data_quality
  from public.game_participants as gp
  where gp.game_id = p_game_id
    and gp.player_id is not null
    and gp.finish_position is not null
  on conflict (game_id, player_id) do update
  set finish_position = excluded.finish_position;

  select count(*)::integer into _field_size
  from public.game_results
  where game_id = p_game_id;
  if _field_size = 0 then
    raise exception 'At least one result is required before finalization'
      using errcode = '22023';
  end if;

  select coalesce(r.config, l.points_system) into _config
  from public.games as g
  join public.leagues as l on l.id = g.league_id
  left join public.league_scoring_rules as r on r.id = g.scoring_rule_id
  where g.id = p_game_id;

  with totals as (
    select
      gr.id as result_id,
      coalesce(sum(
        case
          when gt.kind in ('buy_in', 'reload', 'entry', 're_entry', 'add_on')
          then gt.amount_minor * gt.effect_multiplier
          else 0
        end
      ), 0)::bigint as invested_minor,
      coalesce(sum(
        case
          when gt.kind in ('cash_out', 'payout', 'bounty')
          then gt.amount_minor * gt.effect_multiplier
          else 0
        end
      ), 0)::bigint as returned_minor,
      count(*) filter (
        where gt.kind in ('reload', 're_entry')
          and gt.effect_multiplier = 1
      )::integer as rebuy_count,
      count(gt.id) as transaction_count
    from public.game_results as gr
    left join public.game_transactions as gt
      on gt.game_id = gr.game_id
     and gt.player_id = gr.player_id
    where gr.game_id = p_game_id
    group by gr.id
  )
  update public.game_results as gr
  set
    total_buy_in_minor = case
      when t.transaction_count > 0 then t.invested_minor
      else gr.total_buy_in_minor
    end,
    payout_minor = case
      when t.transaction_count > 0 then t.returned_minor
      else gr.payout_minor
    end,
    buy_in_amount = (
      case when t.transaction_count > 0
        then t.invested_minor else gr.total_buy_in_minor end
    )::numeric / 100,
    payout = (
      case when t.transaction_count > 0
        then t.returned_minor else gr.payout_minor end
    )::numeric / 100,
    rebuys = case
      when t.transaction_count > 0 then t.rebuy_count
      else gr.rebuys
    end,
    data_quality = case
      when t.transaction_count > 0 then 'trusted'::public.data_quality
      else gr.data_quality
    end,
    points_earned = private.calculate_points(
      _config, gr.finish_position, _field_size,
      case when t.transaction_count > 0
        then t.invested_minor else gr.total_buy_in_minor end
    ),
    finalized_at = now()
  from totals as t
  where gr.id = t.result_id;

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
    game_id, inflow_minor, outflow_minor, variance_minor, currency,
    status, calculated_at, finalized_by
  )
  values (
    p_game_id, _inflow, _outflow, _inflow - _outflow, _game.currency,
    case when _inflow = _outflow then 'balanced' else 'warning' end,
    now(), (select auth.uid())
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

  update public.games
  set
    phase = 'finalized',
    status = 'completed',
    finalized_at = now(),
    finalization_idempotency_key = p_idempotency_key
  where id = p_game_id
  returning * into _game;
  return _game;
end;
$$;

create or replace function public.post_ledger_entry(
  p_owner_id uuid,
  p_account_id uuid,
  p_session_id uuid,
  p_entry_type public.ledger_entry_type,
  p_amount_minor bigint,
  p_currency text,
  p_occurred_at timestamptz,
  p_description text,
  p_external_reference text,
  p_idempotency_key text
)
returns public.bankroll_ledger_entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _entry public.bankroll_ledger_entries;
  _account public.bankroll_accounts;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
    raise exception 'You may only post to your own ledger'
      using errcode = '42501';
  end if;
  if p_amount_minor = 0
     or p_currency !~ '^[A-Z]{3}$'
     or btrim(coalesce(p_description, '')) = ''
     or btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Invalid ledger entry' using errcode = '22023';
  end if;

  select a.* into _account
  from public.bankroll_accounts as a
  where a.id = p_account_id and a.owner_id = p_owner_id
  for update;
  if not found then
    raise exception 'Bankroll account not found' using errcode = 'P0002';
  end if;
  if _account.currency <> p_currency then
    raise exception 'Ledger currency must match the account'
      using errcode = '22023';
  end if;
  if p_session_id is not null and not exists (
    select 1 from public.career_sessions as cs
    where cs.id = p_session_id and cs.owner_id = p_owner_id
  ) then
    raise exception 'Career session not found' using errcode = 'P0002';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_idempotency_key, 0)
  );
  select e.* into _entry
  from public.bankroll_ledger_entries as e
  where e.owner_id = p_owner_id
    and e.idempotency_key = p_idempotency_key;
  if found then
    if _entry.account_id <> p_account_id
       or _entry.amount_minor <> p_amount_minor
       or _entry.entry_type <> p_entry_type then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return _entry;
  end if;

  insert into public.bankroll_ledger_entries (
    owner_id, account_id, session_id, entry_type, amount_minor, currency,
    occurred_at, description, external_reference, idempotency_key
  )
  values (
    p_owner_id, p_account_id, p_session_id, p_entry_type, p_amount_minor,
    p_currency, coalesce(p_occurred_at, now()), btrim(p_description),
    nullif(btrim(coalesce(p_external_reference, '')), ''),
    p_idempotency_key
  )
  returning * into _entry;
  return _entry;
end;
$$;

create or replace function public.reverse_ledger_entry(
  p_owner_id uuid,
  p_entry_id uuid,
  p_reason text,
  p_idempotency_key text
)
returns public.bankroll_ledger_entries
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _original public.bankroll_ledger_entries;
  _reversal public.bankroll_ledger_entries;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
    raise exception 'You may only reverse your own ledger entries'
      using errcode = '42501';
  end if;
  if btrim(coalesce(p_reason, '')) = ''
     or btrim(coalesce(p_idempotency_key, '')) = '' then
    raise exception 'Reason and idempotency key are required'
      using errcode = '22023';
  end if;

  perform pg_catalog.pg_advisory_xact_lock(
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_idempotency_key, 0)
  );
  select e.* into _reversal
  from public.bankroll_ledger_entries as e
  where e.owner_id = p_owner_id
    and e.idempotency_key = p_idempotency_key;
  if found then
    return _reversal;
  end if;

  select e.* into _original
  from public.bankroll_ledger_entries as e
  where e.id = p_entry_id and e.owner_id = p_owner_id
  for update;
  if not found then
    raise exception 'Ledger entry not found' using errcode = 'P0002';
  end if;
  if _original.entry_type = 'reversal' or exists (
    select 1 from public.bankroll_ledger_entries as e
    where e.reversal_of_id = _original.id
  ) then
    raise exception 'Ledger entry is already reversed'
      using errcode = '55000';
  end if;

  insert into public.bankroll_ledger_entries (
    owner_id, account_id, session_id, settlement_id, entry_type,
    amount_minor, currency, occurred_at, description, external_reference,
    reversal_of_id, idempotency_key
  )
  values (
    p_owner_id, _original.account_id, _original.session_id,
    _original.settlement_id, 'reversal', -_original.amount_minor,
    _original.currency, now(), btrim(p_reason), _original.external_reference,
    _original.id, p_idempotency_key
  )
  returning * into _reversal;
  return _reversal;
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
language plpgsql
security invoker
set search_path = ''
as $$
declare
  _settlement public.settlements;
begin
  if (select auth.uid()) is null or (select auth.uid()) <> p_owner_id then
    raise exception 'You may only create your own settlements'
      using errcode = '42501';
  end if;
  if p_direction not in ('payable', 'receivable')
     or btrim(coalesce(p_counterparty, '')) = ''
     or p_amount_minor <= 0
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
    pg_catalog.hashtextextended(p_owner_id::text || ':' || p_idempotency_key, 0)
  );
  select s.* into _settlement
  from public.settlements as s
  where s.owner_id = p_owner_id
    and s.idempotency_key = p_idempotency_key;
  if found then
    if _settlement.counterparty <> btrim(p_counterparty)
       or _settlement.amount_minor <> p_amount_minor then
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
    nullif(btrim(coalesce(p_external_method, '')), ''),
    nullif(btrim(coalesce(p_external_handle, '')), ''),
    nullif(btrim(coalesce(p_memo, '')), ''),
    p_due_date, p_idempotency_key
  )
  returning * into _settlement;
  return _settlement;
end;
$$;

-- ---------------------------------------------------------------------------
-- Service-role-only guest invitation and integration operations
-- ---------------------------------------------------------------------------

create table private.guest_invite_response_requests (
  idempotency_key uuid primary key,
  invite_id uuid not null references public.game_invites(id) on delete cascade,
  requested_status public.rsvp_status not null,
  effective_status public.rsvp_status not null,
  guest_count integer not null,
  response_payload jsonb not null,
  created_at timestamptz not null default now()
);
revoke all on table private.guest_invite_response_requests
  from public, anon, authenticated;
grant select, insert on table private.guest_invite_response_requests
  to service_role;

create or replace function private.guest_invitation_payload(_invite_id uuid)
returns jsonb
language sql
stable
security definer
set search_path = ''
as $$
  select jsonb_build_object(
    'invitation', jsonb_build_object(
      'status', gi.rsvp_status::text,
      'guestCount', gi.guest_count,
      'expiresAt', gi.token_expires_at
    ),
    'event', jsonb_build_object(
      'title', g.title,
      'kind', g.kind::text,
      'phase', g.phase::text,
      'scheduledAt', g.scheduled_date,
      'timezone', g.timezone,
      'locationName', g.location,
      'stakesLabel', case
        when g.kind = 'cash' then concat(
          g.currency, ' ',
          coalesce(g.small_blind_minor, 0)::numeric / 100,
          '/',
          coalesce(g.big_blind_minor, 0)::numeric / 100
        )
        else concat(
          g.currency, ' ',
          g.entry_fee_minor::numeric / 100,
          ' entry'
        )
      end,
      'capacity', g.capacity,
      'confirmedCount', (
        select coalesce(sum(1 + accepted.guest_count), 0)::integer
        from public.game_invites as accepted
        where accepted.game_id = g.id
          and accepted.rsvp_status = 'yes'
      ),
      'notes', g.notes
    )
  )
  from public.game_invites as gi
  join public.games as g on g.id = gi.game_id
  where gi.id = _invite_id;
$$;
revoke all on function private.guest_invitation_payload(uuid)
  from public, anon, authenticated, service_role;

create or replace function public.get_guest_invitation(
  p_token_hash text
)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  _invite_id uuid;
begin
  if not private.is_service_role() then
    raise exception 'Service role is required' using errcode = '42501';
  end if;
  if p_token_hash is null or p_token_hash !~ '^[0-9a-f]{64}$' then
    raise exception 'Invalid, expired, or revoked invitation'
      using errcode = 'P0002';
  end if;

  select gi.id into _invite_id
  from public.game_invites as gi
  join public.games as g on g.id = gi.game_id
  where gi.token_hash = p_token_hash
    and gi.token_revoked_at is null
    and gi.token_expires_at > now()
    and g.phase not in ('finalized', 'cancelled');
  if not found then
    raise exception 'Invalid, expired, or revoked invitation'
      using errcode = 'P0002';
  end if;
  return private.guest_invitation_payload(_invite_id);
end;
$$;

create or replace function public.respond_to_guest_invitation(
  p_token_hash text,
  p_status public.rsvp_status,
  p_guest_count integer,
  p_idempotency_key uuid
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _invite public.game_invites;
  _game public.games;
  _confirmed_count integer;
  _effective_status public.rsvp_status;
  _waitlist_position integer;
  _payload jsonb;
begin
  if not private.is_service_role() then
    raise exception 'Service role is required' using errcode = '42501';
  end if;
  if p_token_hash is null
     or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_status not in ('yes', 'maybe', 'no')
     or p_guest_count not between 0 and 4
     or p_idempotency_key is null then
    raise exception 'Invalid invitation response' using errcode = '22023';
  end if;

  select r.response_payload into _payload
  from private.guest_invite_response_requests as r
  where r.idempotency_key = p_idempotency_key;
  if found then
    return _payload;
  end if;

  select gi.* into _invite
  from public.game_invites as gi
  where gi.token_hash = p_token_hash
  for update;
  if not found
     or _invite.token_revoked_at is not null
     or _invite.token_expires_at <= now() then
    raise exception 'Invalid, expired, or revoked invitation'
      using errcode = 'P0002';
  end if;

  select g.* into _game
  from public.games as g
  where g.id = _invite.game_id
  for update;
  if not found or _game.phase in ('finalized', 'cancelled') then
    raise exception 'Invalid, expired, or revoked invitation'
      using errcode = 'P0002';
  end if;

  select coalesce(sum(1 + gi.guest_count), 0)::integer
  into _confirmed_count
  from public.game_invites as gi
  where gi.game_id = _invite.game_id
    and gi.id <> _invite.id
    and gi.rsvp_status = 'yes';

  _effective_status := p_status;
  if p_status = 'yes'
     and _game.capacity is not null
     and _confirmed_count + 1 + p_guest_count > _game.capacity then
    _effective_status := 'waitlisted';
    select coalesce(max(gi.waitlist_position), 0) + 1
    into _waitlist_position
    from public.game_invites as gi
    where gi.game_id = _invite.game_id
      and gi.rsvp_status = 'waitlisted';
  end if;

  update public.game_invites
  set
    rsvp_status = _effective_status,
    guest_count = p_guest_count,
    waitlist_position = case
      when _effective_status = 'waitlisted' then _waitlist_position
      else null
    end,
    responded_at = now(),
    updated_at = now()
  where id = _invite.id;

  _payload := private.guest_invitation_payload(_invite.id);
  insert into private.guest_invite_response_requests (
    idempotency_key, invite_id, requested_status, effective_status,
    guest_count, response_payload
  )
  values (
    p_idempotency_key, _invite.id, p_status, _effective_status,
    p_guest_count, _payload
  );
  return _payload;
end;
$$;

create or replace function public.issue_guest_invite(
  p_game_id uuid,
  p_token_hash text,
  p_actor_id uuid,
  p_expires_at timestamptz
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  _game public.games;
  _invite_id uuid;
begin
  if not private.is_service_role() then
    raise exception 'Service role is required' using errcode = '42501';
  end if;
  if p_token_hash is null
     or p_token_hash !~ '^[0-9a-f]{64}$'
     or p_actor_id is null
     or p_expires_at is null
     or p_expires_at <= now() then
    raise exception 'Invalid guest invitation request' using errcode = '22023';
  end if;

  select g.* into _game
  from public.games as g
  where g.id = p_game_id
  for update;
  if not found or _game.phase in ('finalized', 'cancelled') then
    raise exception 'Game is unavailable for invitations' using errcode = '55000';
  end if;
  if not exists (
    select 1
    from public.leagues as l
    left join public.league_members as lm
      on lm.league_id = l.id and lm.user_id = p_actor_id
    where l.id = _game.league_id
      and (
        l.owner_id = p_actor_id
        or lm.role in ('owner', 'admin')
      )
  ) then
    raise exception 'League owner or admin access is required'
      using errcode = '42501';
  end if;

  update public.game_invites
  set token_revoked_at = now(), updated_at = now()
  where game_id = p_game_id
    and player_id is null
    and contact_id is null
    and token_hash is not null
    and token_revoked_at is null;

  insert into public.game_invites (
    game_id, token_hash, token_expires_at, invited_by, rsvp_status
  )
  values (
    p_game_id, p_token_hash, p_expires_at, p_actor_id, 'pending'
  )
  returning id into _invite_id;

  update public.games
  set invite_token_expires_at = p_expires_at
  where id = p_game_id;

  return jsonb_build_object(
    'inviteId', _invite_id,
    'expiresAt', p_expires_at
  );
end;
$$;

create or replace function public.claim_email_queue(
  p_limit integer
)
returns setof public.email_queue
language plpgsql
security definer
set search_path = ''
as $$
begin
  if not private.is_service_role() then
    raise exception 'Service role is required' using errcode = '42501';
  end if;
  if p_limit is null or p_limit not between 1 and 100 then
    raise exception 'Limit must be between 1 and 100' using errcode = '22023';
  end if;

  return query
  with claimable as (
    select q.id
    from public.email_queue as q
    join public.email_settings as s on s.owner_id = q.owner_id
    where s.enabled
      and q.status in ('queued', 'failed')
      and q.next_attempt_at <= now()
    order by q.next_attempt_at, q.created_at
    for update of q skip locked
    limit p_limit
  )
  update public.email_queue as q
  set
    status = 'processing',
    attempt_count = q.attempt_count + 1,
    processed_at = now()
  from claimable as c
  where q.id = c.id
  returning q.*;
end;
$$;

revoke all on function public.get_guest_invitation(text)
  from public, anon, authenticated;
revoke all on function public.respond_to_guest_invitation(
  text, public.rsvp_status, integer, uuid
) from public, anon, authenticated;
revoke all on function public.issue_guest_invite(
  uuid, text, uuid, timestamptz
) from public, anon, authenticated;
revoke all on function public.claim_email_queue(integer)
  from public, anon, authenticated;
grant execute on function public.get_guest_invitation(text) to service_role;
grant execute on function public.respond_to_guest_invitation(
  text, public.rsvp_status, integer, uuid
) to service_role;
grant execute on function public.issue_guest_invite(
  uuid, text, uuid, timestamptz
) to service_role;
grant execute on function public.claim_email_queue(integer) to service_role;

-- ---------------------------------------------------------------------------
-- Private document storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (
  id, name, public, file_size_limit,
  allowed_mime_types
)
values (
  'career-documents',
  'career-documents',
  false,
  26214400,
  array[
    'application/pdf',
    'image/jpeg',
    'image/png',
    'image/webp',
    'text/csv',
    'text/plain'
  ]::text[]
)
on conflict (id) do nothing;

drop policy if exists career_documents_select on storage.objects;
create policy career_documents_select
on storage.objects
for select to authenticated
using (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists career_documents_insert on storage.objects;
create policy career_documents_insert
on storage.objects
for insert to authenticated
with check (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists career_documents_update on storage.objects;
create policy career_documents_update
on storage.objects
for update to authenticated
using (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
)
with check (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

drop policy if exists career_documents_delete on storage.objects;
create policy career_documents_delete
on storage.objects
for delete to authenticated
using (
  bucket_id = 'career-documents'
  and (storage.foldername(name))[1] = (select auth.uid())::text
);

-- ---------------------------------------------------------------------------
-- Realtime for active game-night state
-- ---------------------------------------------------------------------------

alter table public.games replica identity full;
alter table public.game_invites replica identity full;
alter table public.game_participants replica identity full;
alter table public.game_transactions replica identity full;
alter table public.game_seats replica identity full;
alter table public.tournament_levels replica identity full;
alter table public.tournament_clocks replica identity full;
alter table public.game_results replica identity full;
alter table public.game_reconciliations replica identity full;
alter table public.seasons replica identity full;

do $$
declare
  _table_name text;
begin
  if exists (
    select 1
    from pg_catalog.pg_publication
    where pubname = 'supabase_realtime'
  ) then
    foreach _table_name in array array[
      'games',
      'game_invites',
      'game_participants',
      'game_transactions',
      'game_seats',
      'tournament_levels',
      'tournament_clocks',
      'game_results',
      'game_reconciliations',
      'seasons'
    ] loop
      if not exists (
        select 1
        from pg_catalog.pg_publication_tables
        where pubname = 'supabase_realtime'
          and schemaname = 'public'
          and tablename = _table_name
      ) then
        execute format(
          'alter publication supabase_realtime add table public.%I',
          _table_name
        );
      end if;
    end loop;
  end if;
end
$$;

-- ---------------------------------------------------------------------------
-- Row-level security
-- ---------------------------------------------------------------------------

do $$
declare
  _table_name text;
  _policy record;
begin
  foreach _table_name in array array[
    'leagues', 'league_members', 'seasons', 'players', 'games',
    'game_results', 'game_invites'
  ] loop
    for _policy in
      select policyname
      from pg_catalog.pg_policies
      where schemaname = 'public' and tablename = _table_name
    loop
      execute format(
        'drop policy if exists %I on public.%I',
        _policy.policyname, _table_name
      );
    end loop;
  end loop;
end
$$;

drop function if exists public.is_league_member(uuid);
drop function if exists public.is_league_owner_or_admin(uuid);
drop function if exists public.is_league_owner(uuid);
drop function if exists public.handle_new_league();

create policy leagues_insert on public.leagues
for insert to authenticated
with check (
  (select auth.uid()) is not null
  and owner_id = (select auth.uid())
);
create policy leagues_select on public.leagues
for select to authenticated
using (
  owner_id = (select auth.uid())
  or private.is_league_member(id)
);
create policy leagues_update on public.leagues
for update to authenticated
using (private.is_league_owner(id))
with check (
  owner_id = (select auth.uid())
  and private.is_league_owner(id)
);
create policy leagues_delete on public.leagues
for delete to authenticated
using (private.is_league_owner(id));

create policy league_members_select on public.league_members
for select to authenticated
using (private.can_access_league(league_id));
create policy league_members_insert on public.league_members
for insert to authenticated
with check (
  (private.is_league_owner(league_id) and role in ('admin', 'member'))
  or (private.is_league_admin(league_id) and role = 'member')
);
create policy league_members_update on public.league_members
for update to authenticated
using (
  (private.is_league_owner(league_id) and role <> 'owner')
  or (private.is_league_admin(league_id) and role = 'member')
)
with check (
  (private.is_league_owner(league_id) and role in ('admin', 'member'))
  or (private.is_league_admin(league_id) and role = 'member')
);
create policy league_members_delete on public.league_members
for delete to authenticated
using (
  (user_id = (select auth.uid()) and role <> 'owner')
  or (private.is_league_owner(league_id) and role <> 'owner')
  or (private.is_league_admin(league_id) and role = 'member')
);

create policy seasons_select on public.seasons
for select to authenticated
using (private.can_access_league(league_id));
create policy seasons_insert on public.seasons
for insert to authenticated
with check (private.can_manage_league(league_id));
create policy seasons_update on public.seasons
for update to authenticated
using (private.can_manage_league(league_id))
with check (private.can_manage_league(league_id));
create policy seasons_delete on public.seasons
for delete to authenticated
using (private.can_manage_league(league_id));

create policy players_select on public.players
for select to authenticated
using (
  private.can_access_league(league_id)
  or user_id = (select auth.uid())
);
create policy players_insert on public.players
for insert to authenticated
with check (private.can_manage_league(league_id));
create policy players_update on public.players
for update to authenticated
using (private.can_manage_league(league_id))
with check (private.can_manage_league(league_id));
create policy players_delete on public.players
for delete to authenticated
using (private.can_manage_league(league_id));

create policy games_select on public.games
for select to authenticated
using (
  private.can_access_league(league_id)
  or private.is_invited_to_game(id)
);
create policy games_insert on public.games
for insert to authenticated
with check (private.can_manage_league(league_id));
create policy games_update on public.games
for update to authenticated
using (private.can_manage_league(league_id))
with check (private.can_manage_league(league_id));
create policy games_delete on public.games
for delete to authenticated
using (private.can_manage_league(league_id));

create policy game_results_select on public.game_results
for select to authenticated
using (
  private.can_access_game(game_id)
  or private.owns_player(player_id)
);
create policy game_results_insert on public.game_results
for insert to authenticated
with check (private.can_manage_game(game_id));
create policy game_results_update on public.game_results
for update to authenticated
using (private.can_manage_game(game_id))
with check (private.can_manage_game(game_id));
create policy game_results_delete on public.game_results
for delete to authenticated
using (private.can_manage_game(game_id));

create policy game_invites_select on public.game_invites
for select to authenticated
using (
  private.can_access_game(game_id)
  or private.owns_player(player_id)
);
create policy game_invites_insert on public.game_invites
for insert to authenticated
with check (private.can_manage_game(game_id));
create policy game_invites_update on public.game_invites
for update to authenticated
using (
  private.can_manage_game(game_id)
  or private.owns_player(player_id)
)
with check (
  private.can_manage_game(game_id)
  or private.owns_player(player_id)
);
create policy game_invites_delete on public.game_invites
for delete to authenticated
using (private.can_manage_game(game_id));

create policy contacts_select on public.contacts
for select to authenticated
using (private.can_manage_contact(id));
create policy contacts_insert on public.contacts
for insert to authenticated
with check (owner_id = (select auth.uid()));
create policy contacts_update on public.contacts
for update to authenticated
using (private.can_manage_contact(id))
with check (owner_id = (select auth.uid()) or private.can_manage_contact(id));
create policy contacts_delete on public.contacts
for delete to authenticated
using (owner_id = (select auth.uid()));

create policy league_contacts_select on public.league_contacts
for select to authenticated
using (private.can_manage_league(league_id));
create policy league_contacts_insert on public.league_contacts
for insert to authenticated
with check (
  private.can_manage_league(league_id)
  and private.can_manage_contact(contact_id)
);
create policy league_contacts_update on public.league_contacts
for update to authenticated
using (private.can_manage_league(league_id))
with check (
  private.can_manage_league(league_id)
  and private.can_manage_contact(contact_id)
);
create policy league_contacts_delete on public.league_contacts
for delete to authenticated
using (private.can_manage_league(league_id));

create policy contact_groups_all on public.contact_groups
for all to authenticated
using (
  owner_id = (select auth.uid())
  or (league_id is not null and private.can_manage_league(league_id))
)
with check (
  owner_id = (select auth.uid())
  or (league_id is not null and private.can_manage_league(league_id))
);

create policy contact_group_members_all on public.contact_group_members
for all to authenticated
using (
  exists (
    select 1
    from public.contact_groups as cg
    where cg.id = group_id
      and (
        cg.owner_id = (select auth.uid())
        or (cg.league_id is not null and private.can_manage_league(cg.league_id))
      )
  )
)
with check (
  exists (
    select 1
    from public.contact_groups as cg
    where cg.id = group_id
      and (
        cg.owner_id = (select auth.uid())
        or (cg.league_id is not null and private.can_manage_league(cg.league_id))
      )
  )
);

create policy scoring_rules_select on public.league_scoring_rules
for select to authenticated
using (private.can_access_league(league_id));
create policy scoring_rules_modify on public.league_scoring_rules
for all to authenticated
using (private.can_manage_league(league_id))
with check (private.can_manage_league(league_id));

create policy tournament_structures_all on public.tournament_structures
for all to authenticated
using (
  owner_id = (select auth.uid())
  or (league_id is not null and private.can_manage_league(league_id))
)
with check (
  owner_id = (select auth.uid())
  or (league_id is not null and private.can_manage_league(league_id))
);

create policy tournament_structure_levels_all
on public.tournament_structure_levels
for all to authenticated
using (
  exists (
    select 1 from public.tournament_structures as ts
    where ts.id = structure_id
      and (
        ts.owner_id = (select auth.uid())
        or (ts.league_id is not null and private.can_manage_league(ts.league_id))
      )
  )
)
with check (
  exists (
    select 1 from public.tournament_structures as ts
    where ts.id = structure_id
      and (
        ts.owner_id = (select auth.uid())
        or (ts.league_id is not null and private.can_manage_league(ts.league_id))
      )
  )
);

create policy game_templates_select on public.game_templates
for select to authenticated
using (private.can_access_league(league_id));
create policy game_templates_modify on public.game_templates
for all to authenticated
using (private.can_manage_league(league_id))
with check (
  private.can_manage_league(league_id)
  and owner_id = (
    select l.owner_id from public.leagues as l where l.id = league_id
  )
);

create policy game_template_invitees_all on public.game_template_invitees
for all to authenticated
using (
  exists (
    select 1 from public.game_templates as gt
    where gt.id = template_id and private.can_manage_league(gt.league_id)
  )
)
with check (
  exists (
    select 1 from public.game_templates as gt
    where gt.id = template_id and private.can_manage_league(gt.league_id)
  )
);

do $$
declare
  _table_name text;
begin
  foreach _table_name in array array[
    'game_participants', 'game_tables', 'game_seats', 'tournament_levels',
    'tournament_clocks', 'game_eliminations', 'game_reconciliations'
  ] loop
    execute format(
      'create policy %I on public.%I for select to authenticated using (private.can_access_game(game_id))',
      _table_name || '_select', _table_name
    );
    execute format(
      'create policy %I on public.%I for all to authenticated using (private.can_manage_game(game_id)) with check (private.can_manage_game(game_id))',
      _table_name || '_modify', _table_name
    );
  end loop;
end
$$;

create policy game_transactions_select on public.game_transactions
for select to authenticated
using (private.can_access_game(game_id));
create policy game_transactions_insert on public.game_transactions
for insert to authenticated
with check (
  private.can_manage_game(game_id)
  and created_by = (select auth.uid())
);

do $$
declare
  _table_name text;
begin
  foreach _table_name in array array[
    'career_sessions', 'bankroll_accounts', 'settlements', 'poker_trips',
    'career_expenses', 'staking_deals', 'staking_allocations',
    'professional_calendar_events', 'poker_hands', 'poker_opponents',
    'hand_opponents', 'study_sessions', 'study_session_hands',
    'career_goals', 'career_attachments', 'email_settings'
  ] loop
    execute format(
      'create policy %I on public.%I for all to authenticated using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()))',
      _table_name || '_owner_all', _table_name
    );
  end loop;
end
$$;

create policy bankroll_ledger_select on public.bankroll_ledger_entries
for select to authenticated
using (owner_id = (select auth.uid()));
create policy bankroll_ledger_insert on public.bankroll_ledger_entries
for insert to authenticated
with check (owner_id = (select auth.uid()));

create policy email_queue_owner_select on public.email_queue
for select to authenticated
using (owner_id = (select auth.uid()));

create policy plaid_candidates_owner_select
on public.plaid_reconciliation_candidates
for select to authenticated
using (owner_id = (select auth.uid()));
create policy plaid_candidates_owner_update
on public.plaid_reconciliation_candidates
for update to authenticated
using (owner_id = (select auth.uid()))
with check (owner_id = (select auth.uid()));

-- RLS is explicit for every public table, including service-only integration
-- tables that deliberately have no authenticated policy.
do $$
declare
  _table record;
begin
  for _table in
    select tablename
    from pg_catalog.pg_tables
    where schemaname = 'public'
  loop
    execute format(
      'alter table public.%I enable row level security',
      _table.tablename
    );
  end loop;
end
$$;

-- Explicit Data API grants (required under Supabase's 2026 opt-in default).
revoke all on all tables in schema public from anon;
revoke execute on all functions in schema public from anon;

grant select, insert, update, delete on table
  public.leagues,
  public.league_members,
  public.seasons,
  public.players,
  public.games,
  public.game_results,
  public.game_invites,
  public.contacts,
  public.league_contacts,
  public.contact_groups,
  public.contact_group_members,
  public.league_scoring_rules,
  public.tournament_structures,
  public.tournament_structure_levels,
  public.game_templates,
  public.game_template_invitees,
  public.game_participants,
  public.game_tables,
  public.game_seats,
  public.tournament_levels,
  public.tournament_clocks,
  public.game_eliminations,
  public.game_reconciliations,
  public.career_sessions,
  public.bankroll_accounts,
  public.settlements,
  public.poker_trips,
  public.career_expenses,
  public.staking_deals,
  public.staking_allocations,
  public.professional_calendar_events,
  public.poker_hands,
  public.poker_opponents,
  public.hand_opponents,
  public.study_sessions,
  public.study_session_hands,
  public.career_goals,
  public.career_attachments,
  public.email_settings
to authenticated;

grant select, insert on table public.game_transactions to authenticated;
grant select, insert on table public.bankroll_ledger_entries to authenticated;
grant select on table public.email_queue to authenticated;
grant select on table public.plaid_reconciliation_candidates to authenticated;
grant update (match_status, matched_ledger_entry_id, updated_at)
  on table public.plaid_reconciliation_candidates to authenticated;

revoke all on table
  public.email_webhook_events,
  public.plaid_connections,
  public.plaid_webhook_events
from authenticated;

grant select, insert, update, delete on all tables in schema public
  to service_role;

revoke execute on all functions in schema public
  from public, anon, authenticated;
grant execute on function public.create_league(text, text, jsonb, text)
  to authenticated;
grant execute on function public.set_game_check_in(
  uuid, uuid, boolean, text
) to authenticated;
grant execute on function public.set_active_season(uuid, uuid)
  to authenticated;
grant execute on function public.create_game_from_template(
  uuid, timestamptz, text, text
) to authenticated;
grant execute on function public.record_game_transaction(
  uuid, uuid, uuid, public.game_transaction_type, bigint, text, text, text
) to authenticated;
grant execute on function public.finalize_game(uuid, text)
  to authenticated;
grant execute on function public.post_ledger_entry(
  uuid, uuid, uuid, public.ledger_entry_type, bigint, text, timestamptz,
  text, text, text
) to authenticated;
grant execute on function public.reverse_ledger_entry(uuid, uuid, text, text)
  to authenticated;
grant execute on function public.create_settlement(
  uuid, uuid, text, text, bigint, text, text, text, text, text, date, text
) to authenticated;

-- Re-grant service-only RPCs after the blanket authenticated revoke.
grant execute on function public.get_guest_invitation(text) to service_role;
grant execute on function public.respond_to_guest_invitation(
  text, public.rsvp_status, integer, uuid
) to service_role;
grant execute on function public.issue_guest_invite(
  uuid, text, uuid, timestamptz
) to service_role;
grant execute on function public.claim_email_queue(integer) to service_role;

do $$
declare
  _table_name text;
begin
  foreach _table_name in array array[
    'contacts',
    'contact_groups',
    'tournament_structures',
    'game_templates',
    'career_sessions',
    'bankroll_accounts',
    'settlements',
    'poker_trips',
    'career_expenses',
    'staking_deals',
    'professional_calendar_events',
    'poker_hands',
    'poker_opponents',
    'study_sessions',
    'career_goals',
    'plaid_connections',
    'plaid_reconciliation_candidates'
  ] loop
    execute format(
      'drop trigger if exists touch_updated_at on public.%I',
      _table_name
    );
    execute format(
      'create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()',
      _table_name
    );
  end loop;
end
$$;

commit;
