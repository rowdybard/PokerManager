create unique index if not exists idx_seasons_one_active_per_league
  on public.seasons (league_id)
  where is_active;
