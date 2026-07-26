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
    pg_catalog.hashtextextended(
      p_owner_id::text || ':ledger-reversal:' || p_entry_id::text,
      0
    )
  );

  select e.* into _reversal
  from public.bankroll_ledger_entries as e
  where e.owner_id = p_owner_id
    and e.idempotency_key = p_idempotency_key;
  if found then
    if _reversal.reversal_of_id is distinct from p_entry_id then
      raise exception 'Idempotency key was already used for another mutation'
        using errcode = '22023';
    end if;
    return _reversal;
  end if;

  select e.* into _original
  from public.bankroll_ledger_entries as e
  where e.id = p_entry_id and e.owner_id = p_owner_id;
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

grant execute on function private.calculate_points(
  jsonb, integer, integer, bigint
) to authenticated;
