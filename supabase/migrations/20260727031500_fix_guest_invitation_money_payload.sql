-- ---------------------------------------------------------------------------
-- Guest invitation payload: correct money formatting
--
-- `bigint::numeric / 100` inherits Postgres' default division scale, so a
-- $100.00 entry fee rendered as `USD 100.0000000000000000 entry` and $1/$2
-- blinds rendered as `USD 1.00000000000000000000/2.0000000000000000`.
--
-- Two changes:
--   1. `stakesLabel` is rounded to the currency's minor unit so the legacy
--      string stays correct for any client that still reads it.
--   2. The payload now also carries raw minor-unit integers (as text, to avoid
--      JS number precision loss) plus the currency, so the client can format
--      with the same `formatMoney` helper used everywhere else instead of
--      relying on a server-rendered string.
--
-- Both `public.get_guest_invitation` and
-- `public.respond_to_guest_invitation` delegate here, so both paths are fixed.
--
-- Additive: only adds keys to the returned JSON and corrects an existing one.
-- ---------------------------------------------------------------------------

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
          pg_catalog.btrim(pg_catalog.to_char(
            pg_catalog.round(coalesce(g.small_blind_minor, 0)::numeric / 100, 2),
            'FM999999999990.00'
          )),
          '/',
          pg_catalog.btrim(pg_catalog.to_char(
            pg_catalog.round(coalesce(g.big_blind_minor, 0)::numeric / 100, 2),
            'FM999999999990.00'
          ))
        )
        else concat(
          g.currency, ' ',
          pg_catalog.btrim(pg_catalog.to_char(
            pg_catalog.round(coalesce(g.entry_fee_minor, 0)::numeric / 100, 2),
            'FM999999999990.00'
          )),
          ' entry'
        )
      end,
      'currency', g.currency,
      'buyInMinor', g.buy_in_minor::text,
      'entryFeeMinor', g.entry_fee_minor::text,
      'rakeMinor', g.rake_minor::text,
      'bountyMinor', g.bounty_minor::text,
      'smallBlindMinor', g.small_blind_minor::text,
      'bigBlindMinor', g.big_blind_minor::text,
      'minBuyInMinor', g.min_buy_in_minor::text,
      'maxBuyInMinor', g.max_buy_in_minor::text,
      'tableSize', g.table_size,
      'numTables', g.num_tables,
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

revoke execute on function private.guest_invitation_payload(uuid)
  from public, anon, authenticated;
