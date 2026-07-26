begin;

create extension if not exists pgtap with schema extensions;
set search_path = public, extensions;
select no_plan();

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  recovery_token,
  email_change_token_new,
  email_change
)
values
  (
    '10000000-0000-4000-8000-000000000001',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner@example.test',
    crypt('not-a-real-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '10000000-0000-4000-8000-000000000002',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'admin@example.test',
    crypt('not-a-real-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '10000000-0000-4000-8000-000000000003',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'member@example.test',
    crypt('not-a-real-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  ),
  (
    '10000000-0000-4000-8000-000000000004',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'outsider@example.test',
    crypt('not-a-real-password', gen_salt('bf')),
    now(),
    '{"provider":"email","providers":["email"]}',
    '{}',
    now(),
    now(),
    '',
    '',
    '',
    ''
  );

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;

select lives_ok(
  $$
    select public.create_league(
      'Test League',
      'RLS fixture',
      '{"type":"position","positionPoints":{"1":10}}'::jsonb,
      'league:test:one'
    )
  $$,
  'owner can create a league atomically'
);

select is(
  (
    select (public.create_league(
      'Different ignored name',
      null,
      '{}'::jsonb,
      'league:test:one'
    )).id
  ),
  (select id from public.leagues where name = 'Test League'),
  'create league idempotency returns the original league'
);

reset role;

insert into public.league_members (league_id, user_id, role)
select id, '10000000-0000-4000-8000-000000000002', 'admin'
from public.leagues where name = 'Test League';
insert into public.league_members (league_id, user_id, role)
select id, '10000000-0000-4000-8000-000000000003', 'member'
from public.leagues where name = 'Test League';

insert into public.players (league_id, user_id, display_name)
select id, '10000000-0000-4000-8000-000000000003', 'Member Player'
from public.leagues where name = 'Test League';

insert into public.games (
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
select
  l.id,
  s.id,
  'RLS Game',
  'cash',
  'registration',
  now() + interval '1 day',
  'scheduled',
  'USD',
  'UTC',
  100,
  10000,
  0,
  l.owner_id
from public.leagues as l
join public.seasons as s on s.league_id = l.id and s.is_active
where l.name = 'Test League';

insert into public.game_invites (game_id, player_id, rsvp_status)
select g.id, p.id, 'pending'
from public.games as g
join public.players as p on p.league_id = g.league_id
where g.title = 'RLS Game';

insert into public.career_sessions (
  id,
  owner_id,
  session_kind,
  medium,
  played_at,
  game_variant,
  entries,
  buy_in_minor,
  fees_minor,
  payout_minor,
  currency,
  timezone
)
values (
  '11000000-0000-4000-8000-000000000001',
  '10000000-0000-4000-8000-000000000001',
  'cash',
  'live',
  now(),
  'No-Limit Hold''em',
  1,
  10000,
  500,
  12500,
  'USD',
  'UTC'
);

select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000004',
  true
);
set local role authenticated;
select is((select count(*)::integer from public.leagues), 0, 'unrelated user sees no league');
select is((select count(*)::integer from public.games), 0, 'unrelated user sees no game');
select is(
  (select count(*)::integer from public.career_sessions),
  0,
  'unrelated user sees no private career data'
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
      '10000000-0000-4000-8000-000000000004',
      '11000000-0000-4000-8000-000000000001',
      'other',
      100,
      'USD',
      current_date
    )
  $$,
  '23503',
  null,
  'private records cannot reference another owner session by guessed UUID'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000003',
  true
);
set local role authenticated;
select is((select count(*)::integer from public.leagues), 1, 'member sees their league');
select is((select count(*)::integer from public.games), 1, 'member sees league games');
select is((select count(*)::integer from public.game_invites), 1, 'member sees league invites');
select is(
  private.can_manage_league((select id from public.leagues limit 1)),
  false,
  'member cannot manage the league'
);
select is(
  (select count(*)::integer from public.career_sessions),
  0,
  'member cannot see the owner private career'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000002',
  true
);
set local role authenticated;
select is(
  private.can_manage_league((select id from public.leagues limit 1)),
  true,
  'admin can manage the league'
);
select is(
  (select count(*)::integer from public.career_sessions),
  0,
  'admin cannot see the owner private career'
);

reset role;
select set_config(
  'request.jwt.claim.sub',
  '10000000-0000-4000-8000-000000000001',
  true
);
set local role authenticated;
select is((select count(*)::integer from public.leagues), 1, 'owner sees their league');
select is(
  (select count(*)::integer from public.career_sessions),
  1,
  'owner sees their private career'
);
select is(
  (select profit_minor from public.career_sessions limit 1),
  2000::bigint,
  'career profit is generated server-side'
);

select throws_ok(
  $$
    insert into public.seasons (league_id, name, is_active)
    select id, 'Conflicting active season', true
    from public.leagues
    limit 1
  $$,
  '23505',
  null,
  'only one season can be active per league'
);

select ok(
  not has_function_privilege(
    current_user,
    'public.issue_guest_invite(uuid,text,uuid,timestamptz)'::regprocedure,
    'EXECUTE'
  ),
  'authenticated clients cannot call the service-only guest issuer'
);

select * from finish();
rollback;
