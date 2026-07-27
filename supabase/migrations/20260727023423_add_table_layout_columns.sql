-- ---------------------------------------------------------------------------
-- Table layout options for tournaments
--
-- Adds an optional seats-per-table / number-of-tables layout to game templates
-- and games. These are independent of `capacity` (total field size): a host can
-- run 2 nine-handed tables while allowing 20 registrations, leaving 2 on the
-- waitlist.
--
-- Fully additive: every statement is `add column if not exists` or a
-- `create or replace` of an existing function whose prior behaviour is
-- preserved.
-- ---------------------------------------------------------------------------

alter table public.game_templates
  add column if not exists table_size integer
    check (table_size is null or table_size > 0);
alter table public.game_templates
  add column if not exists num_tables integer
    check (num_tables is null or num_tables > 0);

alter table public.games
  add column if not exists table_size integer
    check (table_size is null or table_size > 0);
alter table public.games
  add column if not exists num_tables integer
    check (num_tables is null or num_tables > 0);

-- ---------------------------------------------------------------------------
-- Propagate the layout when a game is created from a template, and
-- materialize the physical tables so seating has somewhere to put people.
-- ---------------------------------------------------------------------------

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
    bounty_minor, table_size, num_tables, created_by, creation_idempotency_key
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
    _template.rake_minor, _template.bounty_minor,
    _template.table_size, _template.num_tables, _actor_id,
    p_idempotency_key
  )
  returning * into _game;

  if _template.num_tables is not null and _template.table_size is not null then
    insert into public.game_tables (
      game_id, table_number, name, capacity, is_active
    )
    select
      _game.id,
      seat_table.number,
      'Table ' || seat_table.number::text,
      _template.table_size,
      true
    from pg_catalog.generate_series(1, _template.num_tables)
      as seat_table(number)
    on conflict (game_id, table_number) do nothing;
  end if;

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

grant execute on function public.create_game_from_template(
  uuid, timestamptz, text, text
) to authenticated;
