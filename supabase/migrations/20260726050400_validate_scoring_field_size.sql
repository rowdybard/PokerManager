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
  if coalesce(_field_size, 0) < 1 then
    raise exception 'Field size must be positive'
      using errcode = '22023';
  end if;

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
