begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email)
values ('30000000-0000-4000-8000-000000000001', 'money-owner@example.test');

select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-4000-8000-000000000001',
  true
);

insert into public.leagues (
  id,
  name,
  owner_id,
  points_system
)
values (
  '31000000-0000-4000-8000-000000000001',
  'Money Test League',
  '30000000-0000-4000-8000-000000000001',
  '{"type":"position","positionPoints":{"1":10},"participationPoints":1}'
);
insert into public.seasons (id, league_id, name, is_active)
values (
  '32000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  'Money Test Season',
  true
);
insert into public.players (id, league_id, display_name)
values (
  '33000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  'Ledger Player'
);
insert into public.games (
  id,
  league_id,
  season_id,
  title,
  kind,
  phase,
  scheduled_date,
  status,
  currency,
  timezone,
  buy_in,
  buy_in_minor,
  entry_fee_minor,
  created_by
)
values (
  '34000000-0000-4000-8000-000000000001',
  '31000000-0000-4000-8000-000000000001',
  '32000000-0000-4000-8000-000000000001',
  'Finalization Test',
  'cash',
  'in_progress',
  now(),
  'in_progress',
  'USD',
  'UTC',
  100,
  10000,
  0,
  '30000000-0000-4000-8000-000000000001'
);
insert into public.game_participants (
  id,
  game_id,
  player_id,
  display_name,
  rsvp_status,
  checked_in_at,
  finish_position
)
values (
  '35000000-0000-4000-8000-000000000001',
  '34000000-0000-4000-8000-000000000001',
  '33000000-0000-4000-8000-000000000001',
  'Ledger Player',
  'yes',
  now(),
  1
);

insert into public.bankroll_accounts (
  id,
  owner_id,
  name,
  account_type,
  currency,
  opening_balance_minor
)
values (
  '36000000-0000-4000-8000-000000000001',
  '30000000-0000-4000-8000-000000000001',
  'Live bankroll',
  'cash',
  'USD',
  50000
);

select throws_ok(
  $$
    select private.calculate_points(
      '{"type":"position","positionPoints":{"1":10}}',
      1,
      0,
      10000
    )
  $$,
  '22023',
  null,
  'server scoring rejects an empty field'
);

select set_config(
  'request.jwt.claim.sub',
  '30000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.post_ledger_entry(
      '30000000-0000-4000-8000-000000000001',
      '36000000-0000-4000-8000-000000000001',
      null,
      'deposit',
      25000,
      'USD',
      now(),
      'Bankroll funding',
      null,
      'ledger:test:deposit'
    )
  $$,
  'owner can post an exact ledger entry'
);

select is(
  (
    select (public.post_ledger_entry(
      '30000000-0000-4000-8000-000000000001',
      '36000000-0000-4000-8000-000000000001',
      null,
      'deposit',
      25000,
      'USD',
      now(),
      'Bankroll funding',
      null,
      'ledger:test:deposit'
    )).id
  ),
  (
    select id
    from public.bankroll_ledger_entries
    where idempotency_key = 'ledger:test:deposit'
  ),
  'ledger idempotency returns the original entry'
);

select lives_ok(
  $$
    select public.reverse_ledger_entry(
      '30000000-0000-4000-8000-000000000001',
      (
        select id
        from public.bankroll_ledger_entries
        where idempotency_key = 'ledger:test:deposit'
      ),
      'Duplicate funding entry',
      'ledger:test:reversal'
    )
  $$,
  'ledger corrections are append-only reversals'
);
select is(
  (
    select amount_minor
    from public.bankroll_ledger_entries
    where idempotency_key = 'ledger:test:reversal'
  ),
  (-25000)::bigint,
  'reversal negates the original amount exactly'
);
select lives_ok(
  $$
    select public.reverse_ledger_entry(
      '30000000-0000-4000-8000-000000000001',
      (
        select id
        from public.bankroll_ledger_entries
        where idempotency_key = 'ledger:test:deposit'
      ),
      'Duplicate funding entry',
      'ledger:test:reversal'
    )
  $$,
  'duplicate reversal submission is idempotent'
);
select is(
  (
    select count(*)::integer
    from public.bankroll_ledger_entries
    where idempotency_key = 'ledger:test:reversal'
  ),
  1,
  'reversal idempotency stores one correction'
);
select throws_ok(
  $$
    update public.bankroll_ledger_entries
    set amount_minor = 1
    where idempotency_key = 'ledger:test:deposit'
  $$,
  '42501',
  null,
  'ledger rows cannot be edited'
);

select lives_ok(
  $$
    select public.create_settlement(
      '30000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Backer A',
      12500,
      'USD',
      'Series settlement',
      'External provider',
      '@backer-a',
      'PM-TEST-1',
      current_date + 7,
      'settlement:test:one'
    )
  $$,
  'owner can create a settlement obligation'
);
select is(
  (
    select count(*)::integer
    from public.settlements
    where idempotency_key = 'settlement:test:one'
  ),
  1,
  'settlement idempotency stores one obligation'
);

select lives_ok(
  $$
    select public.record_game_transaction(
      '34000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      'buy_in',
      10000,
      'USD',
      'Initial buy-in',
      'game:test:buy-in'
    )
  $$,
  'host records a buy-in transaction'
);
select lives_ok(
  $$
    select public.record_game_transaction(
      '34000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      'cash_out',
      10000,
      'USD',
      'Cash-out',
      'game:test:cash-out'
    )
  $$,
  'host records a cash-out transaction'
);

select lives_ok(
  $$
    select public.finalize_game(
      '34000000-0000-4000-8000-000000000001',
      'game:test:finalize'
    )
  $$,
  'balanced game finalizes atomically'
);
select is(
  (
    select phase::text
    from public.games
    where id = '34000000-0000-4000-8000-000000000001'
  ),
  'finalized',
  'game phase is finalized'
);
select is(
  (
    select status
    from public.game_reconciliations
    where game_id = '34000000-0000-4000-8000-000000000001'
  ),
  'balanced',
  'cash closeout is balanced'
);
select is(
  (
    select points_earned
    from public.game_results
    where game_id = '34000000-0000-4000-8000-000000000001'
  ),
  10::numeric,
  'points are calculated server-side for the whole field'
);
select lives_ok(
  $$
    select public.finalize_game(
      '34000000-0000-4000-8000-000000000001',
      'game:test:finalize'
    )
  $$,
  'duplicate finalization with the same key is idempotent'
);
select throws_ok(
  $$
    update public.games
    set title = 'Mutated final game'
    where id = '34000000-0000-4000-8000-000000000001'
  $$,
  '55000',
  null,
  'finalized games are immutable'
);
select throws_ok(
  $$
    select public.record_game_transaction(
      '34000000-0000-4000-8000-000000000001',
      '35000000-0000-4000-8000-000000000001',
      '33000000-0000-4000-8000-000000000001',
      'buy_in',
      1000,
      'USD',
      'Late buy-in',
      'game:test:late'
    )
  $$,
  '55000',
  null,
  'ordinary money movements cannot be added after finalization'
);

select * from finish();
rollback;
