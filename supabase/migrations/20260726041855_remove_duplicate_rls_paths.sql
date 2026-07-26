-- Avoid duplicate permissive SELECT policies while preserving manager writes.

begin;

do $$
declare
  _table_name text;
  _policy_prefix text;
begin
  foreach _table_name in array array[
    'game_eliminations',
    'game_participants',
    'game_reconciliations',
    'game_seats',
    'game_tables',
    'tournament_clocks',
    'tournament_levels'
  ]
  loop
    _policy_prefix := _table_name || '_modify';
    execute format(
      'drop policy if exists %I on public.%I',
      _policy_prefix,
      _table_name
    );
    execute format(
      'create policy %I on public.%I for insert to authenticated with check (private.can_manage_game(game_id))',
      _table_name || '_insert',
      _table_name
    );
    execute format(
      'create policy %I on public.%I for update to authenticated using (private.can_manage_game(game_id)) with check (private.can_manage_game(game_id))',
      _table_name || '_update',
      _table_name
    );
    execute format(
      'create policy %I on public.%I for delete to authenticated using (private.can_manage_game(game_id))',
      _table_name || '_delete',
      _table_name
    );
  end loop;
end
$$;

drop policy if exists scoring_rules_modify
  on public.league_scoring_rules;
create policy scoring_rules_insert
on public.league_scoring_rules
for insert to authenticated
with check (private.can_manage_league(league_id));
create policy scoring_rules_update
on public.league_scoring_rules
for update to authenticated
using (private.can_manage_league(league_id))
with check (private.can_manage_league(league_id));
create policy scoring_rules_delete
on public.league_scoring_rules
for delete to authenticated
using (private.can_manage_league(league_id));

drop policy if exists game_templates_modify
  on public.game_templates;
create policy game_templates_insert
on public.game_templates
for insert to authenticated
with check (
  private.can_manage_league(league_id)
  and owner_id = (
    select l.owner_id
    from public.leagues as l
    where l.id = game_templates.league_id
  )
);
create policy game_templates_update
on public.game_templates
for update to authenticated
using (private.can_manage_league(league_id))
with check (
  private.can_manage_league(league_id)
  and owner_id = (
    select l.owner_id
    from public.leagues as l
    where l.id = game_templates.league_id
  )
);
create policy game_templates_delete
on public.game_templates
for delete to authenticated
using (private.can_manage_league(league_id));

drop index if exists public.game_results_game_finish_idx;
drop index if exists public.seasons_one_active_per_league_idx;

commit;
