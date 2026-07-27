begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (id, email)
values
  ('60000000-0000-4000-8000-000000000001', 'staking-owner@example.test'),
  ('60000000-0000-4000-8000-000000000002', 'staking-outsider@example.test');

insert into public.career_sessions (
  id,
  owner_id,
  session_kind,
  medium,
  played_at,
  game_variant,
  buy_in_minor,
  fees_minor,
  payout_minor,
  currency,
  timezone
)
values
  (
    '61000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    'tournament',
    'live',
    now() - interval '3 days',
    'No Limit Holdem',
    10000,
    0,
    25000,
    'USD',
    'UTC'
  ),
  (
    '61000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000001',
    'tournament',
    'live',
    now() - interval '2 days',
    'No Limit Holdem',
    10000,
    0,
    7000,
    'USD',
    'UTC'
  ),
  (
    '61000000-0000-4000-8000-000000000003',
    '60000000-0000-4000-8000-000000000001',
    'cash',
    'live',
    now() - interval '1 day',
    'Pot Limit Omaha',
    10000,
    0,
    10000,
    'EUR',
    'UTC'
  ),
  (
    '61000000-0000-4000-8000-000000000004',
    '60000000-0000-4000-8000-000000000001',
    'cash',
    'live',
    now(),
    'No Limit Holdem',
    5000,
    0,
    5000,
    'USD',
    'UTC'
  );

insert into public.poker_trips (
  id,
  owner_id,
  name,
  destination,
  starts_on,
  currency
)
values
  (
    '62000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    'USD Trip',
    'Las Vegas',
    current_date,
    'USD'
  ),
  (
    '62000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000001',
    'EUR Trip',
    'Paris',
    current_date,
    'EUR'
  );

insert into public.staking_deals (
  id,
  owner_id,
  backer_name,
  name,
  player_share_bps,
  backer_share_bps,
  markup_bps,
  makeup_minor,
  currency,
  starts_on,
  status
)
values
  (
    '63000000-0000-4000-8000-000000000001',
    '60000000-0000-4000-8000-000000000001',
    'Backer One',
    'Active USD Deal',
    5000,
    5000,
    10000,
    10000,
    'USD',
    current_date - 30,
    'active'
  ),
  (
    '63000000-0000-4000-8000-000000000002',
    '60000000-0000-4000-8000-000000000001',
    'Backer One',
    'Paused USD Deal',
    5000,
    5000,
    10000,
    0,
    'USD',
    current_date - 30,
    'completed'
  ),
  (
    '63000000-0000-4000-8000-000000000003',
    '60000000-0000-4000-8000-000000000002',
    'Other Backer',
    'Outsider Deal',
    5000,
    5000,
    10000,
    0,
    'USD',
    current_date - 30,
    'active'
  );

-- The public command surface is authenticated-only.
select set_config('request.jwt.claim.sub', '', true);
set local role anon;

select throws_ok(
  $$
    select public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001',
      10000,
      15000,
      10000,
      null,
      'staking:anon'
    )
  $$,
  '42501',
  null,
  'anonymous caller cannot execute the staking allocation command'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '60000000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001',
      10000,
      15000,
      10000,
      null,
      'staking:outsider'
    )
  $$,
  '42501',
  null,
  'authenticated user cannot record an allocation for another owner'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '60000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select throws_ok(
  $$
    select public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000002',
      '61000000-0000-4000-8000-000000000004',
      5000,
      0,
      0,
      null,
      'staking:inactive'
    )
  $$,
  '55000',
  null,
  'staking allocations require an active deal'
);

select throws_ok(
  $$
    select public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000003',
      10000,
      0,
      10000,
      null,
      'staking:currency-mismatch'
    )
  $$,
  '22023',
  null,
  'staking deal and career session currencies must match'
);

select is(
  (
    public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001',
      10000,
      15000,
      10000,
      'First allocation',
      'staking:first'
    ) #>> '{allocation,backer_result_minor}'
  )::bigint,
  12500::bigint,
  'positive result first recovers makeup and then applies the backer share'
);

select is(
  (
    select player_result_minor
    from public.staking_allocations
    where deal_id = '63000000-0000-4000-8000-000000000001'
      and session_id = '61000000-0000-4000-8000-000000000001'
  ),
  2500::bigint,
  'player receives the exact integer remainder after makeup and backer share'
);

select is(
  (
    select makeup_minor
    from public.staking_deals
    where id = '63000000-0000-4000-8000-000000000001'
  ),
  0::bigint,
  'successful allocation advances deal makeup in the same transaction'
);

select is(
  (
    public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001',
      10000,
      15000,
      10000,
      'First allocation',
      'staking:first'
    ) #>> '{allocation,id}'
  ),
  (
    select id::text
    from public.staking_allocations
    where deal_id = '63000000-0000-4000-8000-000000000001'
      and session_id = '61000000-0000-4000-8000-000000000001'
  ),
  'same-key staking replay returns the original allocation'
);

select is(
  (
    select count(*)::integer
    from public.staking_allocations
    where deal_id = '63000000-0000-4000-8000-000000000001'
  ),
  1,
  'same-key replay creates no duplicate allocation'
);

select throws_ok(
  $$
    select public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001',
      10000,
      15001,
      10000,
      'First allocation',
      'staking:first'
    )
  $$,
  '22023',
  null,
  'staking replay rejects a changed material input'
);

select throws_ok(
  $$
    select public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000002',
      10000,
      -3000,
      10000,
      null,
      'staking:stale'
    )
  $$,
  '40001',
  null,
  'serialized deal lock rejects a stale expected-makeup preview'
);

select is(
  (
    public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000002',
      10000,
      -3000,
      0,
      null,
      'staking:loss'
    ) #>> '{allocation,backer_result_minor}'
  )::bigint,
  (-3000)::bigint,
  'a loss is assigned to the backer'
);

select is(
  (
    select makeup_minor
    from public.staking_deals
    where id = '63000000-0000-4000-8000-000000000001'
  ),
  3000::bigint,
  'a loss increases makeup atomically'
);

select is(
  (
    public.record_staking_allocation(
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001',
      10000,
      15000,
      10000,
      'First allocation',
      'staking:first'
    ) #>> '{makeup_after_minor}'
  ),
  '0',
  'an old replay remains stable after later deal mutations'
);

select throws_ok(
  $$
    insert into public.staking_allocations (
      owner_id,
      deal_id,
      session_id,
      allocated_buy_in_minor,
      backer_result_minor,
      player_result_minor
    )
    values (
      '60000000-0000-4000-8000-000000000001',
      '63000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000004',
      5000,
      0,
      0
    )
  $$,
  '42501',
  null,
  'authenticated owner cannot bypass the staking RPC with a direct insert'
);

select throws_ok(
  $$
    update public.staking_allocations
    set backer_result_minor = 0
    where deal_id = '63000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'authenticated owner cannot rewrite a staking allocation'
);

select throws_ok(
  $$
    delete from public.staking_allocations
    where deal_id = '63000000-0000-4000-8000-000000000001'
  $$,
  '42501',
  null,
  'authenticated owner cannot delete staking allocation history'
);

-- Expense currency equality is enforced from both the child and parent side.
select lives_ok(
  $$
    insert into public.career_expenses (
      id,
      owner_id,
      trip_id,
      session_id,
      category,
      amount_minor,
      currency,
      incurred_on
    )
    values (
      '64000000-0000-4000-8000-000000000001',
      '60000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000001',
      'travel',
      1000,
      'USD',
      current_date
    )
  $$,
  'matching trip, session, and expense currencies are accepted'
);

select throws_ok(
  $$
    insert into public.career_expenses (
      owner_id,
      trip_id,
      category,
      amount_minor,
      currency,
      incurred_on
    )
    values (
      '60000000-0000-4000-8000-000000000001',
      '62000000-0000-4000-8000-000000000001',
      'travel',
      1000,
      'EUR',
      current_date
    )
  $$,
  '23514',
  null,
  'expense currency must match a linked trip'
);

select throws_ok(
  $$
    insert into public.career_expenses (
      owner_id,
      session_id,
      category,
      amount_minor,
      currency,
      incurred_on
    )
    values (
      '60000000-0000-4000-8000-000000000001',
      '61000000-0000-4000-8000-000000000003',
      'travel',
      1000,
      'USD',
      current_date
    )
  $$,
  '23514',
  null,
  'expense currency must match a linked career session'
);

select throws_ok(
  $$
    update public.career_expenses
    set currency = 'EUR'
    where id = '64000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'linked expense currency cannot be changed away from its parents'
);

select throws_ok(
  $$
    update public.poker_trips
    set currency = 'EUR'
    where id = '62000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'trip currency cannot invalidate linked expenses'
);

select throws_ok(
  $$
    update public.career_sessions
    set currency = 'EUR'
    where id = '61000000-0000-4000-8000-000000000001'
  $$,
  '23514',
  null,
  'career session currency cannot invalidate linked expenses'
);

reset role;
select * from finish();
rollback;
