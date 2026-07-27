begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email)
values
  ('50000000-0000-4000-8000-000000000001', 'phase3-owner@example.test'),
  ('50000000-0000-4000-8000-000000000002', 'phase3-admin@example.test'),
  ('50000000-0000-4000-8000-000000000003', 'phase3-member@example.test'),
  ('50000000-0000-4000-8000-000000000004', 'phase3-outsider@example.test');

select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000001',
  true
);

insert into public.leagues (
  id,
  name,
  owner_id,
  points_system
)
values (
  '51000000-0000-4000-8000-000000000001',
  'Phase 3 Safety League',
  '50000000-0000-4000-8000-000000000001',
  '{"type":"position","positionPoints":{"1":10,"2":7},"participationPoints":1}'
);

insert into public.league_members (league_id, user_id, role)
values
  (
    '51000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000002',
    'admin'
  ),
  (
    '51000000-0000-4000-8000-000000000001',
    '50000000-0000-4000-8000-000000000003',
    'member'
  );

insert into public.seasons (id, league_id, name, is_active)
values (
  '52000000-0000-4000-8000-000000000001',
  '51000000-0000-4000-8000-000000000001',
  'Phase 3 Season',
  true
);

insert into public.contacts (id, owner_id, display_name)
values (
  '53000000-0000-4000-8000-000000000001',
  '50000000-0000-4000-8000-000000000001',
  'Independent Contact'
);

insert into public.league_contacts (league_id, contact_id)
values (
  '51000000-0000-4000-8000-000000000001',
  '53000000-0000-4000-8000-000000000001'
);

insert into public.players (id, league_id, display_name)
values
  (
    '54000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000001',
    'Result Player'
  ),
  (
    '54000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000001',
    'Second Player'
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
  rake_minor,
  created_by
)
values
  (
    '55000000-0000-4000-8000-000000000001',
    '51000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000001',
    'Phase 3 Tournament',
    'tournament',
    'in_progress',
    now(),
    'in_progress',
    'USD',
    'UTC',
    100,
    10000,
    0,
    0,
    '50000000-0000-4000-8000-000000000001'
  ),
  (
    '55000000-0000-4000-8000-000000000002',
    '51000000-0000-4000-8000-000000000001',
    '52000000-0000-4000-8000-000000000001',
    'Admin Finalization Fixture',
    'tournament',
    'in_progress',
    now(),
    'in_progress',
    'USD',
    'UTC',
    1,
    100,
    0,
    0,
    '50000000-0000-4000-8000-000000000001'
  );

insert into public.game_participants (
  id,
  game_id,
  player_id,
  display_name,
  rsvp_status,
  checked_in_at
)
values
  (
    '56000000-0000-4000-8000-000000000001',
    '55000000-0000-4000-8000-000000000001',
    '54000000-0000-4000-8000-000000000001',
    'Result Player',
    'yes',
    now()
  ),
  (
    '56000000-0000-4000-8000-000000000002',
    '55000000-0000-4000-8000-000000000001',
    '54000000-0000-4000-8000-000000000002',
    'Second Player',
    'yes',
    now()
  ),
  (
    '56000000-0000-4000-8000-000000000003',
    '55000000-0000-4000-8000-000000000002',
    '54000000-0000-4000-8000-000000000002',
    'Second Player',
    'yes',
    now()
  );

insert into public.tournament_levels (
  game_id,
  level_number,
  small_blind,
  big_blind,
  duration_seconds
)
values
  (
    '55000000-0000-4000-8000-000000000001',
    1,
    100,
    200,
    900
  ),
  (
    '55000000-0000-4000-8000-000000000001',
    2,
    200,
    400,
    600
  );

-- Stable fixtures used only by the authorization matrix. The zero-value fee
-- lets admin reversal coverage remain financially neutral to payout tests.
insert into public.game_transactions (
  id,
  game_id,
  kind,
  amount_minor,
  currency,
  note,
  idempotency_key,
  created_by
)
values (
  '59000000-0000-4000-8000-000000000001',
  '55000000-0000-4000-8000-000000000001',
  'fee',
  0,
  'USD',
  'Authorization matrix source',
  'phase3:auth-matrix:source',
  '50000000-0000-4000-8000-000000000001'
);

insert into public.settlements (
  id,
  owner_id,
  direction,
  counterparty,
  amount_minor,
  currency,
  reason,
  idempotency_key
)
values (
  '58000000-0000-4000-8000-000000000099',
  '50000000-0000-4000-8000-000000000001',
  'payable',
  'Authorization Matrix',
  100,
  'USD',
  'Authorization matrix fixture',
  'phase3:auth-matrix:settlement'
);

-- Every Phase 3 RPC rejects anonymous callers.
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select throws_ok(
  $$
    select public.delete_league(
      '51000000-0000-4000-8000-000000000001',
      'Phase 3 Safety League',
      'phase3:anon:delete'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute league deletion'
);

select throws_ok(
  $$
    select public.record_game_result(
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      1, 10000, 0, 0, 0, 0, 0, 10000, 'USD', null,
      'phase3:anon:result'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute result recording'
);

select throws_ok(
  $$
    select public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'start',
      0,
      'phase3:anon:clock'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute clock commands'
);

select throws_ok(
  $$
    select public.reverse_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      '59000000-0000-4000-8000-000000000001',
      'Anonymous reversal',
      'phase3:anon:reversal'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute transaction reversal'
);

select throws_ok(
  $$
    select * from public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{"type":"percentage","places":[{"place":1,"basis_points":10000}]}'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute payout allocation'
);

select throws_ok(
  $$
    select public.create_settlement(
      '50000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Anonymous Counterparty',
      100,
      'USD',
      'Anonymous settlement',
      null,
      null,
      null,
      null,
      'phase3:anon:settlement:create'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute settlement creation'
);

select throws_ok(
  $$
    select public.transition_settlement(
      '58000000-0000-4000-8000-000000000099',
      'paid',
      1,
      'phase3:anon:settlement:transition'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute settlement transition'
);

select throws_ok(
  $$
    select public.attach_settlement_confirmation(
      '58000000-0000-4000-8000-000000000099',
      '50000000-0000-4000-8000-000000000001/settlements/58000000-0000-4000-8000-000000000099/57000000-0000-4000-8000-000000000099.pdf',
      1,
      'phase3:anon:settlement:attach'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute settlement attachment'
);

-- A guest invitation token does not turn an anonymous request into an
-- authenticated application user for any Phase 3 RPC.
select set_config('request.jwt.claim.guest_token', 'guest-token-value', true);

select throws_ok(
  $$
    select public.delete_league(
      '51000000-0000-4000-8000-000000000001',
      'Phase 3 Safety League',
      'phase3:guest:delete'
    )
  $$,
  '42501',
  null,
  'guest token cannot execute league deletion'
);

select throws_ok(
  $$
    select public.record_game_result(
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      1, 10000, 0, 0, 0, 0, 0, 10000, 'USD', null,
      'phase3:guest:result'
    )
  $$,
  '42501',
  null,
  'guest token cannot execute result recording'
);

select throws_ok(
  $$
    select public.reverse_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      '59000000-0000-4000-8000-000000000001',
      'Guest reversal',
      'phase3:guest:reversal'
    )
  $$,
  '42501',
  null,
  'guest token cannot execute transaction reversal'
);

select throws_ok(
  $$
    select public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{"type":"percentage","places":[{"place":1,"basis_points":10000}]}'
    )
  $$,
  '42501',
  null,
  'a guest token does not grant payout RPC execution'
);

select throws_ok(
  $$
    select public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'start',
      0,
      'phase3:guest:clock'
    )
  $$,
  '42501',
  null,
  'guest token cannot execute clock commands'
);

select throws_ok(
  $$
    select public.create_settlement(
      '50000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Guest Counterparty',
      100,
      'USD',
      'Guest settlement',
      null,
      null,
      null,
      null,
      'phase3:guest:settlement:create'
    )
  $$,
  '42501',
  null,
  'guest token cannot execute settlement creation'
);

select throws_ok(
  $$
    select public.transition_settlement(
      '58000000-0000-4000-8000-000000000099',
      'paid',
      1,
      'phase3:guest:settlement:transition'
    )
  $$,
  '42501',
  null,
  'guest token cannot execute settlement transition'
);

select throws_ok(
  $$
    select public.attach_settlement_confirmation(
      '58000000-0000-4000-8000-000000000099',
      '50000000-0000-4000-8000-000000000001/settlements/58000000-0000-4000-8000-000000000099/57000000-0000-4000-8000-000000000099.pdf',
      1,
      'phase3:guest:settlement:attach'
    )
  $$,
  '42501',
  null,
  'guest token cannot execute settlement attachment'
);

reset role;

-- Members can read the game but cannot mutate operational money or clock state.
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000003',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.record_game_result(
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      1, 10000, 0, 0, 0, 0, 0, 10000, 'USD', null,
      'phase3:member:result'
    )
  $$,
  '42501',
  null,
  'member cannot record a result'
);

select throws_ok(
  $$
    select public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'start',
      0,
      'phase3:member:clock'
    )
  $$,
  '42501',
  null,
  'member cannot command the tournament clock'
);

select throws_ok(
  $$
    select public.delete_league(
      '51000000-0000-4000-8000-000000000001',
      'Phase 3 Safety League',
      'phase3:member:delete'
    )
  $$,
  '42501',
  null,
  'member cannot delete a league'
);

select throws_ok(
  $$
    select public.reverse_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      '59000000-0000-4000-8000-000000000001',
      'Member reversal',
      'phase3:member:reversal'
    )
  $$,
  '42501',
  null,
  'member cannot reverse a game transaction'
);

select throws_ok(
  $$
    select * from public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{"type":"percentage","places":[{"place":1,"basis_points":10000}]}'
    )
  $$,
  '42501',
  null,
  'member cannot allocate game payouts'
);

select throws_ok(
  $$
    select public.create_settlement(
      '50000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Member Counterparty',
      100,
      'USD',
      'Member ownership bypass',
      null,
      null,
      null,
      null,
      'phase3:member:settlement:create'
    )
  $$,
  '42501',
  null,
  'member cannot create a settlement for another owner'
);

select throws_ok(
  $$
    select public.transition_settlement(
      '58000000-0000-4000-8000-000000000099',
      'paid',
      1,
      'phase3:member:settlement:transition'
    )
  $$,
  '42501',
  null,
  'member cannot transition another owner settlement'
);

select throws_ok(
  $$
    select public.attach_settlement_confirmation(
      '58000000-0000-4000-8000-000000000099',
      '50000000-0000-4000-8000-000000000003/settlements/58000000-0000-4000-8000-000000000099/57000000-0000-4000-8000-000000000099.pdf',
      1,
      'phase3:member:settlement:attach'
    )
  $$,
  '42501',
  null,
  'member cannot attach confirmation to another owner settlement'
);

reset role;

-- An unrelated authenticated account has the same denials.
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000004',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.record_game_result(
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      1, 10000, 0, 0, 0, 0, 0, 10000, 'USD', null,
      'phase3:outsider:result'
    )
  $$,
  '42501',
  null,
  'unrelated user cannot record a result'
);

select throws_ok(
  $$
    select public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'start',
      0,
      'phase3:outsider:clock'
    )
  $$,
  '42501',
  null,
  'unrelated user cannot command the clock'
);

select throws_ok(
  $$
    select public.delete_league(
      '51000000-0000-4000-8000-000000000001',
      'Phase 3 Safety League',
      'phase3:outsider:delete'
    )
  $$,
  '42501',
  null,
  'unrelated user cannot delete a league'
);

select throws_ok(
  $$
    select public.reverse_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      '59000000-0000-4000-8000-000000000001',
      'Outsider reversal',
      'phase3:outsider:reversal'
    )
  $$,
  '42501',
  null,
  'unrelated user cannot reverse a game transaction'
);

select throws_ok(
  $$
    select * from public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{"type":"percentage","places":[{"place":1,"basis_points":10000}]}'
    )
  $$,
  '42501',
  null,
  'unrelated user cannot allocate game payouts'
);

select throws_ok(
  $$
    select public.create_settlement(
      '50000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Outsider Counterparty',
      100,
      'USD',
      'Outsider ownership bypass',
      null,
      null,
      null,
      null,
      'phase3:outsider:settlement:create'
    )
  $$,
  '42501',
  null,
  'unrelated user cannot create a settlement for another owner'
);

select throws_ok(
  $$
    select public.attach_settlement_confirmation(
      '58000000-0000-4000-8000-000000000099',
      '50000000-0000-4000-8000-000000000004/settlements/58000000-0000-4000-8000-000000000099/57000000-0000-4000-8000-000000000099.pdf',
      1,
      'phase3:outsider:settlement:attach'
    )
  $$,
  '42501',
  null,
  'unrelated user cannot attach confirmation to another owner settlement'
);

reset role;

-- Admins may run game operations, but not the owner-only league deletion.
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.delete_league(
      '51000000-0000-4000-8000-000000000001',
      'Phase 3 Safety League',
      'phase3:admin:delete'
    )
  $$,
  '42501',
  null,
  'league admin cannot use owner-only deletion'
);

select lives_ok(
  $$
    select public.record_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      null,
      null,
      'fee',
      0,
      'USD',
      'Sanctioned zero-value fee',
      'phase3:admin:record-transaction'
    )
  $$,
  'league admin records a transaction through the sanctioned RPC'
);

select is(
  (
    select (public.record_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      null,
      null,
      'fee',
      0,
      'USD',
      'Sanctioned zero-value fee',
      'phase3:admin:record-transaction'
    )).id
  ),
  (
    select id
    from public.game_transactions
    where idempotency_key = 'phase3:admin:record-transaction'
  ),
  'sanctioned transaction recording replay returns the first row'
);

select lives_ok(
  $$
    select public.reverse_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      (
        select id
        from public.game_transactions
        where idempotency_key = 'phase3:admin:record-transaction'
      ),
      'Admin authorization reversal',
      'phase3:admin:reversal'
    )
  $$,
  'league admin can reverse a game transaction'
);

select is(
  (
    select (public.reverse_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      (
        select id
        from public.game_transactions
        where idempotency_key = 'phase3:admin:record-transaction'
      ),
      'Admin authorization reversal',
      'phase3:admin:reversal'
    )).id
  ),
  (
    select id
    from public.game_transactions
    where idempotency_key = 'phase3:admin:reversal'
  ),
  'admin transaction reversal replay returns the first reversal'
);

select throws_ok(
  $$
    insert into public.game_transactions (
      game_id,
      kind,
      amount_minor,
      currency,
      reversal_of_id,
      effect_multiplier,
      reversed_at,
      idempotency_key,
      created_by
    )
    values (
      '55000000-0000-4000-8000-000000000001',
      'fee',
      0,
      'USD',
      '59000000-0000-4000-8000-000000000001',
      -1,
      now(),
      'phase3:admin:fabricated-reversal',
      '50000000-0000-4000-8000-000000000002'
    )
  $$,
  '42501',
  null,
  'authenticated client cannot fabricate game reversal metadata directly'
);

select throws_ok(
  $$
    select public.create_settlement(
      '50000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Admin Counterparty',
      100,
      'USD',
      'Admin ownership bypass',
      null,
      null,
      null,
      null,
      'phase3:admin:settlement:create'
    )
  $$,
  '42501',
  null,
  'league admin cannot create a settlement for another owner'
);

select throws_ok(
  $$
    select public.transition_settlement(
      '58000000-0000-4000-8000-000000000099',
      'paid',
      1,
      'phase3:admin:settlement:transition'
    )
  $$,
  '42501',
  null,
  'league admin cannot transition another owner settlement'
);

select throws_ok(
  $$
    select public.attach_settlement_confirmation(
      '58000000-0000-4000-8000-000000000099',
      '50000000-0000-4000-8000-000000000002/settlements/58000000-0000-4000-8000-000000000099/57000000-0000-4000-8000-000000000099.pdf',
      1,
      'phase3:admin:settlement:attach'
    )
  $$,
  '42501',
  null,
  'league admin cannot attach confirmation to another owner settlement'
);

select is(
  (
    select (public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'start',
      0,
      'phase3:clock:start'
    )).revision
  ),
  1::bigint,
  'admin starts the server-authoritative clock at revision one'
);

select is(
  (
    select (public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'start',
      0,
      'phase3:clock:start'
    )).revision
  ),
  1::bigint,
  'clock command replay returns the original revision'
);

select ok(
  (
    select started_at is not null
    from public.tournament_clocks
    where game_id = '55000000-0000-4000-8000-000000000001'
  ),
  'clock start time is assigned by the server'
);

select is(
  (
    select (public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'pause',
      1,
      'phase3:clock:pause'
    )).revision
  ),
  2::bigint,
  'pause advances the clock revision'
);

select is(
  (
    select (public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'advance',
      2,
      'phase3:clock:advance'
    )).current_level
  ),
  2,
  'advance selects the next persisted blind level'
);

select is(
  (
    select (public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'reset',
      3,
      'phase3:clock:reset'
    )).revision
  ),
  4::bigint,
  'reset returns the clock to a paused revisioned state'
);

select throws_ok(
  $$
    select public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'start',
      3,
      'phase3:clock:stale'
    )
  $$,
  '40001',
  null,
  'stale clock revision is rejected'
);

select lives_ok(
  $$
    select public.record_game_result(
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      1,
      10000,
      1,
      2000,
      1,
      1000,
      500,
      12500,
      'USD',
      null,
      'phase3:result:v1'
    )
  $$,
  'admin atomically records entry, re-entry, add-on, bounty, and payout'
);

select is(
  (
    select count(*)::integer
    from public.game_transactions
    where game_id = '55000000-0000-4000-8000-000000000001'
      and idempotency_key like 'phase3:result:v1:%'
  ),
  5,
  'result recording appends each money category once'
);

select is(
  (
    select (public.record_game_result(
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      1,
      10000,
      1,
      2000,
      1,
      1000,
      500,
      12500,
      'USD',
      null,
      'phase3:result:v1'
    )).version
  ),
  1,
  'result replay returns version one'
);

select is(
  (
    select count(*)::integer
    from public.game_result_versions
    where game_id = '55000000-0000-4000-8000-000000000001'
      and player_id = '54000000-0000-4000-8000-000000000001'
  ),
  1,
  'result replay creates no duplicate version'
);

select throws_ok(
  $$
    insert into public.game_results (
      game_id,
      player_id,
      finish_position
    )
    values (
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000002',
      2
    )
  $$,
  '42501',
  null,
  'authenticated client cannot insert a result projection directly'
);

select throws_ok(
  $$
    update public.game_results
    set payout_minor = 999999
    where game_id = '55000000-0000-4000-8000-000000000001'
      and player_id = '54000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'authenticated client cannot update a result projection directly'
);

select throws_ok(
  $$
    delete from public.game_results
    where game_id = '55000000-0000-4000-8000-000000000001'
      and player_id = '54000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'authenticated client cannot delete a result projection directly'
);

select lives_ok(
  $$
    select public.record_game_result(
      '55000000-0000-4000-8000-000000000002',
      '54000000-0000-4000-8000-000000000002',
      1,
      100,
      0,
      0,
      0,
      0,
      0,
      100,
      'USD',
      null,
      'phase3:admin:finalize-result'
    )
  $$,
  'admin prepares a balanced result for finalization'
);

select throws_ok(
  $$
    update public.games
    set
      phase = 'finalized',
      status = 'completed',
      finalized_at = now(),
      finalization_idempotency_key = 'phase3:admin:direct-finalize'
    where id = '55000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'authenticated manager cannot bypass finalize_game with a direct phase update'
);

select throws_ok(
  $$
    update public.games
    set status = 'completed'
    where id = '55000000-0000-4000-8000-000000000002'
  $$,
  '42501',
  null,
  'authenticated manager cannot expose preliminary results as completed'
);

select is(
  (
    select (public.finalize_game(
      '55000000-0000-4000-8000-000000000002',
      'phase3:admin:finalize'
    )).phase
  ),
  'finalized'::public.game_phase,
  'admin finalizes through the definer-backed public wrapper'
);

select is(
  (
    select (public.finalize_game(
      '55000000-0000-4000-8000-000000000002',
      'phase3:admin:finalize'
    )).finalization_idempotency_key
  ),
  'phase3:admin:finalize',
  'admin finalization replay returns the finalized game'
);

-- Payout pool is 13,000 entries less the 500 bounty. Integer percentage
-- rounding leaves one unit, which is assigned to first place.
select is(
  (
    select amount_minor
    from public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{
        "type":"percentage",
        "places":[
          {"place":1,"basis_points":3333},
          {"place":2,"basis_points":6667}
        ]
      }'
    )
    where finish_position = 1
  ),
  4167::bigint,
  'percentage rounding remainder is assigned to first place'
);

select is(
  (
    select sum(amount_minor)::bigint
    from public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{
        "type":"fixed",
        "places":[
          {"place":1,"amount_minor":"7000"},
          {"place":2,"amount_minor":"5500"}
        ]
      }'
    )
  ),
  12500::bigint,
  'fixed payouts must exactly consume the available pool'
);

select throws_ok(
  $$
    select * from public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{
        "type":"percentage",
        "places":[
          {"place":1,"basis_points":5000},
          {"place":2,"basis_points":4999}
        ]
      }'
    )
  $$,
  '22023',
  null,
  'percentage basis points must total exactly ten thousand'
);

reset role;

-- Owner finalizes, then records an append-only correction version.
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select is(
  (
    select (public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'reset',
      4,
      'phase3:owner:clock'
    )).revision
  ),
  5::bigint,
  'league owner can command the tournament clock'
);

select is(
  (
    select (public.command_tournament_clock(
      '55000000-0000-4000-8000-000000000001',
      'reset',
      4,
      'phase3:owner:clock'
    )).revision
  ),
  5::bigint,
  'owner clock command replay returns the first result'
);

select is(
  (
    select sum(amount_minor)::bigint
    from public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{
        "type":"percentage",
        "places":[
          {"place":1,"basis_points":3333},
          {"place":2,"basis_points":6667}
        ]
      }'
    )
  ),
  12500::bigint,
  'league owner can allocate game payouts'
);

select is(
  (
    select sum(amount_minor)::bigint
    from public.allocate_game_payouts(
      '55000000-0000-4000-8000-000000000001',
      '{
        "type":"percentage",
        "places":[
          {"place":1,"basis_points":3333},
          {"place":2,"basis_points":6667}
        ]
      }'
    )
  ),
  12500::bigint,
  'pure payout allocation replay is deterministic'
);

select lives_ok(
  $$
    select public.finalize_game(
      '55000000-0000-4000-8000-000000000001',
      'phase3:finalize'
    )
  $$,
  'balanced recorded result finalizes'
);

select lives_ok(
  $$
    select public.record_game_result(
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      1,
      10000,
      0,
      0,
      0,
      0,
      0,
      10000,
      'USD',
      (
        select id
        from public.game_result_versions
        where game_id = '55000000-0000-4000-8000-000000000001'
          and player_id = '54000000-0000-4000-8000-000000000001'
          and version = 1
      ),
      'phase3:result:v2'
    )
  $$,
  'owner corrects a finalized result with a new immutable version'
);

select is(
  (
    select count(*)::integer
    from public.game_result_versions
    where game_id = '55000000-0000-4000-8000-000000000001'
      and player_id = '54000000-0000-4000-8000-000000000001'
  ),
  2,
  'finalized correction preserves both result versions'
);

select is(
  (
    select count(*)::integer
    from public.game_transactions
    where game_id = '55000000-0000-4000-8000-000000000001'
      and idempotency_key like 'phase3:result:v2:reverse:%'
      and reversal_of_id is not null
      and effect_multiplier = -1
      and reversed_at is not null
  ),
  5,
  'finalized correction appends linked timestamped reversals'
);

select is(
  (
    select payout_minor
    from public.game_results
    where game_id = '55000000-0000-4000-8000-000000000001'
      and player_id = '54000000-0000-4000-8000-000000000001'
  ),
  10000::bigint,
  'finalized correction refreshes the existing result projection'
);

select is(
  (
    select variance_minor
    from public.game_reconciliations
    where game_id = '55000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'finalized correction refreshes the closeout reconciliation projection'
);

select is(
  (
    select (public.record_game_result(
      '55000000-0000-4000-8000-000000000001',
      '54000000-0000-4000-8000-000000000001',
      1,
      10000,
      0,
      0,
      0,
      0,
      0,
      10000,
      'USD',
      (
        select id
        from public.game_result_versions
        where game_id = '55000000-0000-4000-8000-000000000001'
          and player_id = '54000000-0000-4000-8000-000000000001'
          and version = 1
      ),
      'phase3:result:v2'
    )).version
  ),
  2,
  'finalized result correction replay returns the same version'
);

select is(
  (
    select count(*)::integer
    from public.game_transactions
    where game_id = '55000000-0000-4000-8000-000000000001'
      and (
        idempotency_key like 'phase3:result:v1:%'
        or idempotency_key like 'phase3:result:v2:%'
      )
  ),
  12,
  'result correction replay appends no duplicate money rows'
);

select lives_ok(
  $$
    select public.reverse_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      (
        select id
        from public.game_transactions
        where idempotency_key = 'phase3:result:v2:payout'
      ),
      'Correct duplicate payout',
      'phase3:standalone:reversal'
    )
  $$,
  'owner can append a standalone game-transaction reversal'
);

select is(
  (
    select (public.reverse_game_transaction(
      '55000000-0000-4000-8000-000000000001',
      (
        select id
        from public.game_transactions
        where idempotency_key = 'phase3:result:v2:payout'
      ),
      'Correct duplicate payout',
      'phase3:standalone:reversal'
    )).id
  ),
  (
    select id
    from public.game_transactions
    where idempotency_key = 'phase3:standalone:reversal'
  ),
  'standalone reversal replay returns the first reversal'
);

select is(
  (
    select variance_minor
    from public.game_reconciliations
    where game_id = '55000000-0000-4000-8000-000000000001'
  ),
  10000::bigint,
  'standalone finalized reversal refreshes reconciliation variance'
);

-- Settlement creation and every mutation are RPC-only and revision locked.
select lives_ok(
  $$
    select public.create_settlement(
      '50000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Settlement Counterparty',
      25000,
      'USD',
      'Phase 3 settlement',
      'External provider',
      '@counterparty',
      'Memo',
      current_date + 7,
      'phase3:settlement:create'
    )
  $$,
  'owner creates a settlement through the RPC'
);

select is(
  (
    select (public.create_settlement(
      '50000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Settlement Counterparty',
      25000,
      'USD',
      'Phase 3 settlement',
      'External provider',
      '@counterparty',
      'Memo',
      current_date + 7,
      'phase3:settlement:create'
    )).id
  ),
  (
    select id
    from public.settlements
    where owner_id = '50000000-0000-4000-8000-000000000001'
      and idempotency_key = 'phase3:settlement:create'
  ),
  'settlement creation replay returns the first settlement'
);

select throws_ok(
  $$
    select public.create_settlement(
      '50000000-0000-4000-8000-000000000001',
      null,
      'payable',
      'Settlement Counterparty',
      25000,
      'USD',
      'Different reason',
      'External provider',
      '@counterparty',
      'Memo',
      current_date + 7,
      'phase3:settlement:create'
    )
  $$,
  '22023',
  null,
  'settlement creation replay validates every material field'
);

select throws_ok(
  $$
    insert into public.settlements (
      owner_id, direction, counterparty, amount_minor, currency, reason,
      status, revision, confirmation_path, idempotency_key
    )
    values (
      '50000000-0000-4000-8000-000000000001',
      'payable',
      'Bypass',
      1,
      'USD',
      'Bypass',
      'paid',
      99,
      'fabricated/path.pdf',
      'phase3:settlement:bypass'
    )
  $$,
  '42501',
  null,
  'authenticated client cannot bypass settlement creation RPC'
);

reset role;
update public.settlements
set id = '58000000-0000-4000-8000-000000000001'
where idempotency_key = 'phase3:settlement:create';

select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000004',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.transition_settlement(
      '58000000-0000-4000-8000-000000000001',
      'paid',
      1,
      'phase3:settlement:outsider'
    )
  $$,
  '42501',
  null,
  'unrelated user cannot transition an owner settlement by guessed ID'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select is(
  (
    select (public.transition_settlement(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      'paid',
      1,
      'phase3:settlement:paid'
    )).revision
  ),
  2::bigint,
  'pending settlement transitions to paid at revision two'
);

select ok(
  (
    select paid_at is not null
    from public.settlements
    where idempotency_key = 'phase3:settlement:create'
  ),
  'paid transition uses a server timestamp'
);

select is(
  (
    select (public.transition_settlement(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      'paid',
      1,
      'phase3:settlement:paid'
    )).revision
  ),
  2::bigint,
  'settlement status replay returns the original revision'
);

select throws_ok(
  $$
    select public.transition_settlement(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      'disputed',
      1,
      'phase3:settlement:stale'
    )
  $$,
  '40001',
  null,
  'stale settlement revision loses the optimistic concurrency race'
);

select throws_ok(
  $$
    select public.transition_settlement(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      'void',
      2,
      'phase3:settlement:invalid-transition'
    )
  $$,
  '55000',
  null,
  'paid settlement cannot transition directly to void'
);

select is(
  (
    select (public.transition_settlement(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      'disputed',
      2,
      'phase3:settlement:disputed'
    )).revision
  ),
  3::bigint,
  'paid settlement can transition to disputed for a payment issue'
);

select ok(
  (
    select paid_at is null
    from public.settlements
    where idempotency_key = 'phase3:settlement:create'
  ),
  'leaving paid clears paid_at'
);

select throws_ok(
  $$
    update public.settlements
    set status = 'paid'
    where idempotency_key = 'phase3:settlement:create'
  $$,
  '42501',
  null,
  'authenticated client cannot directly update settlement status'
);

select throws_ok(
  $$
    delete from public.settlements
    where idempotency_key = 'phase3:settlement:create'
  $$,
  '42501',
  null,
  'authenticated client cannot directly delete a settlement'
);

select throws_ok(
  $$
    select public.attach_settlement_confirmation(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      '50000000-0000-4000-8000-000000000001/settlements/not-the-id/file.pdf',
      3,
      'phase3:settlement:bad-path'
    )
  $$,
  '22023',
  null,
  'confirmation path must exactly match owner and settlement'
);

select throws_ok(
  $$
    select public.attach_settlement_confirmation(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      '50000000-0000-4000-8000-000000000001/settlements/'
        || (
          select id::text
          from public.settlements
          where idempotency_key = 'phase3:settlement:create'
        )
        || '/57000000-0000-4000-8000-000000000001.pdf',
      3,
      'phase3:settlement:missing-object'
    )
  $$,
  '22023',
  null,
  'fabricated confirmation path is rejected when no object exists'
);

reset role;

insert into storage.objects (bucket_id, name, owner_id, metadata)
select
  'career-documents',
  '50000000-0000-4000-8000-000000000001/settlements/'
    || s.id::text
    || '/57000000-0000-4000-8000-000000000001.pdf',
  '50000000-0000-4000-8000-000000000001',
  '{"mimetype":"application/pdf"}'::jsonb
from public.settlements as s
where s.idempotency_key = 'phase3:settlement:create';

insert into storage.objects (bucket_id, name, owner_id, metadata)
select
  'career-documents',
  '50000000-0000-4000-8000-000000000001/settlements/'
    || s.id::text
    || '/57000000-0000-4000-8000-000000000002.pdf',
  '50000000-0000-4000-8000-000000000001',
  '{"mimetype":"text/plain"}'::jsonb
from public.settlements as s
where s.idempotency_key = 'phase3:settlement:create';

select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.attach_settlement_confirmation(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      '50000000-0000-4000-8000-000000000001/settlements/'
        || (
          select id::text
          from public.settlements
          where idempotency_key = 'phase3:settlement:create'
        )
        || '/57000000-0000-4000-8000-000000000002.pdf',
      3,
      'phase3:settlement:bad-mime'
    )
  $$,
  '22023',
  null,
  'stored MIME type must be an allowed confirmation format'
);

select is(
  (
    select (public.attach_settlement_confirmation(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      '50000000-0000-4000-8000-000000000001/settlements/'
        || (
          select id::text
          from public.settlements
          where idempotency_key = 'phase3:settlement:create'
        )
        || '/57000000-0000-4000-8000-000000000001.pdf',
      3,
      'phase3:settlement:attach'
    )).revision
  ),
  4::bigint,
  'existing allowed storage object attaches at the next revision'
);

reset role;
delete from storage.objects
where name like
  '50000000-0000-4000-8000-000000000001/settlements/%/57000000-0000-4000-8000-000000000001.pdf';

select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select is(
  (
    select (public.attach_settlement_confirmation(
      (
        select id
        from public.settlements
        where idempotency_key = 'phase3:settlement:create'
      ),
      '50000000-0000-4000-8000-000000000001/settlements/'
        || (
          select id::text
          from public.settlements
          where idempotency_key = 'phase3:settlement:create'
        )
        || '/57000000-0000-4000-8000-000000000001.pdf',
      3,
      'phase3:settlement:attach'
    )).revision
  ),
  4::bigint,
  'attachment replay returns its receipt even after object removal'
);

reset role;
select is(
  (
    select count(*)::integer
    from private.settlement_mutation_events
    where settlement_id = (
      select id
      from public.settlements
      where idempotency_key = 'phase3:settlement:create'
    )
  ),
  3,
  'settlement changes append one event per successful mutation'
);

select set_config(
  'request.jwt.claim.sub',
  '50000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $$
    delete from public.players
    where id = '54000000-0000-4000-8000-000000000001'
  $$,
  '23503',
  null,
  'direct player deletion cannot cascade away immutable result history'
);

select throws_ok(
  $$
    select public.delete_league(
      '51000000-0000-4000-8000-000000000001',
      'phase 3 safety league',
      'phase3:delete:wrong-name'
    )
  $$,
  '22023',
  null,
  'league deletion requires an exact case-sensitive name'
);

select is(
  (
    select public.delete_league(
      '51000000-0000-4000-8000-000000000001',
      'Phase 3 Safety League',
      'phase3:delete:success'
    ) ->> 'league_id'
  ),
  '51000000-0000-4000-8000-000000000001',
  'owner deletes the league through the confirmed RPC'
);

select is(
  (
    select public.delete_league(
      '51000000-0000-4000-8000-000000000001',
      'Phase 3 Safety League',
      'phase3:delete:success'
    ) ->> 'league_id'
  ),
  '51000000-0000-4000-8000-000000000001',
  'league deletion replay returns the durable receipt'
);

select is(
  (
    select count(*)::integer
    from public.game_result_versions
    where game_id in (
      '55000000-0000-4000-8000-000000000001',
      '55000000-0000-4000-8000-000000000002'
    )
  ),
  0,
  'confirmed league deletion removes result history through the game cascade'
);

select is(
  (
    select count(*)::integer
    from public.contacts
    where id = '53000000-0000-4000-8000-000000000001'
  ),
  1,
  'league deletion preserves independent contacts'
);

select * from finish();
rollback;
